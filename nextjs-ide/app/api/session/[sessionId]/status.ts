import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/prismaClient";
import { isSessionActive } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";



export async function GET(req:NextRequest){
    const user = await getUserFromRequest(req);
    if(!user){
        return NextResponse.json({
            error:"Unauthorized"
        },{status:401});
    }
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    try {
        const session = await prisma.session.findUnique({
            where:{
                id:sessionId as string
            },
            include:{
                user:{
                    select:{
                        id:true,
                        name:true,
                        email:true,
                    }
                }
            }
        });
        if(!session){
            return NextResponse.json({error:"Session not found"},{status:404});
        }
        const activeInRedis = await isSessionActive(sessionId as string);
        return NextResponse.json({
            session:{
                id:session.id,
                active:session.active && activeInRedis,
                startedAt: session.startedAt,
                endedAt: session.endedAt,
                user: session.user,
            }
        },{
            status:200
        });
    } catch (error) {
        return NextResponse.json({
            error:'Internal server error'
        },{
            status:500
        })
    }

}