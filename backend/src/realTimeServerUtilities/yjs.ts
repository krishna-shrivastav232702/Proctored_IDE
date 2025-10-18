import * as Y from "yjs";
import { redis } from "../lib/redis";
import { emitToTeam } from "./websocket";

// remember few code changes , changing the system from every team's timer to a global timer 
interface YjsRoom{
    doc: Y.Doc;
    lastSnapshot: number;
    connections: Set<string>;
    dirty:boolean
}

const rooms = new Map<string, YjsRoom>();
const SNAPSHOT_INTERVAL = 30000;


export const setupYjsRoom = (teamId:string): Y.Doc => {
    if(rooms.has(teamId)){
        return rooms.get(teamId)!.doc;
    }
    const doc = new Y.Doc();
    rooms.set(teamId,{
        doc,
        lastSnapshot: Date.now(),
        connections: new Set(),
        dirty:false,
    });
    loadYjsSnapshot(teamId,doc).catch(console.error);
    console.log(`Created yjs room for team ${teamId}`);
    return doc;
}


export const handleYjsSync = (teamId: string,userId: string,update: Uint8Array):void =>{
    const room = rooms.get(teamId);
    if(!room){
        console.error(`Yjs room not found for team ${teamId}`);
        return;
    }
    Y.applyUpdate(room.doc,update);
    room.dirty = true;
    //broadcasting to other team member functions
    emitToTeam(teamId,"yjs:sync",{
        update: Array.from(update),
        userId,
        timeStamp:Date.now(),
    });
}

export const loadYjsSnapshot = async(teamId:string,doc:Y.Doc):Promise<void> =>{
    try {
        const key = `yjs:${teamId}:state`;
        const base64State = await redis.get(key);
        if(!base64State){
            console.log(`No existing Yjs snapshot found for team ${teamId}`);
            return;
        }
        const state = Buffer.from(base64State as string,"base64");
        Y.applyUpdate(doc,state);
        console.log(`Loaded Yjs snapshot for team ${teamId} (${state.length} bytes)`);
    } catch (error) {
        console.error(`Error loading Yjs snapshot for team ${teamId}:`,error);
    }
}

export const persistYjsSnapshot = async(teamId:string,doc?:Y.Doc): Promise<void> => {
    try {
        const room = rooms.get(teamId);
        const yjsDoc = doc || room?.doc;
        if(!yjsDoc){
            console.error(`Cannot persist: Yjs Doc not found for team ${teamId}`);
            return;
        }
        const state = Y.encodeStateAsUpdate(yjsDoc);
        const base64State = Buffer.from(state).toString("base64");
        // storing in redis with 6 hours time to live (ttl)
        const key = `yjs:${teamId}:state`;
        await redis.setex(key,6*60*60,base64State);
        console.log(`Persisted Yjs Snapshot for team ${teamId} (${state.length} bytes)`);
    } catch (error) {
        console.error(`Error persisting Yjs snapshot for team ${teamId}:`,error);
    }
}


export const addConnection = (teamId:string,connectionId:string):void => {
    const room = rooms.get(teamId);
    if(room){
        room.connections.add(connectionId);
        console.log(`Added connection ${connectionId} to team ${teamId} (total: ${room.connections.size})`);
    }
}

export const removeConnection = (teamId:string,connectionId:string):void => {
    const room = rooms.get(teamId);
    if(room){
        room.connections.delete(connectionId);
        console.log(`Removed connection ${connectionId} from team ${teamId} (remaining: ${room.connections.size})`);
    }
}

export const getYjsDocument = (teamId:string):Y.Doc | null => {
    const room = rooms.get(teamId);
    return room?.doc || null
}


export const broadcastToTeam = (teamId:string,operation:any):void => {
    emitToTeam(teamId,"yjs:operation",operation);
}

export const cleanupYjsRooms = async(): Promise<void> => {
    for(const [teamId,room] of rooms.entries()){
        if(room.dirty) await persistYjsSnapshot(teamId,room.doc);
    }
    rooms.clear();
    console.log("Yjs rooms cleaned up");
}




setInterval(async ()=>{
    const now = Date.now();
    for(const [teamId,room] of rooms.entries()){
        try {
            if(room.connections.size > 0 && room.dirty){
                await persistYjsSnapshot(teamId,room.doc);
                room.lastSnapshot = now;
                room.dirty = false;
            }else if(room && room.connections.size === 0 && now - room.lastSnapshot > 300000){
                rooms.delete(teamId);
                console.log(`Cleaning up idle yjs room for team ${teamId}`);
            }
        } catch (error) {
            console.error(`Error in yjs global snapshot loop for team ${teamId}`,error);
        }
    }
},SNAPSHOT_INTERVAL);