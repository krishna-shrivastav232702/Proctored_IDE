import { Server as HTTPServer } from "http";
import { Socket } from "socket.io";
import { JWTPayload, verifyToken } from "../lib/jwt";
import { Server } from "socket.io";
import { setupWebSocketHandlers } from "./WebsocketHandlers";

interface AuthSocket extends Socket {
    user?: JWTPayload;
}

let io: Server | null = null;

export const initializeWebSocket = (server: HTTPServer):Server => {
    io = new Server(server,{
        cors:{
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            credentials:true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 10e6, // 10 mb for file uplaods
    });

    io.use(async(socket:AuthSocket,next)=>{
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
            if(!token){
                return next(new Error("authentication token missing"));
            }
            const user = await verifyToken(token);
            if(!user){
                return next(new Error("invalid token"));
            }
            socket.user = user;
            next();
        } catch (error) {
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection",(socket:AuthSocket) => {
        const user = socket.user!;
        console.log(`User connected: ${user.email}-${socket.id}`)
        setupWebSocketHandlers(socket);
    });

    return io;
}


export const emitToTeam = (teamId:string,event:string,data:any) => {
    if(io){
        io.to(`team-${teamId}`).emit(event,data);
    }
};

export const emitToAdmins = (event:string,data:any)=>{
    if(io){
        io.to("admin-room").emit(event,data);
    }
};


export const emitToUser = (userId:string,event:string,data:any) => {
    if(io){
        io.to(`user-${userId}`).emit(event,data);
    }
};


