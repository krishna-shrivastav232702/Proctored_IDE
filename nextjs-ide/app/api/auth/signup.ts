import { prisma } from "@/lib/prismaClient";
import { z } from "zod";
import { signToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

const signupSchema = z.object({
    email:z.string().email(),
    password:z.string().min(8),
    name:z.string().min(3),
    teamName:z.string().optional(),
});


export async function POST(req:Request) {
    try{
        const body = await req.json();
        const parsedBody = signupSchema.parse(body);
        const {email,password,name,teamName} = parsedBody;
        
        const existingUser = await prisma.user.findUnique({
            where:{email},
        });
        if(existingUser){
            return new Response(JSON.stringify({error:"Email already registered"}),{
                status:400,
                headers: { "Content-Type": "application/json" }
            });
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
                role: "user",
                teamId: team?.id || undefined,
            },{}
        );
        return new Response(JSON.stringify({
            token,
            user:{
                id:user.id,
                email:user.email,
                name:user.name,
                role:'PARTICIPANT',
                team,
            },
        }),
        {
            status:201,
            headers: { 'Content-Type': 'application/json' }
        }
    );
    }catch(error){
        if(error instanceof z.ZodError){
            return new Response(
                JSON.stringify({error:error.issues}),
                {
                    status:400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        console.error('Error signing up',error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}