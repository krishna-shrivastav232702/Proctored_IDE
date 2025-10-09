import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export function signToken(payload: object , options: jwt.SignOptions){
    return jwt.sign(payload,JWT_SECRET,{
        expiresIn:'7d',
        ...options
    })
} 