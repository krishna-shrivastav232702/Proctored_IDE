import {Socket} from "socket.io";
import { JWTPayload } from "../lib/jwt";
import { addConnection, handleYjsSync, persistYjsSnapshot, removeConnection, setupYjsRoom } from "./yjs";
import { prisma } from "../lib/prismaClient";
import { closeTerminalSession, createTerminalSession, resizeTerminal, sendCommand } from "../lib/terminal";
import { logProctoringEvent } from "./proctoring";

interface AuthSocket extends Socket {
    user?: JWTPayload;
}

export const setupWebSocketHandlers = (socket:AuthSocket):void =>{
    const user = socket.user!;
    if(user.teamId){ // join team room if exists
        socket.join(`team-${user.teamId}`);
        setupYjsRoom(user.teamId);
        addConnection(user.teamId,socket.id);
        console.log(`User ${user.email} joined team-${user.teamId}`);
    }
    socket.on("editor:sync",async(data:{ update: number[]})=>{
        if(!user.teamId) return;
        try{
            const update = new Uint8Array(data.update);
            handleYjsSync(user.teamId,user.userId,update);
        }catch(error){
            console.error("Error syncing editor:",error);
            socket.emit("editor:error",{message:"Failed to sync changes"});
        }
    });
    socket.on("editor:request-state",async()=>{
        if(!user.teamId) return;
        try {
            socket.emit("editor:state-ready");
        } catch (error) {
            console.error("Error requesting state:",error);
        }
    });
    
    // terminal
    
    socket.on("terminal:create",async(data: {sessionId:string})=>{
        if(!user.teamId) return;
        try {
            const containerInfo = await prisma.containerInfo.findUnique({
                where:{
                    teamId: user.teamId
                }
            });
            if(!containerInfo){
                socket.emit("terminal:error",{
                    message:"container not found. please start a session first",
                })
                return;
            }
            await createTerminalSession(data.sessionId,containerInfo.containerId,user.teamId);
            socket.emit("terminal:ready",{sessionId:data.sessionId});
        } catch (error:any) {
            console.error("Error creating terminal:", error);
            socket.emit("terminal:error", { message: error.message });
        }
    })

    socket.on("terminal:input",(data:{
        sessionId:string;
        input:string})=>{
            try {
                const success = sendCommand(data.sessionId,data.input);
                if(!success){
                    socket.emit("terminal:error",{
                        sessionId:data.sessionId,
                        message:"Terminal session not found"
                    });
                }
            } catch (error) {
                console.error("Error sending terminal input:",error);
            }
    });

    socket.on("terminal:resize",(data:{sessionId:string; rows:number; cols:number})=>{
        try {
            resizeTerminal(data.sessionId,data.rows,data.cols);
        } catch (error) {
            console.error("Error resizing terminal:",error);
        }
    });

    socket.on("terminal:close",(data:{sessionId:string})=>{
        try {
            closeTerminalSession(data.sessionId);
        } catch (error) {
            console.error("error closing terminal:",error);
        }
    });



    // File operations



    socket.on("file:save",async(data:{path:string;content:string})=>{
        if(!user.teamId) return;
        try {
            await prisma.file.upsert({
                where:{
                    teamId_path:{
                        teamId:user.teamId,
                        path:data.path,
                    },
                },
                update:{
                    content:data.content,
                    version:{increment:1},
                },
                create:{
                    teamId:user.teamId,
                    path:data.path,
                    content:data.content,
                }
            });
            socket.emit("file:saved",{path:data.path});
            socket.to(`team-${user.teamId}`).emit("file:changed",{
                path:data.path,
                action:"modify",
                userId:user.userId,
            });
        } catch (error) {
            console.error("error saving file:",error);
            socket.emit("file:error",{
                message:"failed to save file"
            });
        }
    });



    socket.on("file:create",async(data:{
        path:string;
        content?: string
    })=>{
        if(!user.teamId) return;
        try {
            await prisma.file.create({
                data:{
                    teamId:user.teamId,
                    path: data.path,
                    content: data.content || "",
                }
            });
            socket.emit("file:created",{path:data.path});
            socket.to(`team-${user.teamId}`).emit("file:changed",{
                path: data.path,
                action: "add",
                userId: user.userId,
            });
        } catch (error) {
            console.error("Error creating file",error);
            socket.emit("file:error",{
                message:"failed to create file"
            });
        }
    });


    socket.on("file:delete",async(data:{path:string})=>{
        if(!user.teamId) return;
        try {
            await prisma.file.delete({
                where:{
                    teamId_path:{
                        teamId: user.teamId,
                        path: data.path
                    }
                }
            })
            socket.emit("file:deleted",{path:data.path});
            socket.to(`team-${user.teamId}`).emit("file:changed",{
                path:data.path,
                action:"delete",
                userId:user.userId,
            });
        } catch (error) {
            console.error("Error deleting file:",error);
            socket.emit("file:error",{
                message:"failed to delete file"
            })
        }
    });


    //TODO: build & deployment logic not added



    // Proctoring


    socket.on("procter:event",async(data:{
        eventType:string;
        details?:any
    })=> {
        if(!user.teamId) return;
        try {
            await logProctoringEvent(user.teamId,user.userId,data.eventType,data.details);
        } catch (error) {
            console.error("Error logging proctor event:",error);
        }
    })

    //cursor

    socket.on("cursor:move",(data:{
        file:string;
        line:number;
        column:number
    })=>{
        if(!user.teamId) return;
        socket.to(`team-${user.teamId}`).emit("current:position",{
            ...data,
            userId:user.userId,
            email:user.email,
        })
    });


    socket.on("disconnect",async()=>{
        console.log(`User ${user.email} disconnected`);
        if(user.teamId){
            removeConnection(user.teamId,socket.id);
            await persistYjsSnapshot(user.teamId);
            socket.to(`team-${user.teamId}`).emit("member:left",{
                userId:user.userId,
                email:user.email,
            })
        }
    });


}