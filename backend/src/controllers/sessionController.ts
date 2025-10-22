import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prismaClient";
import { AuthRequest } from "../middleware/auth";
import { startAutoSnapshot, stopAutoSnapshot } from "../lib/snapshot";
import { watchTeamVolume, stopWatcher } from "../lib/filewatcher";
import { createContainer, getContainerStatus } from "../lib/docker";

const startSessionSchema = z.object({
  teamId: z.string(),
});

export const startSession = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = startSessionSchema.parse(req.body);

    const team = await prisma.team.findUnique({
      where: { id: body.teamId },
      include: {
        members: true,
      },
    });

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const isMember = team.members.some((m: any) => m.id === user.userId);
    if (!isMember && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const activeSession = await prisma.session.findFirst({
      where: {
        teamId: body.teamId,
        active: true,
      },
    });

    if (activeSession) {
      const containerInfo = await prisma.containerInfo.findUnique({
        where:{
          teamId: body.teamId
        }
      })
      return res.status(200).json({
        session: activeSession,
        containerId: containerInfo?.containerId,
        message: "Session already active for this team",
      });
    }

    const session = await prisma.session.create({
      data: {
        teamId: body.teamId,
        userId: user.userId,
        active: true,
      },
    });


    const containerImage = process.env.CONTAINER_IMAGE || "node:18-alpine";
    const containerId = await createContainer(body.teamId, containerImage);

    startAutoSnapshot(body.teamId);
    const volumePath = `/var/lib/docker/volumes/team-${body.teamId}-volume/_data`;
    watchTeamVolume(body.teamId,containerId,volumePath);

    return res.status(201).json({
      session,
      containerId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error starting session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const endSession = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = z.object({ sessionId: z.string() }).parse(req.body);

    const session = await prisma.session.findUnique({
      where: { id: body.sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId !== user.userId && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.session.update({
      where: { id: body.sessionId },
      data: {
        active: false,
        endedAt: new Date(),
      },
    });

    stopAutoSnapshot(session.teamId);
    stopWatcher(session.teamId);
    return res.status(200).json({ message: "Session ended successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getSessionStatus = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const sessionId = req.params.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId" });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        team: {
          include: {
            containerInfo: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId !== user.userId && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const containerStatus = await getContainerStatus(session.teamId);

    return res.status(200).json({
      session: {
        id:session.id,
        teamId: session.teamId,
        userId: session.userId,
        active: session.active,  // From database only
        startedAt: session.startedAt,
        endedAt: session.endedAt
      },
      container: containerStatus,
    });
  } catch (error) {
    console.error("Error getting session status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
