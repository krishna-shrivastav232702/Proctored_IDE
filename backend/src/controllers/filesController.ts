import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prismaClient";
import { AuthRequest } from "../middleware/auth";

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
    const files = await prisma.file.findMany({
      where: { teamId },
      select: {
        path: true,
        version: true,
        updatedAt: true,
      },
      orderBy: {
        path: "asc",
      },
    });
    return res.status(200).json({ files });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getFile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamId, path } = req.params;
  const filePath = Array.isArray(path) ? path.join("/") : path || "";

  if (user.teamId !== teamId && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const file = await prisma.file.findUnique({
      where: {
        teamId_path: {
          teamId,
          path: filePath,
        },
      },
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    return res.status(200).json({
      file: {
        path: file.path,
        content: file.content,
        version: file.version,
        updatedAt: file.updatedAt,
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

  const { teamId, path } = req.params;
  const filePath = Array.isArray(path) ? path.join("/") : path || "";

  if (user.teamId !== teamId && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { content } = req.body;

  try {
    const file = await prisma.file.upsert({
      where: {
        teamId_path: {
          teamId,
          path: filePath,
        },
      },
      update: {
        content,
        version: {
          increment: 1,
        },
      },
      create: {
        teamId,
        path: filePath,
        content,
      },
    });

    return res.status(200).json({
      file: {
        path: file.path,
        version: file.version,
        updatedAt: file.updatedAt,
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

  const { teamId, path } = req.params;
  const filePath = Array.isArray(path) ? path.join("/") : path || "";

  if (user.teamId !== teamId && user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    await prisma.file.delete({
      where: {
        teamId_path: {
          teamId,
          path: filePath,
        },
      },
    });
    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
  }
};
