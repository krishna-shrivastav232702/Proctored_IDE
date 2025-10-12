import { getUserFromRequest } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaClient";
import { deleteSession } from "@/lib/redis";
import { stopContainer } from "@/lib/docker";


export async function POST(req:NextRequest){
    const user = await getUserFromRequest(req);
    if(!user){
        return NextResponse.json({error:"Unauthorized"},{status:401});
    }
    const sessionId = await req.json();
    try{
        const session = await prisma.session.findUnique({
            where:{
                id:sessionId
            },
            include:{
                team:true
            }
        });
        if(!session){
            return NextResponse.json({error:"Session not found"},{status:404});
        }
        if(session.userId !== user.userId && user.role !== 'ADMIN'){
            return NextResponse.json({error:"Forbidden"},{status:403});
        }
        await prisma.session.update({
            where:{
                id:sessionId
            },
            data:{
                active:false,
                endedAt: new Date(),
            }
        });
        await deleteSession(sessionId);
        const activeSessions = await prisma.session.count({
            where:{
                teamId:session.teamId,
                active:true
            }
        })
        if(activeSessions === 0){
            await stopContainer(session.teamId);
        }
        return NextResponse.json({error:"Session ended successfully"},{status:200});
    }catch(error){
        return NextResponse.json({error:"Failed to end session"},{status:500});
    }
} 