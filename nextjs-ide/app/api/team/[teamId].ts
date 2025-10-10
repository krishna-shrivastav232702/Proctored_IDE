import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/prismaClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest){
    const user = await getUserFromRequest(req);
    if(!user){
        return NextResponse.json({error:"Unauthorized"},{status:400});
    }
    const teamId = req.nextUrl.searchParams.get("teamId");
    if(!teamId){
        return NextResponse.json({error:"Missing Teamid"},{status:400});
    }
    try {
        const team = await prisma.team.findUnique({
            where:{
                id:teamId as string
            },
            include:{
                members:{
                    select:{
                        id:true,
                        name:true,
                        email:true,
                        createdAt:true,
                    }
                }
            ,
            sessions:{
                where:{
                    active:true
                },
                orderBy:{
                    startedAt:'desc'
                },
                take:10,
            },
            containerInfo:true,
        }});
        if(!team){
            return NextResponse.json({error:"team not found"},{status:404});
        }
        const isMember = team.members.some(
            m=>m.id === user.userId
        );
        const isAdmin = user.role === 'ADMIN';
        if(!isMember && !isAdmin){
            return NextResponse.json({
                error:"Forbidden"
            },{status:403})
        }
        return NextResponse.json({team},{status:200});
    } catch (error) {
        return NextResponse.json({error:"internal server error"},{status:500});
    }
}