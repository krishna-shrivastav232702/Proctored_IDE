import Queue from "bull";
import { emitToTeam } from "./websocket";
import { getContainer } from "../lib/docker";
import { prisma } from "../lib/prismaClient";
import { getBuildCommand } from "../lib/frameworkTemplate";


interface BuildJob {
    teamId:string;
    containerId:string;
    buildCommand?:string;
}


const buildQueue = new Queue<BuildJob> ("build-queue",{
    redis:{
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD
    },
    defaultJobOptions:{
        attempts:1,
        timeout:120000,
        removeOnComplete:true,
        removeOnFail: false
    }
});


//process builds with max 10 concurrent jobs
buildQueue.process(10,async(job) => {
    const {teamId,containerId,buildCommand} = job.data;
    let resourcesBoosted = false;
    try{
        console.log(`Starting build for team ${teamId}`);
        emitToTeam(teamId,"build:started",{
            jobId:job.id,
            timestamp: Date.now()
        });
        const team = await prisma.team.findUnique({
            where:{
                id:teamId
            },
            select:{
                framework: true
            }
        });
        const framework = team?.framework || "NEXTJS";
        const finalBuildCommand = buildCommand || getBuildCommand(framework);
        await boostContainerResources(containerId);
        resourcesBoosted = true;
        const result = await executeBuildWithStreaming(teamId,containerId,finalBuildCommand,(output) => {
            emitToTeam(teamId,"build:log",{
                jobId:job.id,
                output,
                timestamp:Date.now()
            })
        })
        emitToTeam(teamId,"build:success",{
            jobId:job.id,
            timestamp: Date.now(),
            duration:Date.now() - job.timestamp,
            framework: framework
        });
        console.log(`Build completed for team ${teamId}`);
        return {
            success:true,
            stdout: result.stdout,
            stderr: result.stderr
        };
    }catch(error:any){
        console.error(`Build failed for team ${teamId}:`,error);
        emitToTeam(teamId,"build:failed",{
            jobId:job.id,
            error: error.message,
            timestamp: Date.now()
        });
        throw error;
    } finally{
        // always reset resources
        if(resourcesBoosted){
            try {
                await resetContainerResources(containerId);
                console.log(`Resources reset for container ${containerId} after build`);
            } catch (error) {
                emitToTeam(teamId,"build:resource-leak",{
                    containerId,
                    error: "Failed to reset container resources"
                })
            }
        }
    }
});


const executeBuildWithStreaming = async(teamId:string,containerId:string,buildCommand:string,onOutput:(output:string) => void):Promise<{
    stdout:string;
    stderr:string;
}> => {
    const container = getContainer(containerId);
    const exec = await container.exec({
        Cmd:["/bin/sh","-c",buildCommand],
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
    });
    const stream = await exec.start({Detach:false});
    return new Promise((resolve,reject) => {
        let stdout = "";
        let stderr = "";
        stream.on("data",(chunk:Buffer) => {
            const str = chunk.toString();

            if(chunk[0] === 1){
                const output = str.slice(8);
                stdout += output;
                onOutput(output);
            }else if(chunk[0] === 2){
                const output = str.slice(8);
                stderr += output;
                onOutput(output);
            }
        });
        stream.on("end",async()=>{
            const inspectData = await exec.inspect();
            if(inspectData.ExitCode !== 0){
                reject(new Error(`Build failed with exit code ${inspectData.ExitCode}`));
            }else{
                resolve({stdout,stderr});
            }
        })
        stream.on("error",reject);
    })
}


const boostContainerResources = async(containerId:string):Promise<void> => {
    try{
        const container = getContainer(containerId);
        //verify container is running before boosting
        const info = await container.inspect();
        if(!info.State.Running){
            throw new Error(`Container ${containerId} is not running `);
        }
        await container.update({
            NanoCpus: 1e9,
            Memory: 1024*1024*1024
        });
        console.log(`Boosted resources for container ${containerId}`);
    }catch(error){
        console.log(`Error boosting container resources:`,error);
        throw new Error(`Cannot boost container resources: ${error instanceof Error ? error.message : 'Unknown error'}. Build may fail due to insufficient memory.`);
    }
}

// TODO: i feel there is an error in the allocation /// check copilot while reviewing , i feel the resource allocation doesnt make any sense for now
const resetContainerResources = async(containerId:string):Promise<void> => {
    try{
        const container = getContainer(containerId);
        const cpuLimit = parseFloat(process.env.CONTAINER_CPU_LIMIT || "0.5");
        const memoryLimit = process.env.CONTAINER_MEMORY_LIMIT || "512m";
        const info = await container.inspect();
        if (!info.State.Running) {
            console.warn(`Container ${containerId} is not running, skipping resource reset`);
            return;
        }
        await container.update({
            NanoCpus: cpuLimit*1e9,
            Memory: parseMemory(memoryLimit)
        });
        console.log(`Reset resources for container ${containerId} to ${cpuLimit} CPU + ${memoryLimit} RAM`);
    }catch(error){
        console.error(`Failed to reset container resources for ${containerId}:`,error);
        throw error;
    }
}

const parseMemory = (memory:string):number => {
    const units: Record<string,number> = {
        b: 1,
        k: 1024,
        m: 1024 * 1024,
        g: 1024 * 1024 * 1024
    };
    const match = memory.toLowerCase().match(/^(\d+)([bkmg])$/);
    if(!match) return 512*1024*1024;
    return parseInt(match[1])*units[match[2]];
}


export const getBuildStatus = async(jobId:string):Promise<any> => {
    const job = await buildQueue.getJob(jobId);
    if(!job){
        return null;
    }
    const state = await job.getState();
    return {
        id:job.id,
        state,
        progress: job.progress(),
        timestamp: job.timestamp,
        data: job.data,
    }
};


export const cancelBuild = async(jobId:string):Promise<boolean> => {
    const job = await buildQueue.getJob(jobId);
    if(!job){
        return false;
    }
    const state = await job.getState();
    if(state === "active"){
        return false;
    }
    await job.remove();
    return true;
}

export const getQueueStats = async():Promise<any> => {
    const [waiting,active,completed,failed] = await Promise.all([
        buildQueue.getWaitingCount(),
        buildQueue.getActiveCount(),
        buildQueue.getCompletedCount(),
        buildQueue.getFailedCount(),
    ]);
    return {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active
    }
}


buildQueue.on("failed",(job,err) => {
    console.error(`Build Job ${job.id} failed: `,err);
    if(job.data.teamId){
        emitToTeam(job.data.teamId,"build:error",{
            jobId:job.id,
            error: err.message,
            timestamp: Date.now()
        })
    }
})

buildQueue.on("stalled",(job) => {
    console.warn(`Build job ${job.id} stalled`);
    if(job.data.teamId){
        emitToTeam(job.data.teamId,"build:stalled",{
            jobId:job.id,
            message: "Build appears to be stuck. Please try again.",
            timestamp: Date.now()
        });
    }
})


export const cleanupBuildQueue = async (): Promise<void> => {
    console.log("Cleaning up build queue");
    await buildQueue.close();
    console.log("Build queue cleaned up");
};


export const addBuildJob = async (jobData: BuildJob): Promise<any> => {
    return await buildQueue.add(jobData, {
        priority: 1,
        timeout: 120000
    });
};

export const getQueuePosition = async (jobId: string): Promise<number> => {
    const job = await buildQueue.getJob(jobId);
    if (!job) {
        return 0;
    }
    
    const waitingJobs = await buildQueue.getWaiting();
    const position = waitingJobs.findIndex(j => j.id === jobId);
    return position >= 0 ? position + 1 : 0;
};