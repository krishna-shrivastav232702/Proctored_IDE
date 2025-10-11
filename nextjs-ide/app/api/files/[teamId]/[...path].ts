import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/prismaClient";
import { error } from "console";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req:NextRequest,{params}:{params:{teamId:string,path:string[]}}){
    const user = await getUserFromRequest(req);
    if(!user){
        return NextResponse.json({error:"Unauthorized"},{status:401});
    }
    const {teamId,path} = params;
    const filePath = Array.isArray(path) ? path.join('/') : path;
    if(user.teamId !== teamId && user.role !== 'ADMIN'){
        return NextResponse.json({
            error:"Forbidden"
        },{status:403});
    }
    try {
        const file = await prisma.file.findUnique({
            where:{
                teamId_path:{
                    teamId,
                    path:filePath,
                },
            }
        });
        if(!file){
            return NextResponse.json({error:"File not found"},{status:404});
        }
        return NextResponse.json({
            file:{
                path:file.path,
                content: file.content,
                version: file.version,
                updatedAt: file.updatedAt,
            }
        });
    } catch (error) {
        return NextResponse.json({
            error:"Internal Server Error"
        },{
            status:500
        })
    }
}


export async function POST(req:NextRequest,{params}:{params:{teamId:string,path:string[]}}){
    const user = await getUserFromRequest(req);
    if(!user){
        NextResponse.json({error:"Unauthorized"},{status:401});
    }
    const {teamId,path} = params;
    const filePath = Array.isArray(path) ? path.join('/') : path;
    if(user?.teamId !== teamId && user?.role !== 'ADMIN'){
        return NextResponse.json({
            error:"forbidden"
        },{status:403});
    }
    const content = await req.json();
    try {
        const file = await prisma.file.upsert({
            where:{
                teamId_path:{
                    teamId,
                    path:filePath,
                }
            },
            update:{
                content,
                version:{
                    increment:1
                },
            },
            create:{
                teamId,
                path:filePath,
                content
            }
        });
        return NextResponse.json({
            file:{
                path:file.path,
                version:file.version,
                updatedAt: file.updatedAt,
            }
        });
    } catch (error) {
        return NextResponse.json({
            error:"Internal server error"
        },{status:500});
    }
}


export async function DELETE(req:NextRequest,{params}:{params:{teamId:string,path:string[]}}){
    const user = await getUserFromRequest(req);
    if(!user){
        return NextResponse.json({
            error:"Unauthorized"
        },{
            status:401
        })
    }
    const {teamId,path} = params;
    const filePath = Array.isArray(path) ? path.join('/') : path;
    if(user.teamId !== teamId && user.role !== 'ADMIN'){
        return NextResponse.json({
            error:"Forbidden"
        },{
            status:403
        })
    }
    try{
        await prisma.file.delete({
            where:{
                teamId_path:{
                    teamId,
                    path:filePath
                }
            }
        });
        return NextResponse.json({message:"file deleted successfully"});
    }catch(error){
        return NextResponse.json({
            error:"Internal Server error"
        },{
            status:500
        })
    }
}