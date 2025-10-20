import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getContainer } from "./docker";
import { prisma } from "./prismaClient";
import { uploadToS3 } from "./s3";




const SNAPSHOT_INTERVAL = 30*60*1000;
const MAX_SNAPSHOTS_PER_TEAM = 2;

interface SnapshotInfo {
    teamId:string;
    snapshotId:string;
    s3Key: string;
    size: number;
    timestamp: Date;
}



const snapshotTimers = new Map<string,NodeJS.Timeout>();

export const startAutoSnapshot = (teamId:string):void => {
    if(snapshotTimers.has(teamId)){
        clearInterval(snapshotTimers.get(teamId));
    }
    createSnapshot(teamId).catch(console.error);
    const timer = setInterval(async () => {
        try {
            await createSnapshot(teamId);
        } catch (error) {
            console.error(`Error creating auto-snapshot for team ${teamId}:`, error);
        }
    },SNAPSHOT_INTERVAL)
    snapshotTimers.set(teamId,timer);
    console.log(`Auto snapshot enabled for team ${teamId}`);
}


export const createSnapshot = async(teamId:string):Promise<SnapshotInfo> => {
    try {
        console.log(`Creating snapshot for team ${teamId}`);
        const containerInfo = await prisma.containerInfo.findUnique({
            where:{teamId}
        });
        if(!containerInfo){
            throw new Error(`Container not found for team ${teamId}`);
        }
        const container = getContainer(containerInfo.containerId);
        const timestamp = Date.now();
        const archiveName = `workspace-${timestamp}.tar.gz`;
        const tempArchivePath = `/tmp/${archiveName}`;

        await container.exec({
            Cmd:["/bin/sh","-c",`tar -czf ${tempArchivePath} -C /workspace . 2>/dev/null || true`],
            AttachStdout:true,
            AttachStderr:true
        });
        const archive = await container.getArchive({
            path: tempArchivePath
        });
        const chunks: Buffer[] = [];
        for await(const chunk of archive){
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const snapshotId = `${teamId}-${timestamp}`;
        const s3Key = `code-snapshots/team-${teamId}/${timestamp}.tar.gz`;
        await uploadToS3(s3Key,buffer,"application/gzip");
        console.log(`Snapshot created for team ${teamId} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
        await cleanupOldSnapshots(teamId);
        await container.exec({
            Cmd: ["/bin/rm", "-f", tempArchivePath],
        });
        return {
            teamId,
            snapshotId,
            s3Key,
            size: buffer.length,
            timestamp: new Date(),
        };
    } catch (error) {
        console.error(`Error creating snapshot for team ${teamId}:`, error);
        throw error;
    }
}


export const cleanupOldSnapshots = async(teamId:string):Promise<void> => {
    try{
        const s3Client = new S3Client({
            region: process.env.S3_REGION!,
            credentials:{
                accessKeyId: process.env.S3_ACCESS_KEY!,
                secretAccessKey: process.env.S3_SECRET_KEY!,
            }
        })
        const bucket = process.env.S3_BUCKET!;
        const prefix = `code-snapshots/team-${teamId}/`;
        
        const listCommand = new ListObjectsV2Command({
            Bucket:bucket,
            Prefix:prefix,
        });
        const response = await s3Client.send(listCommand);
        if(!response.Contents || response.Contents.length === 0){
            console.log(`No snapshots found for team ${teamId}`);
            return;
        }
        const sortedSnapshots = response.Contents.sort((a,b)=>{
            const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
            const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
            return dateB - dateA;
        })

        const snapshotsToDelete = sortedSnapshots.slice(MAX_SNAPSHOTS_PER_TEAM);
        if (snapshotsToDelete.length === 0) {
            console.log(`No old snapshots to clean up for team ${teamId} (${sortedSnapshots.length}/${MAX_SNAPSHOTS_PER_TEAM})`);
            return;
        }
        const deletePromises = snapshotsToDelete.map((snapshot) => {
            if (!snapshot.Key) return Promise.resolve();
            
            const deleteCommand = new DeleteObjectCommand({
                Bucket: bucket,
                Key: snapshot.Key,
            });
            
            return s3Client.send(deleteCommand);
        });
        await Promise.all(deletePromises);
        console.log(`🧹 Cleaned up ${snapshotsToDelete.length} old snapshots for team ${teamId} (kept ${MAX_SNAPSHOTS_PER_TEAM})`);
    }catch(error){
        console.error(`Error cleaning up snapshots for team ${teamId}:`, error);
    }
}





export const stopAutoSnapshort = (teamId:string):void => {
    const timer = snapshotTimers.get(teamId);
    if(timer){
        clearInterval(timer);
        snapshotTimers.delete(teamId);
        console.log(`Auto snapshot disabled for team ${teamId}`);   
    }
}



