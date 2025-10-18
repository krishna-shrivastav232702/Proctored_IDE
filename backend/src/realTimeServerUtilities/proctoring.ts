import { prisma } from "../lib/prismaClient";
import { redis } from "../lib/redis";
import { emitToAdmins } from "./websocket";




export enum EventSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL",
}


interface ViolationThresholds{
    TAB_SWITCH: number;
    DEVTOOLS_OPEN: number;
    CLIPBOARD_COPY: number;
    CLIPBOARD_PASTE: number;
    FULLSCREEN_EXIT: number;
    FOCUS_LOSS: number;
    SUSPICIOUS_ACTIVITY: number;
}


const THRESHOLDS: ViolationThresholds = {
    TAB_SWITCH: 3,
    DEVTOOLS_OPEN: 1,
    CLIPBOARD_COPY: 3,
    CLIPBOARD_PASTE: 3,
    FULLSCREEN_EXIT: 3,
    FOCUS_LOSS: 8,
    SUSPICIOUS_ACTIVITY: 1,
}


const SEVERITY_MAP: Record<string,EventSeverity> = {
    TAB_SWITCH: EventSeverity.MEDIUM,
    DEVTOOLS_OPEN: EventSeverity.HIGH,
    CLIPBOARD_COPY: EventSeverity.MEDIUM,
    CLIPBOARD_PASTE: EventSeverity.MEDIUM,
    FULLSCREEN_EXIT: EventSeverity.HIGH,
    FOCUS_LOSS: EventSeverity.LOW,
    SUSPICIOUS_ACTIVITY: EventSeverity.CRITICAL,
}


export const logProctoringEvent = async( teamId:string,userId:string,eventType:string,details?:any):Promise<void> => {
    try {
        const event = await prisma.proctorEvent.create({
            data:{
                userId,
                eventType: eventType as any,
                details: details ? JSON.stringify(details) : null,
            }
        });
        const count = await incrementViolationCounter(teamId,userId,eventType);
        const threshouldExceeded = await checkViolationThreshold(teamId,userId,eventType,count);
    } catch (error) {
        
    }
}


export const incrementViolationCounter = async( teamId:string,userId:string,eventType:string):Promise<number>=>{
    const key = `violations:${teamId}:${userId}:${eventType}`;
    const count = await redis.incr(key);

    if(count === 1){
        await redis.expire(key, 5*60*60);
    }
    return count;
};


export const checkViolationThreshold = async(teamId:string,userId:string,eventType:string,currentCount:number):Promise<boolean> =>{
    const threshold = THRESHOLDS[eventType as keyof ViolationThresholds] || 999;
    if(currentCount >= threshold){
        await redis.set(`violation:breach:${teamId}:${userId}:${eventType}`, currentCount.toString());
        emitToAdmins("proctor:threshold-breach",{
            teamId,userId,eventType,count:currentCount,threshold,timestamp: new Date().toISOString()
        });
        console.warn(`Violation threshold breached: ${eventType} for user ${userId} (${currentCount}/${threshold})`)
        return true;
    }
    return false;
}


export const getTeamViolations = async(teamId:string):Promise<Record<string,number>> => {
    const violations:Record<string,number> = {};
    const team = await prisma.team.findUnique({
        where: {
            id:teamId
        },
        include:{
            members:{
                select:{id:true}
            }
        }
    });
    if(!team){
        return violations;
    }
    // Get violation counts for all team members
    for(const member of team.members ){
        for(const eventType of Object.keys(THRESHOLDS)){
            const key = `violations:${teamId}:${member.id}:${eventType}`;
            const count = await redis.get(key);
            if(count){
                violations[eventType] = (violations[eventType] || 0) + parseInt(count as string);
            }
        }
    }
    return violations;
}

export const getUserViolationSummary = async(userId:string):Promise<Record<string,number>> => {
    const user = await prisma.user.findUnique({
        where:{
            id:userId
        },
        select:{
            teamId:true
        }
    });
    if(!user?.teamId){
        return {};
    }
    const violations:Record<string,number>={};
    for(const eventType of Object.keys(THRESHOLDS)){
        const key = `violations:${user.teamId}:${userId}:${eventType}`;
        const count = await redis.get(key);
        if(count){
            violations[eventType] = parseInt(count as string);
        }
    }
    return violations;
}



