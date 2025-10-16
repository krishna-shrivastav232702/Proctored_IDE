import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prismaClient";
import { AuthRequest } from "../middleware/auth";

const createTeamSchema = z.object({
  name: z.string().min(1),
});

const inviteSchema = z.object({
  email: z.string().email(),
});

export const createTeam = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Login and try again" });
  }

  try {
    const body = createTeamSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({
      where: {
        id: user.userId,
      },
      include: {
        team: true,
      },
    });

    if (existingUser?.teamId) {
      return res.status(400).json({ error: "Already in a team" });
    }

    const team = await prisma.team.create({
      data: {
        name: body.name,
        owner: { connect: { id: user.userId } },
        members: {
          connect: { id: user.userId },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(200).json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTeam = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const teamId = req.params.teamId;
  if (!teamId) {
    return res.status(400).json({ error: "Missing Teamid" });
  }

  try {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        sessions: {
          where: {
            active: true,
          },
          orderBy: {
            startedAt: "desc",
          },
          take: 10,
        },
        containerInfo: true,
      },
    });

    if (!team) {
      return res.status(404).json({ error: "team not found" });
    }

    const isMember = team.members.some((m: any) => m.id === user.userId);
    const isAdmin = user.role === "ADMIN";

    if (!isMember && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json({ team });
  } catch (error) {
    return res.status(500).json({ error: "internal server error" });
  }
};

export const inviteToTeam = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user || !user.teamId) {
    return res.status(401).json({ error: "Unauthorized or no team" });
  }

  try {
    const body = inviteSchema.parse(req.body);
    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      include: {
        members: true,
      },
    });

    const maxTeamSize = parseInt(process.env.MAX_TEAM_SIZE || "4");
    if (team && team.members.length >= maxTeamSize) {
      return res.status(400).json({ error: "Team is full" });
    }

    const invitedUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!invitedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (invitedUser.teamId) {
      return res.status(400).json({ error: "User already in a team" });
    }

    await prisma.user.update({
      where: { id: invitedUser.id },
      data: {
        teamId: user.teamId,
      },
    });

    return res.status(200).json({ message: "User invited successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
