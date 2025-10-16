import {GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import { Readable } from "stream";



const s3Client = new S3Client({
    region:process.env.S3_REGION!,
    credentials:{
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey:process.env.S3_SECRET_KEY!
    }
})

const bucket = process.env.S3_BUCKET!;

export const uploadToS3 = async(key:string,buffer:Buffer,contentType:string = 'application/octet-stream'):Promise<string> =>{
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key:key,
        Body:buffer,
        ContentType:contentType,
    });
    await s3Client.send(command);
    const cdnBase = process.env.CDN_BASE_URL!;
    return `${cdnBase}/${key}`;
}


export const uploadSubmission = async(teamId:string,fileName:string,buffer:Buffer):Promise<{s3Key:string; cdnUrl:string}> =>{
    const timestamp = Date.now();
    const s3Key = `submissions/${teamId}/${timestamp}/${fileName}`;
    const cdnUrl = await uploadToS3(s3Key,buffer,'application/zip');
    return {s3Key,cdnUrl};
}

export const getFromS3 = async(key:string):Promise<Buffer> =>{
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });
    const response = await s3Client.send(command);
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream){
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}


export const uploadBuildArtifacts = async(
    teamId:string,
    files:{
        path:string;
        content: Buffer
    }[]):Promise<string> =>{
        const timestamp = Date.now();
        const baseKey = `builds/${teamId}/${timestamp}`;

        await Promise.all(
            files.map(file=> uploadToS3(`${baseKey}/${file.path}`,file.content,getContentType(file.path)))
        )
        const cdnBase = process.env.CDN_BASE_URL!;
        return `${cdnBase}/${baseKey}/index.html`;
}


const getContentType = (filePath:string):string =>{
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string,string> = {
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
        json: 'application/json',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        svg: 'image/svg+xml',
    }
    return contentTypes[ext || ''] || 'application/octet-stream';
}

