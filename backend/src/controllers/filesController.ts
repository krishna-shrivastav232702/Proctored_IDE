import { Response } from "express";
import { file, success, z } from "zod";
import { prisma } from "../lib/prismaClient";
import { AuthRequest } from "../middleware/auth";
import { executeCommand } from "../lib/docker";


export const listFiles = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const teamId = req.params.teamId;
  if (!teamId) {
    return res.status(400).json({ error: "Missing teamId" });
  }

  if (user.teamId !== teamId && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const containerInfo = await prisma.containerInfo.findUnique({
      where: { teamId },
    });
    if(!containerInfo){
      return res.status(404).json({ error: "Container not found. Start a session first." });
    }
    const {stdout} = await executeCommand(
      containerInfo.containerId,
      "find /workspace -type f \\( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.json' -o -name '*.md' -o -name '*.html' -o -name '*.css' -o -name '*.vue' -o -name '*.svelte' \\) | head -200"
    )
    const files = stdout.split('\n')
      .filter(path => path.trim())
      .map(path => ({
        path: path.replace('/workspace/', ''),
        updatedAt: new Date()
      }));
    return res.status(200).json({ files });
  } catch (error) {
    console.error("Error listing files:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getFile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamId } = req.params;
  const filePath = req.params[0] || "";

  if (user.teamId !== teamId && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const containerInfo = await prisma.containerInfo.findUnique({
      where: {teamId},
      },
    );

    if (!containerInfo) {
      return res.status(404).json({ error: "File not found" });
    }
    const { stdout } = await executeCommand(
      containerInfo.containerId,
      `cat "/workspace/${filePath}"`
    );

    return res.status(200).json({
      file: {
        path: filePath,
        content: stdout,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const saveFile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamId } = req.params;
  const filePath = req.params[0] || "";

  if (user.teamId !== teamId && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { content } = req.body;

  try {
    const containerInfo = await prisma.containerInfo.findUnique({
      where:{teamId}
    })
    if(!containerInfo){
      return res.status(404).json({error:"Container not found"});
    }
    const base64Content = Buffer.from(content).toString('base64');
    await executeCommand(
      containerInfo.containerId,
      `mkdir -p "/workspace/$(dirname "${filePath}")" && echo '${base64Content}' | base64 -d > "/workspace/${filePath}"`
    )
    await prisma.file.upsert({
      where: {
        teamId_path: {
          teamId,
          path: filePath,
        },
      },
      update: {
        version: {
          increment: 1,
        },
        updatedAt: new Date()
      },
      create: {
        teamId,
        path: filePath,
        content:"",
        version: 1,
      },
    });

    return res.status(200).json({
      success:true,
      file: {
        path: filePath,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteFile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamId } = req.params;
  const filePath =  req.params[0] || "";

  if (user.teamId !== teamId && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const containerInfo = await prisma.containerInfo.findUnique({
      where: { teamId }
    });

    if (!containerInfo) {
      return res.status(404).json({ error: "Container not found" });
    }

    await executeCommand(
      containerInfo.containerId,
      `rm -f "/workspace/${filePath}"`
    );
    await prisma.file.delete({
      where: {
        teamId_path: {
          teamId,
          path: filePath,
        },
      },
    }).catch(() => {
      
    });
    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
  }
};
