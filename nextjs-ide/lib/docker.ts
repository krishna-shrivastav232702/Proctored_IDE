import Docker from "dockerode";
import { prisma } from "./prismaClient";

const docker = new Docker({
    socketPath: process.env.DOCKER_HOST!
})


const containerImage = process.env.CONTAINER_NAME!;
const memoryLimit = process.env.CONTAINER_MEMORY_LIMIT!;
const cpuLimit = parseFloat(process.env.CONTAINER_CPU_LIMIT!);


export const createContainer = async (teamId:string,image:string):Promise<string>=>{
    const existing = await prisma.containerInfo.findUnique({
        where:{teamId},
    });
    if(existing){
        try{
            const container = docker.getContainer(existing.containerId);
            const info = await container.inspect();
            if(info.State.Running){
                return existing.containerId;
            }
            await container.start();
            return existing.containerId;
        }catch(error){
            await prisma.containerInfo.delete({where:{teamId}});
        }
    }
    const container = await docker.createContainer({
        Image:image,
        name: `ide-${teamId}`,
        Tty:true,
        OpenStdin:true,
        AttachStdin:true,
        AttachStdout:true,
        AttachStderr:true,
        Cmd:['/bin/sh'],
        WorkingDir:'/workspace',
        HostConfig:{
            Memory:parseMemory(memoryLimit),
            NanoCpus:cpuLimit*1e9,
            NetworkMode:'bridge',
            AutoRemove:false,
        },
        Env:[
            'NODE_ENV=development',
            'NPM_CONFIG_UPDATE_NOTIFIER=false',
        ],
    });
    await container.start();
    await prisma.containerInfo.create({
        data:{
            teamId,
            containerId:container.id,
            status:'running',
        }
    });
    return container.id;
}

export const stopContainer = async(teamId:string):Promise<void> => {
    const containerInfo = await prisma.containerInfo.findUnique({
        where:{teamId},
    });
    if(!containerInfo){
        return;
    }
    try {
        const container = docker.getContainer(containerInfo.containerId);
        await container.stop({t:10});
        await container.remove();
    } catch (error) {
        console.error(`Error stopping container for team ${teamId}:`,error);
    }

    await prisma.containerInfo.update({
        where:{
            teamId
        },
        data:{
            status:'stopped',
            stoppedAt:new Date(),
        },
    });
}


export const getContainerStatus= async (teamId:string):Promise<{
    running:boolean;
    containerId?:string;
    stats?:any;
}>=>{
    const containerInfo = await prisma.containerInfo.findUnique({
        where:{teamId},
    });
    if(!containerInfo){
        return { running: false };
    }
    try {
        const container = docker.getContainer(containerInfo.containerId);
        const info = await container.inspect();
        const stats = await container.stats({
            stream:false
        });
        return {
            running: info.State.Running,
            containerId:containerInfo.containerId,
            stats:{
                cpu: calculateCPUPercent(stats),
                memory:{
                    usage: stats.memory_stats.usage,
                    limit: stats.memory_stats.limit,
                    percent: (stats.memory_stats.usage / stats.memory_stats.limit) * 100,
                }
            }
        };
    } catch (error) {
        return {
            running:false
        }
    }
}


export const executeCommand = async (containerId:string,command:string):Promise<{
    stdout:string;
    stderr:string
}> =>{
    const container = docker.getContainer(containerId);
    const exec = await container.exec({
        Cmd: ['/bin/sh','-c',command],
        AttachStdout:true,
        AttachStderr:true,
    });
    const stream = await exec.start({Detach:false});
    return new Promise((resolve,reject) => {
        let stdout = '';
        let stderr = '';
        stream.on('data',(chunck:Buffer)=>{
            const str = chunck.toString();
            if(chunck[0] === 1){
                stdout += str.slice(8);
            }else if(chunck[0] === 2){
                stderr += str.slice(8);
            }
        });
        stream.on('end',()=>{
            resolve({stdout,stderr});
        });
        stream.on('error',reject);
    });
}


export const getContainer = (containerId:string) =>{
    return docker.getContainer(containerId);
}




const parseMemory = (memory:string):number =>{
    const units: Record<string,number> = {
        b:1,
        k:1024,
        m:1024*1024,
        g:1024*1024*1024,
    };
    const match = memory.toLowerCase().match(/^(\d+)([bkmg])$/);
    if(!match) return 1024*1024*1024;
    return parseInt(match[1]) * units[match[2]];
}

const calculateCPUPercent = (stats:any):number =>{
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    if(systemDelta > 0 && cpuDelta > 0){
        return (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
    }
    return 0;
}
