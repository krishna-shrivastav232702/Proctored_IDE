import { Response } from "express";
import { email, z } from "zod";
import { prisma } from "../lib/prismaClient";
import { AuthRequest } from "../middleware/auth";

const createTeamSchema = z.object({
  name: z.string().min(1).max(50),
  framework: z.enum([
    "NEXTJS",
    "REACT_VITE",
    "VUE", 
    "ANGULAR", 
    "SVELTE", 
    "STATIC_HTML"
  ]).optional().default("NEXTJS"),
});

const inviteSchema = z.object({
  email: z.string().email(),
});

export const createTeam = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = createTeamSchema.parse(req.body);
    // transaction to prevent race condition
    const team = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: {
          id: user.userId
        },
        select:{
          id:true,
          teamId: true,
          email: true,
          name: true
        }
      });
      
      if (existingUser?.teamId) {
        throw new Error("ALREADY_IN_TEAM");
      }

      const existingTeam = await tx.team.findFirst({
        where:{
          name:{
            equals:body.name,
            mode: 'insensitive'
          }
        }
      });

      if(existingTeam){
        throw new Error("TEAM_NAME_EXISTS");
      }

      return await tx.team.create({
        data: {
          name: body.name,
          framework: body.framework,
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
    })

    return res.status(201).json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    //handle specific transaction errors
    if(error instanceof Error){
      if (error.message === "ALREADY IN TEAM") {
        return res.status(400).json({ error: "Already in a team" });
      }
      if (error.message === "TEAM_NAME_EXISTS") {
        return res.status(400).json({ error: "Team name already taken" });
      }
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
          take: 1,//only one single session possible per team
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
    console.error("Error fetching team:",error);
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


    if(!team){
      return res.status(404).json({error:"Team not found"});
    }

    if(team.ownerId !== user.userId){
      return res.status(403).json({
        error:"Only team owner can invite team members"
      })
    }

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

    if(invitedUser.id === user.userId){
      return res.status(400).json({error:"Cannot invite yourself"});
    }

    await prisma.user.update({
      where: { id: invitedUser.id },
      data: {
        teamId: user.teamId,
      },
    });

    return res.status(200).json({ 
      message: "User invited successfully",
      invitedUser:{
        id: invitedUser.id,
        name: invitedUser.name,
        email: invitedUser.email
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error inviting user:",error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
