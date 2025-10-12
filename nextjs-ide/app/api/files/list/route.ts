import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/prismaClient";
import { NextRequest, NextResponse } from "next/server";



export async function GET(req:NextRequest,{params}:{params:{teamId:string}}){
    const user = await getUserFromRequest(req);
    if(!user){
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const {teamId} = params;
    if(user.teamId !== teamId && user.role !== 'ADMIN'){
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try{
        const files = await prisma.file.findMany({
            where:{teamId},
            select:{
                path:true,
                version:true,
                updatedAt:true,
            },
            orderBy:{
                path:'asc'
            }
        });
        return NextResponse.json({files});
    }catch(error){
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}