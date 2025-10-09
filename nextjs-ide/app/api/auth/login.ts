import {z} from 'zod';
import {prisma} from "@/lib/prismaClient";
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';

const loginSchema = z.object({
    email:z.string().email(),
    password:z.string(),
});


export async function POST(req:NextRequest){
    try {
        const body = await req.json();
        const parsedBody = loginSchema.parse(body);
        const user = await prisma.user.findUnique({
            where:{email:parsedBody.email},
            include:{
                team:{
                    include:{
                        members:{
                            select:{
                                id:true,
                                name:true,
                                email:true,
                            }
                        }
                    }
                }
            }
        });

        if(!user){
            return NextResponse.json({error:'Invalid Credentials'},{status:401});
        }

        const passwordValid = await bcrypt.compare(parsedBody.password,user.password);
        if(!passwordValid){
            return NextResponse.json({
                error:'Invalid Credentials'
            },{
                status:401
            });
        }
        const token = signToken({
            userId:user.id,
            email:user.email,
            role:user.role,
            teamId:user.teamId || undefined,
        }, {
            expiresIn: '24h'
        });
        return NextResponse.json({
            token,
            user:{
                id:user.id,
                email:user.email,
                name:user.name,
                role:user.role,
                team:user.team,
            }
        },{
            status:200
        })
    } catch (error) {
        if(error instanceof z.ZodError){
            return NextResponse.json({
                error:error.issues,
            },{
                status:400
            })
        }
        return NextResponse.json({error:"Internal server error"},{status:500})
    }
}

