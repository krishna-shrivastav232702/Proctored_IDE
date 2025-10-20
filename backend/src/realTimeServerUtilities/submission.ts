import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "../lib/prismaClient";
import fs from "fs/promises";
import path from "path";
import { emitToTeam } from "./websocket";
import { getContainer } from "../lib/docker";
import { createWriteStream } from "fs";
import archiver from "archiver";
import { uploadToS3 } from "../lib/s3";




const execPromise = promisify(exec);


export const submitTeamBuild = async(teamId:string):Promise<{submissionId:string; deploymentUrl?:string; cdnUrl:string;}> => {
    try {
        console.log(`Starting submission for team ${teamId}`);
        const containerInfo = await prisma.containerInfo.findUnique({
            where:{
                teamId
            }
        });
        if(!containerInfo){
            throw new Error(`Container not found for team ${teamId}`);
        }
        const hasBuild = await validateBuildFolder(containerInfo.containerId);
        if(!hasBuild){
            throw new Error("build folder not found . please run npm run build first")
        }
        const buildPath = await extractBuildFolder(containerInfo.containerId,teamId);
        //create archive
        const archiveBuffer = await archiveBuild(buildPath);
        //uploading to r2
        const {s3Key, cdnUrl} = await uploadBuildToR2(teamId,archiveBuffer);
        let deploymentUrl:string | undefined;
        try{
            deploymentUrl = await deployToPages(teamId,buildPath);
        }catch(error){
            console.warn(`Failed to deploy to cloudflare pages:`,error);
        }
        const submission = await saveSubmissionRecord(teamId,s3Key,cdnUrl,deploymentUrl);
        await fs.rm(buildPath,{
            recursive:true,
            force:true
        });
        emitToTeam(teamId,"submission:success",{
            submissionId:submission.id,
            cdnUrl,
            deploymentUrl,
            timestamp:Date.now()
        });
        console.log(`Submission completed for team ${teamId}`);
        return {
            submissionId: submission.id,
            deploymentUrl,
            cdnUrl
        };
    } catch (error:any) {
        console.error(`Error submitting build for team ${teamId}:`,error);
        emitToTeam(teamId,"submission:error",{
            error:error.message,
            timestamp: Date.now()
        });
        throw error;
    }
}


const validateBuildFolder = async (containerId:string):Promise<boolean> => {
    try {
        const container = getContainer(containerId);
        const exec = await container.exec({
            Cmd: ["/bin/sh","-c","test -d /workspace/build || test -d /workspace/dist || test -d /workspace/.next"],
            AttachStdout:false,
            AttachStderr: false,
        })

        const stream =  await exec.start({Detach:false});

        return new Promise((resolve)=>{
            stream.on("end",async() => {
                const inspectData = await exec.inspect();
                resolve(inspectData.ExitCode === 0);
            })
        })
    } catch (error) {
        return false
    }
}



export const extractBuildFolder = async(containerId:string,teamId:string):Promise<string> => {
    const container = getContainer(containerId);
    const timestamp = Date.now();
    const tempDir = `/tmp/builds/${teamId}-${timestamp}`;
    await fs.mkdir(tempDir,{recursive:true});
    const buildFolders = ["build","dist",".next"];
    let foundFolder:string | null = null;
    for(const folder of buildFolders){
        const exec = await container.exec({
            Cmd: ["/bin/sh","-c",`test -d /workspace/${folder}`],
        });
        const stream = await exec.start({Detach:false});
        const exists = await new Promise<boolean>((resolve) => {
            stream.on("end",async()=>{
                const inspectData = await exec.inspect();
                resolve(inspectData.ExitCode === 0);
            })
        })
        if(exists){
            foundFolder = folder;
            break;
        }
    }
    if(!foundFolder){
        throw new Error("No build folder found (checkid: build,dist,.next)");
    }

    // get archive from container
    const archive = await container.getArchive({
        path:`/workspace/${foundFolder}`
    });

    //extract to temp directory
    const tarPath = path.join(tempDir,"build.tar");
    const writeStream = createWriteStream(tarPath);


    await new Promise<void>((resolve,reject) => {
        archive.pipe(writeStream);
        writeStream.on("finish",resolve);
        writeStream.on("error",reject);
    });


    await execPromise(`tar -xf ${tarPath} -C ${tempDir}`);
    await fs.unlink(tarPath);
    console.log(`Extracted build folder from container to ${tempDir}`);
    return tempDir;
}

export const archiveBuild = async(buildPath:string):Promise<Buffer> => {
    return new Promise((resolve,reject) => {
        const archive = archiver("tar",{
            gzip:true,
            gzipOptions: {level:6}
        });
        const chuncks: Buffer[] = [];
        archive.on("data",(chunk:Buffer) => {
            chuncks.push(chunk);
        })
        archive.on("end",() => {
            const buffer = Buffer.concat(chuncks);
            console.log(`Archived build: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
            resolve(buffer);
        })
        archive.on("error",reject);
        archive.directory(buildPath,false);
        archive.finalize();
    })
}


export const uploadBuildToR2 = async(teamId:string,buffer:Buffer):Promise<{
    s3Key:string;
    cdnUrl:string
}> => {
    const timestamp = Date.now();
    const s3Key = `submission/team-${teamId}/${timestamp}-final.tar.gz`;
    const cdnUrl = await uploadToS3(s3Key,buffer,"application/gzip");
    console.log(`Uplaod build to r2: ${s3Key}`);
    return {s3Key,cdnUrl};
}


export const deployToPages = async(teamId:string,buildPath:string):Promise<string> => {
    try {
        const projectName = `team-${teamId}`;
        try {
            await execPromise("wrangler --version")
        } catch (error) {
            console.warn("Wrangler cli not installed, skipping cloudflare pages deployment");
            throw new Error("Wrangler CLI not installed");
        }
        const {stdout} = await execPromise(`wrangler pages deploy ${buildPath} --project-name=${projectName}`,{
            env:{
                ...process.env,
                CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
                CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
            }
        });

        const urlMatch = stdout.match(/https:\/\/[^\s]+/);
        const deploymentUrl = urlMatch ? urlMatch[0] : `https://${projectName}.pages.dev`;
        console.log(`🌐 Deployed to Cloudflare Pages: ${deploymentUrl}`);
        return deploymentUrl;
    } catch (error:any) {
        console.error("Error deploying to Cloudflare Pages:", error.message);
        throw error;
    }
}



export const saveSubmissionRecord = async(teamId:string,s3Key:string,cdnUrl:string,deploymentUrl?:string):Promise<any> => {
    const submission = await prisma.submission.create({
        data:{
            teamId,
            fileName: "final-submission.tar.gz",
            filePath: s3Key,
            s3Key,
            cdnUrl,
            status: deploymentUrl ? "DEPLOYED" : "UPLOADED",
        }
    })
    console.log(`Saved submission record: ${submission.id}`);
    return submission;
}


export const getAllSubmissions = async (): Promise<any[]> => {
    const submissions = await prisma.submission.findMany({
        orderBy:{
            submittedAt:"desc"
        },
        include:{
            team:{
                select:{
                    id:true,
                    name:true,
                    members:{
                        select:{
                            id:true,
                            name:true,
                            email:true
                        }
                    }
                }
            }
        }
    })
    return submissions;
};




