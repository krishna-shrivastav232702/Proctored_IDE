import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});



export async function setCache(key: string, value: string, ttlSeconds: number): Promise<void> {
  await redis.setex(key, ttlSeconds, value);
}

export async function getFromCache(key: string): Promise<string | null> {
  const cached = await redis.get(key);
  return cached ? (cached as string) : null;
}

export async function deleteFromCache(key: string): Promise<void> {
  await redis.del(key);
}


export async function getAIUsageCount(teamId: string): Promise<number> {
  const key = `ai:usage:${teamId}`;
  const count = await redis.get(key);
  return count ? parseInt(count as string) : 0;
}

export async function incrementAiUsage(teamId: string): Promise<number> {
  const key = `ai:usage:${teamId}`;
  const count = await redis.incr(key);
  if (count == 1) {
    await redis.expire(key, 24 * 60 * 60);
  }
  return count;
}

export async function canUseAi(teamId: string): Promise<boolean> {
  const maxHints = parseInt(process.env.AI_MAX_HINTS_PER_TEAM!);
  const count = await getAIUsageCount(teamId);
  return count < maxHints;
}

export async function cacheContainerStatus(teamId:string,status:{ 
  running: boolean;
  containerId?: string;
  stats?: any
}):Promise<void>{
  const key = `container:status:${teamId}`;
  await redis.setex(key,30,JSON.stringify(status));
}

export async function getCachedContainerStatus(teamId:string):Promise<{
  running:boolean;
  containerId?: string;
  stats?: any
} | null>{
  const key = `container:status:${teamId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached as string):null;
}


export async function cacheBuildQueuePosition(jobId:string,position:number):Promise<void>{
  const key = `build:queue:${jobId}`;
  await redis.setex(key,60,position.toString());
}

export async function getCacheBuildQueueOperation(jobId:string):Promise<number | null > {
  const key = `build:queue:${jobId}`;
  const cached = await redis.get(key);
  return cached ? parseInt(cached as string) : null;
}