import { getUserFromRequest } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaClient";
import { setSessionActive } from "@/lib/redis";
import { createContainer } from "@/lib/docker";


const frameWorkImageMap: Record<string,string> = {
    htmlcssjs: 'yourhub/html-env:latest',
    nextjs: 'yourhub/nextjs-env:latest',
    reactjs: 'yourhub/reactjs-env:latest',
    python: 'yourhub/python-env:latest',
    vuejs:'yourhub/vue',
    angular: 'yourhub/angular-env:latest'
}




export async function POST(req:NextRequest){
    const {framework} = await req.json();
    const user = await getUserFromRequest(req);
    if(!user || !user.teamId){
        return NextResponse.json({error:"Unauthorized or no team"},{status:401});
    }
    const image = frameWorkImageMap[framework] || 'node:20-alpine';
    try {
        const session = await prisma.session.create({
            data:{
                userId:user.userId,
                teamId:user.teamId,
                active:true,
            }
        });
        await setSessionActive(session.id,user.userId);
        const containerId = await createContainer(user.teamId,image);
        return NextResponse.json({
            session:{
                id:session.id,
                startedAt: session.startedAt,
                containerId,
            },
        });
    } catch (error) {
        return NextResponse.json({error:"Failed to start Session"},{
            status:401
        })
    }
}