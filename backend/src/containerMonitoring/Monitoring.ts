import { getContainer } from "../lib/docker";
import { prisma } from "../lib/prismaClient";
import { redis } from "../lib/redis";
import { emitToAdmins, emitToTeam } from "../realTimeServerUtilities/websocket";



interface ContainerStats{
    cpu:number;
    memory:{
        usage:number;
        limit:number;
        percent:number;
    };
    network?:{
        rx:number;
        tx:number;
    };
    disk?:{
        usage:number;
        limit:number;
    }
}

interface Anomaly {
    type:"CPU" | "MEMORY" | "DISK";
    severity: "WARNING" | "CRITICAL";
    message: string;
    value: number;
    threshold: number;
}



const MONITORING_INTERVAL = 5000;
const CPU_WARNING_THRESHOLD = 80;
const CPU_CRITICAL_THRESHOLD = 90;
const MEMORY_WARNING_THRESHOLD = 85;
const MEMORY_CRITICAL_THRESHOLD = 95;
const CRITICAL_DURATION = 30000;



let monitoringInterval: NodeJS.Timeout | null = null;
const anomalyTimers = new Map<string,NodeJS.Timeout>();


export const startMonitoring = () : void => {
    if(monitoringInterval){
        console.log("Monitoring already running");
        return;
    }
    console.log("Started container monitoring...");
    monitoringInterval = setInterval(async ()=>{
        try {
            await monitorAllContainers();
        } catch (error) {
            console.error("Error in monitoring loop:",error);
        }
    },MONITORING_INTERVAL);
};


export const stopMonitoring = ():void => {
    if(monitoringInterval){
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log("stopped container monitoring");
    }
    for(const timer of anomalyTimers.values()){
        clearTimeout(timer);
    }
    anomalyTimers.clear();
}


const monitorAllContainers = async():Promise<void> => {
    const activeContainers = await prisma.containerInfo.findMany({
        where:{
            status:"running"
        },
        include:{
            team:true
        }
    });
    for(const containerInfo of activeContainers){
        try {
            const stats = await getContainerStats(containerInfo.containerId);
            if(stats){
                await storeMetrics(containerInfo.teamId,stats);
                const anomalies = detectAnomalies(stats);
                if(anomalies.length > 0){
                    await handleAnomalies(containerInfo.teamId,containerInfo.containerId,anomalies);
                }
                emitToTeam(containerInfo.teamId,"container:stats",{stats, timestamp:Date.now()})
            }
        } catch (error) {
            console.error(`Error monitoring container ${containerInfo.containerId}:`,error);
        }
    }
}


const handleAnomalies = async(teamId:string,containerId:string,anomalies:Anomaly[]):Promise<void> => {
    for(const anomaly of anomalies){
        const anomalyKey = `${teamId}:${anomaly.type}`;
        if(anomaly.severity === "CRITICAL"){
            // Check if anomaly persists
            sendAdminAlert(teamId,anomaly);
            if (!anomalyTimers.has(anomalyKey)) {
                const timer = setTimeout(async () => {
                    sendAdminAlert(teamId, {
                        ...anomaly,
                        message: `PERSISTENT: ${anomaly.message} (>30s)`
                    });
                    anomalyTimers.delete(anomalyKey);
                }, CRITICAL_DURATION);
                anomalyTimers.set(anomalyKey, timer);
            }
        }else if(anomaly.severity === "WARNING"){
            // Clear critical timer if warning level
            if (anomalyTimers.has(anomalyKey)) {
                clearTimeout(anomalyTimers.get(anomalyKey)!);
                anomalyTimers.delete(anomalyKey);
            }
            sendAdminAlert(teamId,anomaly);
        }
    }
}


export const sendAdminAlert = (teamId: string, anomaly: Anomaly): void => {
        emitToAdmins("container:anomaly", {teamId,anomaly,timestamp: Date.now(),});
};


const handlePersistentAnomaly = async( teamId:string,containerId:string,anomaly:Anomaly):Promise<void> => {
    console.warn(`Persistent ${anomaly.type} anomaly for team ${teamId}:${anomaly.message}`);
    if(anomaly.type === "CPU"){
        await throttleContainer(containerId);
    }else if(anomaly.type === "MEMORY"){
        await findAndKillHeavyProcesses(containerId);
    }
    emitToTeam(teamId, "container:throttled", {
        reason: anomaly.message,
        type: anomaly.type,
        timestamp: Date.now(),
    });
}


export const throttleContainer = async (containerId: string): Promise<void> => {
    try {
        const container = getContainer(containerId);
      // Reduce CPU to minimum
        await container.update({
            NanoCpus: 0.25 * 1e9, // 0.25 cores
        });
        console.log(`Throttled container ${containerId}`);
    } catch (error) {
        console.error(`Error throttling container ${containerId}:`, error);
    }
};


const findAndKillHeavyProcesses = async (containerId: string): Promise<void> => {
    try {
        const container = getContainer(containerId);
      // Find processes using high memory
        const exec = await container.exec({
            Cmd: [
                "/bin/sh",
                "-c",
                "ps aux --sort=-%mem | head -n 5 | awk '{print $2}'",
            ],
            AttachStdout: true,
            AttachStderr: true,
        });
        const stream = await exec.start({ Detach: false });
        let output = "";
        stream.on("data", (chunk: Buffer) => {
            output += chunk.toString();
        });
        await new Promise((resolve) => stream.on("end", resolve));
        // Kill heavy processes (except PID 1)
        const pids = output.split("\n").filter((pid) => pid && pid !== "1");
        for (const pid of pids.slice(1)) {
            // Skip the header
            await killRunawayProcess(containerId, pid);
        }
    } catch (error) {
        console.error("Error finding/killing heavy processes:", error);
    }
};



export const killRunawayProcess = async (containerId: string,pid: string): Promise<void> => {
    try {
        const container = getContainer(containerId);
        await container.exec({
            Cmd: ["/bin/kill", "-9", pid],
            AttachStdout: false,
            AttachStderr: false,
        });
        console.log(`Killed process ${pid} in container ${containerId}`);
    } catch (error) {
        console.error(`Error killing process ${pid}:`, error);
    }
};


export const detectAnomalies = (stats:ContainerStats):Anomaly[] => {
    const anomalies:Anomaly[] = [];
    if(stats.cpu >= CPU_CRITICAL_THRESHOLD){
        anomalies.push({
            type:"CPU",
            severity:"CRITICAL",
            message: `CPU usage critically high: ${stats.cpu.toFixed(1)}%`,
            value: stats.cpu,
            threshold: CPU_CRITICAL_THRESHOLD,
        })
    }else if(stats.cpu >= CPU_WARNING_THRESHOLD){
        anomalies.push({
            type:"CPU",
            severity: "WARNING",
            message: `CPU usage high: ${stats.cpu.toFixed(1)}%`,
            value: stats.cpu,
            threshold: CPU_WARNING_THRESHOLD,
        })
    }


    //check memory
    if (stats.memory.percent >= MEMORY_CRITICAL_THRESHOLD) {
        anomalies.push({
            type: "MEMORY",
            severity: "CRITICAL",
            message: `Memory usage critically high: ${stats.memory.percent.toFixed(1)}%`,
            value: stats.memory.percent,
            threshold: MEMORY_CRITICAL_THRESHOLD,
        });
    } else if (stats.memory.percent >= MEMORY_WARNING_THRESHOLD) {
        anomalies.push({
            type: "MEMORY",
            severity: "WARNING",
            message: `Memory usage high: ${stats.memory.percent.toFixed(1)}%`,
            value: stats.memory.percent,
            threshold: MEMORY_WARNING_THRESHOLD,
        });
    }
    return anomalies;
}


const storeMetrics = async(teamId:string,stats:ContainerStats):Promise<void> => {
    try {
        const key = `metrics:${teamId}`;
        const data = JSON.stringify({
            cpu:stats.cpu,
            memory: stats.memory.percent,
            timestamp: Date.now()
        });
        await redis.setex(key,30,data);
    } catch (error) {
        console.error(`Error storing metrics for team ${teamId}`,error);
    }
}


export const getContainerStats = async(containerId:string): Promise<ContainerStats | null> => {
    try {
        const container = getContainer(containerId);
        const statsData = await container.stats({stream:false});
        const cpuPercent = calculateCPUPercent(statsData);
        const memoryUsage = statsData.memory_stats.usage || 0;
        const memoryLimit = statsData.memory_stats.limit || 1;
        const memoryPercent = (memoryUsage / memoryLimit) * 100;


        //network stats
        const networks = statsData.networks || {};
        let rxBytes = 0; // bytes recieved
        let txBytes = 0; // bytes transmitted

        for(const network of Object.values(networks)){
            rxBytes += (network as any).rx_bytes || 0;
            txBytes += (network as any).tx_bytes || 0;
        }
        return {
            cpu:cpuPercent,
            memory:{
                usage: memoryUsage,
                limit: memoryLimit,
                percent: memoryPercent,
            },
            network:{
                rx: rxBytes,
                tx: txBytes,
            }
        }
    } catch (error) {
        console.error(`Error getting stats for container ${containerId}:`, error);
        return null;
    }
}


export const calculateCPUPercent = (stats:any):number => {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats.system_cpu_usage || 0);
    if(systemDelta > 0 && cpuDelta > 0){
        return (
            (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100
        )
    }
    return 0;
}

