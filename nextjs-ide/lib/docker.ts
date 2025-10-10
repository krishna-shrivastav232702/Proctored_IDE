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


