import {z} from "zod";
import { prisma } from "@/lib/prismaClient";
import { NextRequest,NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";



const inviteSchema = z.object({
    email:z.string().email()
})

export async function POST(req:NextRequest){
    const user = await getUserFromRequest(req);
    if(!user || !user.teamId){
        return NextResponse.json({error:"Unauthorized or no team"},{status:401});
    }
    try {
        const body = inviteSchema.parse(req.body);
        const team = await prisma.team.findUnique({
            where:{
                id:user.teamId
            },
            include:{
                members:true
            }
        });
        const maxTeamSize = parseInt(process.env.MAX_TEAM_SIZE!);
        if(team && team.members.length >= maxTeamSize){
            return NextResponse.json({error:"Team is full"},{status:400});
        }
        const invitedUser = await prisma.user.findUnique({
            where:{email:body.email},
        });
        if(!invitedUser){
            return NextResponse.json({error:"User not found"},{status:404});
        }
        if(invitedUser.teamId){
            return NextResponse.json({error:"User already in a team"},{status:400});
        }
        await prisma.user.update({
            where:{id:invitedUser.id},
            data:{
                teamId:user.teamId
            }
        });
        return NextResponse.json({message:"User invited successfully"},{status:200});
    } catch (error) {
        if(error instanceof z.ZodError){
            return NextResponse.json({error:error.issues},{status:400})
        }
        return NextResponse.json({error:"Internal server error"},{status:500});
    }
}