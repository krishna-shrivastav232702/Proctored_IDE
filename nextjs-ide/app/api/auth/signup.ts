import { prisma } from "@/lib/prismaClient";
import { z } from "zod";
import { signToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { NextRequest,NextResponse } from "next/server";

const signupSchema = z.object({
    email:z.string().email(),
    password:z.string().min(8),
    name:z.string().min(3),
    teamName:z.string().optional(),
});


export async function POST(req:NextRequest) {
    try{
        const body = await req.json();
        const parsedBody = signupSchema.parse(body);
        const {email,password,name,teamName} = parsedBody;
        
        const existingUser = await prisma.user.findUnique({
            where:{email},
        });
        if(existingUser){
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 400 }
            );
        }
        const hashedPassword = await bcrypt.hash(password,10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });
        let team = null;
        if(teamName){
            team = await prisma.team.create({
                data: {
                    name: teamName,
                    ownerId: user.id,
                    members:{
                        connect:{id:user.id},
                    },
                },
            });
            await prisma.user.update({
                where: { id: user.id },
                data: { teamId: team.id },
            });
        }
        const token = signToken({
                userId: user.id,
                email: user.email,
                role: "PARTICIPANT",
                teamId: team?.id || undefined,
            },{}
        );
        return NextResponse.json({
            token,
            user:{
                id:user.id,
                email:user.email,
                name:user.name,
                role:'PARTICIPANT',
                team,
            },
        },
        {status:201}
        );
    }catch(error){
        if(error instanceof z.ZodError){
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error('Error signing up',error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}