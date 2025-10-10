import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload{
    userId:string;
    email:string;
    role:string;
    teamId?:string;
}

export function signToken(payload: object , options: jwt.SignOptions){
    return jwt.sign(payload,JWT_SECRET,{
        expiresIn:'6h',
        ...options
    })
} 

export async function verifyToken(token:string):Promise<JWTPayload | null>{
    try{
        // TODO: UPSTASH REDIS
        // const blacklisted = await 

        return jwt.verify(token,JWT_SECRET) as JWTPayload;
    }catch(error){
        return null;
    }
}


export function extractTokenFromRequest(req:NextRequest):string | null {
    const authHeader = req.headers.get('authorization');
    if(!authHeader?.startsWith('Bearer ')){
        return null;
    }
    return authHeader.substring(7);
}

export async function getUserFromRequest(req:NextRequest):Promise<JWTPayload | null> {
    const token = extractTokenFromRequest(req);
    if(!token) return null;
    return await verifyToken(token);
}