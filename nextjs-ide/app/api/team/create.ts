import { NextRequest,NextResponse } from "next/server";
import {z} from "zod";
import { prisma } from "@/lib/prismaClient";
import { getUserFromRequest } from "@/lib/jwt";


const createTeamSchema = z.object({
    name:z.string().min(1),
})

export async function POST(req:NextRequest){
    const user = await getUserFromRequest(req);
    if(!user){
        return NextResponse.json({error:"Login and try again"},{status:401});
    }
    try {
        const body = createTeamSchema.parse(req.body);
        const existingUser = await prisma.user.findUnique({
            where:{
                id:user?.userId
            },
            include:{
                team:true
            },
        })
        if(existingUser?.teamId){
            return NextResponse.json({error:"Already in a team"},{status:400})
        }
        const team = await prisma.team.create({
            data:{
                name:body.name,
                owner: { connect: { id: user.userId } },
                members:{
                    connect:{id:user.userId},
                },
            },
            include:{
                members:{
                    select:{
                        id:true,
                        name:true,
                        email:true,
                    }
                }
            }
        })
        return NextResponse.json({team},{status:200});
    } catch (error) {
        if(error instanceof z.ZodError){
            return NextResponse.json({error:error.issues},{
                status:400
            })
        }
        return NextResponse.json({error:"Internal Server Error"},{
            status:500
        })
    }
}