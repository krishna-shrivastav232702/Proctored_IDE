import { getUserFromRequest } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaClient";
import { setSessionActive } from "@/lib/redis";

export async function POST(req:NextRequest){
    const user = await getUserFromRequest(req);
    if(!user || !user.teamId){
        return NextResponse.json({error:"Unauthorized or no team"},{status:401});
    }
    try {
        const session = await prisma.session.create({
            data:{
                userId:user.userId,
                teamId:user.teamId,
                active:true,
            }
        });
        await setSessionActive(session.id,user.userId);
        
    } catch (error) {
        
    }
}