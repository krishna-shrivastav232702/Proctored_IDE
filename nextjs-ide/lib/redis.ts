import {Redis} from "@upstash/redis";

export const redis = new Redis({
    url:process.env.UPSTASH_REDIS_REST_URL!,
    token:process.env.UPSTASH_REDIS_REST_TOKEN!,
})


export async function getAIUsageCount(teamId:string):Promise<number>{
    const key = `ai:usage:${teamId}`;
    const count = await redis.get(key);
    return count ? parseInt(count as string):0;
}

export async function incrementAiUsage(teamId:string):Promise<number>{
    const key = `ai:usage:${teamId}`;
    const count = await redis.incr(key);
    if(count == 1){
        await redis.expire(key,24*60*60);
    }
    return count;
}

export async function canUseAi(teamId:string):Promise<boolean>{
    const maxHints = parseInt(process.env.AI_MAX_HINTS_PER_TEAM!);
    const count = await getAIUsageCount(teamId);
    return count < maxHints;
}

export async function setSessionActive(sessionId:string,userId:string):Promise<void>{
    const key = `session:${sessionId}`;
    await redis.setex(key,5*60*60,userId);
}

export async function isSessionActive(sessionId:string):Promise<boolean>{
    const key = `session:${sessionId}`;
    const exists = await redis.exists(key);
    return exists === 1;
}


export async function deleteSession(sessionId:string):Promise<void>{
    const key = `session:${sessionId}`;
    await redis.del(key);
}
