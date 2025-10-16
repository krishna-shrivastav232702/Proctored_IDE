import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prismaClient";
import { signToken } from "../lib/jwt";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(3),
  teamName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const signup = async (req: Request, res: Response) => {
  try {
    const parsedBody = signupSchema.parse(req.body);
    const { email, password, name, teamName } = parsedBody;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    let team = null;
    if (teamName) {
      team = await prisma.team.create({
        data: {
          name: teamName,
          ownerId: user.id,
          members: {
            connect: { id: user.id },
          },
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { teamId: team.id },
      });
    }

    const token = signToken(
      {
        userId: user.id,
        email: user.email,
        role: "PARTICIPANT",
        teamId: team?.id || undefined,
      },
      {}
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "PARTICIPANT",
        team,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error("Error signing up", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsedBody = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: parsedBody.email },
      include: {
        team: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    const passwordValid = await bcrypt.compare(
      parsedBody.password,
      user.password
    );
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    const token = signToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        teamId: user.teamId || undefined,
      },
      {}
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
