import {Readable} from "stream";
import { getContainer } from "./docker";
import { emitToTeam } from "../realTimeServerUtilities/websocket";


interface TerminalSession {
    containerId:string;
    teamId:string;
    stream:any;
    exec:any;
    active: boolean;
}


const sessions = new Map<string,TerminalSession>();

export const createTerminalSession = async( sessionId:string,containerId:string,teamId:string):Promise<void> => {
    try {
        if(sessions.has(sessionId)){
            console.log(`Terminal session ${sessionId} already exists`);
            return;
        }
        const container = getContainer(containerId);

        //creating exec instance with interactive shell

        const exec = await container.exec({
            Cmd:["/bin/sh"],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            Env:[
                "TERM=xterm-256color",
                "COLUMNS=80",
                "LINES=24"
            ]
        });

        // starting the exec

        const stream = await exec.start({
            hijack:true,
            stdin:true,
            Tty:true
        });

        sessions.set(sessionId,{
            containerId,
            teamId,
            stream,
            exec,
            active:true
        });

        stream.on("data",(data:Buffer)=>{
            const output = data.toString("utf-8");
            emitToTeam(teamId,"terminal:output",{
                sessionId,
                output,
                timestamp: Date.now(),
            });
        });
        stream.on("end",()=>{
            console.log(`Terminal Session ${sessionId} ended`);
            sessions.delete(sessionId);
            emitToTeam(teamId,"terminal:closed",{sessionId});
        })
        stream.on("error",(error:Error)=>{
            console.error(`Terminal session ${sessionId} error:`,error);
            emitToTeam(teamId,"terminal:error",{
                sessionId,
                error: error.message
            })
        })
        console.log(`created terminal session ${sessionId} for team ${teamId}`);
    } catch (error) {
        console.error(`Error creating terminal session ${sessionId}`,error);
        throw error;
    }
}




export const sendCommand = (sessionId:string,command:string):boolean => {
    const session = sessions.get(sessionId);
    if(!session  || !session.active){
        console.error(`Terminal session ${sessionId} not found on inactive`);
        return false;
    } 
    try {
        session.stream.write(command);
        return true;
    } catch (error) {
        console.error(`Error sending command to session ${sessionId}`,error);
        return false;
    }
}


export const resizeTerminal = async(sessionId: string,rows:number,cols:number):Promise<void> => {
    const session = sessions.get(sessionId);
    if(!session || !session.active){
        console.error(`Terminal session ${sessionId} not found or inactive`);
        return;
    }
    try {
        await session.exec.resize({h:rows,w:cols});
        console.log(`Resized terminal ${sessionId} to ${cols}x${rows}`);
    } catch (error) {
        console.error(`Error resizing terminal ${sessionId}:`,error);
    }
}


export const closeTerminalSession = (sessionId:string):void => {
    const session = sessions.get(sessionId);
    if(!session){
        return;
    }
    try {
        session.active = false;
        // sending exit command
        if(session.stream){
            session.stream.write("exit\n");
            session.stream.end();
        }
        sessions.delete(sessionId);
        console.log(`Closed terminal session ${sessionId}`);
    } catch (error) {
        console.error(`Error closing terminal session ${sessionId}:`,error);
    }
}


