import { FSWatcher } from "chokidar";
import { emitToTeam } from "../realTimeServerUtilities/websocket";
import chokidar from "chokidar";
import path from "path";



interface FileChange {
    type: "add" | "change" | "unlink" | "addDir" | "unlinkDir";
    path:string;
    timestamp: number;
}


interface WatcherInfo {
    watcher: FSWatcher;
    teamId:string;
    containerId:string;
    volumePath: string;
    batchedEvents: FileChange[];
    batchTimeout: NodeJS.Timeout | null;
    errorCount: number; 
    lastError: Date | null;
}

const watchers = new Map<string,WatcherInfo>();
const BATCH_DELAY = 1000;
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_DELAY = 7000;



export const watchTeamVolume = (teamId:string,containerId:string,volumePath:string):void => {
    if(watchers.has(teamId)){
        stopWatcher(teamId);
    }
    const watcher = chokidar.watch(volumePath,{
        ignored:[
            "**/node_modules/**",
            "**/.git/**",
            "**/.cache/**",
            "**/*.log",
            "**/dist/**",
            "**/.next/**",
            "**/build/**",
            "**/.turbo/**",
            "**/coverage/**",
            "**/.DS_Store",
            "**/thumbs.db",
        ],
        persistent:true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100,
        },
        depth:10
    });
    const watcherInfo:WatcherInfo = {
        watcher,
        teamId,
        containerId,
        volumePath,
        batchedEvents: [],
        batchTimeout: null,
        errorCount: 0,
        lastError: null
    };

    watcher.on("add",(filePath) => {
        handleFileChange(watcherInfo,"add",filePath);
    })
    watcher.on("change",(filePath) => {
        handleFileChange(watcherInfo,"change",filePath);
    })
    watcher.on("unlink",(filePath) => {
        handleFileChange(watcherInfo,"unlink",filePath);
    })
    watcher.on("addDir",(dirPath) => {
        handleFileChange(watcherInfo,"addDir",dirPath);
    })
    watcher.on("unlinkDir",(dirPath) => {
        handleFileChange(watcherInfo,"unlinkDir",dirPath);
    })
    watcher.on("error",(error) => {
        console.error(`File watcher error for team ${teamId}`,error);
        handleWatcherError(watcherInfo,error as Error);
    })
    watcher.on("ready",() => {
        console.log(`File watcher ready for team ${teamId}`);
        watcherInfo.errorCount = 0;
        watcherInfo.lastError = null;
    })
    watchers.set(teamId,watcherInfo);
}



const handleWatcherError = (watcherInfo:WatcherInfo,error:Error): void => {
    console.error(`File watcher error for team ${watcherInfo.teamId}:`,error);

    watcherInfo.errorCount++;
    watcherInfo.lastError = new Date();

    emitToTeam(watcherInfo.teamId,"watcher:error",{
        message:"File watcher encountered on error",
        timestamp: Date.now()
    });

    if(watcherInfo.errorCount <= MAX_RESTART_ATTEMPTS){
        console.log(`Attempting to restart file watcher for team ${watcherInfo.teamId} (attempt ${watcherInfo.errorCount}/${MAX_RESTART_ATTEMPTS})`);
        setTimeout(() => {
            restartWatcher(watcherInfo);
        },RESTART_DELAY);
    }else{
        console.error(`File watcher for team ${watcherInfo.teamId} failed after ${MAX_RESTART_ATTEMPTS} attempts. Manual intervention required.`); 
        emitToTeam(watcherInfo.teamId, "watcher:failed", {
            message: "File watcher failed to restart. Please contact support.",
            timestamp: Date.now()
        });
        stopWatcher(watcherInfo.teamId);
    }
}

const restartWatcher = (watcherInfo:WatcherInfo):void => {
    const {teamId,containerId,volumePath} = watcherInfo;
    console.log(`Restarting file watcher for team ${teamId}...`);
    //closing existing watcher
    try {
        watcherInfo.watcher.close();
    } catch (error) {
        console.error(`Error closing watcher for team ${teamId}:`, error);
    }
    watchers.delete(teamId);
    try {
        watchTeamVolume(teamId,containerId,volumePath);
        emitToTeam(teamId,"watcher:restarted",{
            message:"file watcher restarted successfully",
            timestamp: Date.now()
        });
        console.log("file watcher restarted");
    } catch (error) {
        const newWatcherInfo = watchers.get(teamId);
        if (newWatcherInfo) {
            handleWatcherError(newWatcherInfo, error as Error);
        }
    }
}




const handleFileChange = (watcherInfo:WatcherInfo,type:FileChange["type"], filePath:string) : void => {
    const relativePath = path.relative(`/var/lib/docker/volumes/team-${watcherInfo.teamId}-volume/_data`,filePath);
    watcherInfo.batchedEvents.push({
        type,
        path: relativePath,
        timestamp: Date.now()
    });
    if(watcherInfo.batchTimeout){
        clearTimeout(watcherInfo.batchTimeout);
    }
    watcherInfo.batchTimeout = setTimeout(() => {
        sendBatchedEvents(watcherInfo);
    },BATCH_DELAY)
}




export const stopWatcher = (teamId:string):void => {
    const watcherInfo = watchers.get(teamId);
    if(!watcherInfo){
        return;
    }
    if(watcherInfo.batchTimeout){
        clearTimeout(watcherInfo.batchTimeout);
        sendBatchedEvents(watcherInfo);
    }
    try {
        watcherInfo.watcher.close();
        console.log(`File watcher stopped for team ${teamId}`);
    } catch (error) {
        console.error(`Error stopping watcher for team ${teamId}:`, error);
    }
    watchers.delete(teamId);
}


const sendBatchedEvents = (watcherInfo: WatcherInfo): void => {
    if(watcherInfo.batchedEvents.length === 0){
        return;
    }
    // grp events by type
    const grouped = {
        added: watcherInfo.batchedEvents.filter((e)=> e.type === "add" || e.type === "addDir").map((e)=> e.path),
        modified: watcherInfo.batchedEvents.filter((e)=> e.type === "change").map((e) => e.path),
        deleted: watcherInfo.batchedEvents.filter((e) => e.type === "unlink" || e.type === "unlinkDir").map((e) => e.path)
    };

    emitToTeam(watcherInfo.teamId, "files:changed",{
        changes: grouped,
        timestamp: Date.now(),
        totalChanges: watcherInfo.batchedEvents.length,
    });
    console.log(`Sent ${watcherInfo.batchedEvents.length} file changes to team ${watcherInfo.teamId}`);
    checkForSpecialEvents(watcherInfo,grouped);
    watcherInfo.batchedEvents = [];
    watcherInfo.batchTimeout = null;
} 


const checkForSpecialEvents = (watcherInfo:WatcherInfo,grouped:{
    added:string[];
    modified:string[];
    deleted:string[]
}):void => {
    const hasNodeModules = grouped.added.some((p) => p.includes("node_modules"));
    if(hasNodeModules){
        emitToTeam(watcherInfo.teamId,"build:dependencies-installed",{ timestamp: Date.now()})
        console.log(`Dependencies installed for team ${watcherInfo.teamId}`);
    }
    const hasBuildFolder = grouped.added.some((p)=> p === "build" || p === "dist" || p === ".next");
    if(hasBuildFolder){
        emitToTeam(watcherInfo.teamId,"build:complete",{timestamp:Date.now()})
        console.log(`Build complete for team ${watcherInfo.teamId}`);
    }

    const packageJsonChanged = [...grouped.added,...grouped.modified].some((p)=> p==="package.json");
    if(packageJsonChanged){
        emitToTeam(watcherInfo.teamId,"package:updated",{timestamp:Date.now()});
    }
}