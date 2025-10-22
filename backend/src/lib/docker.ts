import Docker from "dockerode";
import { prisma } from "./prismaClient";
import { getDockerImage } from "./frameworkTemplate";

const docker = new Docker({
  socketPath: process.env.DOCKER_HOST!,
});

const memoryLimit = process.env.CONTAINER_MEMORY_LIMIT || "512m";
const cpuLimit = parseFloat(process.env.CONTAINER_CPU_LIMIT || "0.5");

export const createContainer = async (
  teamId: string,
  image?: string
): Promise<string> => {
  const existing = await prisma.containerInfo.findUnique({
    where: { teamId },
  });
  if (existing) {
    try {
      const container = docker.getContainer(existing.containerId);
      const info = await container.inspect();
      if (info.State.Running) {
        return existing.containerId;
      }
      await container.start();
      return existing.containerId;
    } catch (error) {
      await prisma.containerInfo.delete({ where: { teamId } });
    }
  }
  const team = await prisma.team.findUnique({
    where:{
      id: teamId
    },
    select:{
      framework:true
    }
  });
  if(!team){
    throw new Error(`Team ${teamId} not found`);
  }
  const framework = team.framework || "NEXTJS";
  const dockerImage = image || getDockerImage(framework);
  console.log(`Creating container for team ${teamId} with framework ${framework}, image: ${dockerImage}`);
  const volumeName = `team-${teamId}-volume`;
  try {
    await docker.createVolume({Name:volumeName});
    console.log(`Created volume ${volumeName}`);
  } catch (error) {
    console.log(`Volume ${volumeName} already exists , reusing it`);
  }

  const envVars = ["TERM=xterm-256color"];
  const nodeFrameworks = ["NEXTJS", "REACT_VITE", "VUE", "ANGULAR", "SVELTE"];
  if (nodeFrameworks.includes(framework)) {
    envVars.push(
      "NODE_ENV=development",
      "NPM_CONFIG_UPDATE_NOTIFIER=false",
      "NPM_CONFIG_CACHE=/workspace/.npm"
    );
  }
  const container = await docker.createContainer({
    Image: dockerImage,
    name: `ide-${teamId}`,
    Tty: true,
    OpenStdin: true,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Cmd: ["/bin/sh"],
    WorkingDir: "/workspace",
    HostConfig: {
      Memory: parseMemory(memoryLimit),
      NanoCpus: cpuLimit * 1e9,
      NetworkMode: "bridge",
      AutoRemove: false,
      Binds: [`${volumeName}:/workspace`],
      StorageOpt: {
        size: "2G"
      },
      PidsLimit: 100,
      Ulimits: [
        { Name: "nofile", Soft: 1024, Hard:1024 },
        { Name: "nproc", Soft: 100, Hard: 100 }
      ]
    },
    Env: envVars,
  });
  await container.start();
  console.log(`Started container ${container.id} for team ${teamId}`);
  await prisma.containerInfo.create({
    data: {
      teamId,
      containerId: container.id,
      status: "running",
    },
  });
  console.log(`Container ${container.id} ready for team ${teamId} with framework ${framework}`);
  return container.id;
};

export const stopContainer = async (teamId: string): Promise<void> => {
  const containerInfo = await prisma.containerInfo.findUnique({
    where: { teamId },
  });
  if (!containerInfo) {
    return;
  }
  try {
    const container = docker.getContainer(containerInfo.containerId);
    await container.stop({ t: 10 });
    await container.remove();
  } catch (error) {
    console.error(`Error stopping container ${containerInfo.containerId} for team ${teamId}:`, error);
  }

  await prisma.containerInfo.update({
    where: {
      teamId,
    },
    data: {
      status: "stopped",
      stoppedAt: new Date(),
    },
  });
};

export const getContainerStatus = async (
  teamId: string
): Promise<{
  running: boolean;
  containerId?: string;
  stats?: any;
}> => {
  const containerInfo = await prisma.containerInfo.findUnique({
    where: { teamId },
  });
  if (!containerInfo) {
    return { running: false };
  }
  try {
    const container = docker.getContainer(containerInfo.containerId);
    const info = await container.inspect();
    const stats = await container.stats({
      stream: false,
    });
    return {
      running: info.State.Running,
      containerId: containerInfo.containerId,
      stats: {
        cpu: calculateCPUPercent(stats),
        memory: {
          usage: stats.memory_stats.usage,
          limit: stats.memory_stats.limit,
          percent: (stats.memory_stats.usage / stats.memory_stats.limit) * 100,
        },
      },
    };
  } catch (error) {
    return {
      running: false,
    };
  }
};

export const executeCommand = async (
  containerId: string,
  command: string,
  timeoutMs: number = 30000
): Promise<{
  stdout: string;
  stderr: string;
}> => {
  const container = docker.getContainer(containerId);
  const exec = await container.exec({
    Cmd: ["/bin/sh", "-c", command],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ Detach: false });
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Command execution timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    stream.on("data", (chunk: Buffer) => {
      const str = chunk.toString();
      if (chunk[0] === 1) {
        stdout += str.slice(8);
      } else if (chunk[0] === 2) {
        stderr += str.slice(8);
      }
    });
    stream.on("end", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ stdout, stderr });
      }
    });
    stream.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
};

export const getContainer = (containerId: string) => {
  return docker.getContainer(containerId);
};

const parseMemory = (memory: string): number => {
  const units: Record<string, number> = {
    b: 1,
    k: 1024,
    m: 1024 * 1024,
    g: 1024 * 1024 * 1024,
  };
  const match = memory.toLowerCase().match(/^(\d+)([bkmg])$/);
  if (!match) return 512 * 1024 * 1024; // default 512 mb
  return parseInt(match[1]) * units[match[2]];
};

const calculateCPUPercent = (stats: any): number => {
  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  if (systemDelta > 0 && cpuDelta > 0) {
    return (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
  }
  return 0;
};
