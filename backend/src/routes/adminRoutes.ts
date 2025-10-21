import { Router } from "express";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prismaClient";
import { getTeamViolations } from "../realTimeServerUtilities/proctoring";
import { getContainerStats } from "../containerMonitoring/Monitoring";
import { stopContainer, createContainer } from "../lib/docker";

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get all teams with their status
router.get("/teams", async (req: AuthRequest, res) => {
    try {
        const teams = await prisma.team.findMany({
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
                members: {
                    select: { id: true, name: true, email: true },
                },
                containerInfo: true,
                sessions: {
                    where: { active: true },
                    take: 1,
                },
                submissions: {
                    orderBy: { submittedAt: "desc" },
                    take: 1,
                },
                _count: {
                    select: {
                        submissions: true,
                        sessions: true,
                        files: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Enrich with container stats
        const enrichedTeams = await Promise.all(
            teams.map(async (team) => {
                let containerStats = null;

                if (team.containerInfo?.containerId) {
                    containerStats = await getContainerStats(team.containerInfo.containerId);
                }

                return {
                    ...team,
                    containerStats,
                };
            })
        );

        return res.json({ teams: enrichedTeams });
    } catch (error) {
        console.error("Error fetching teams:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get specific team details
router.get("/teams/:teamId", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;

        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
                members: {
                    select: { id: true, name: true, email: true, createdAt: true },
                },
                containerInfo: true,
                sessions: {
                    orderBy: { startedAt: "desc" },
                    take: 10,
                },
                submissions: {
                    orderBy: { submittedAt: "desc" },
                },
                files: {
                    select: { path: true, version: true, updatedAt: true },
                    orderBy: { updatedAt: "desc" },
                    take: 20,
                },
            },
        });

        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        // Get violations
        const violations = await getTeamViolations(teamId);

        // Get container stats
        let containerStats = null;
        if (team.containerInfo?.containerId) {
            containerStats = await getContainerStats(team.containerInfo.containerId);
        }

        return res.json({
            team: {
                ...team,
                violations,
                containerStats,
            },
        });
    } catch (error) {
        console.error("Error fetching team details:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get proctoring events feed (recent events across all teams)
router.get("/proctoring/events", async (req: AuthRequest, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;

        const events = await prisma.proctorEvent.findMany({
            take: limit,
            orderBy: { timestamp: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        teamId: true,
                    },
                },
            },
        });

        return res.json({ events });
    } catch (error) {
        console.error("Error fetching proctoring events:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get team violations
router.get("/proctoring/violations/:teamId", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;
        const violations = await getTeamViolations(teamId);

        return res.json({ violations });
    } catch (error) {
        console.error("Error fetching violations:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get all ProctorEvents from database for a specific team
router.get("/proctoring/events/:teamId", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit as string) || 100;

        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: {
                    select: { id: true },
                },
            },
        });

        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        const memberIds = team.members.map((m) => m.id);

        const events = await prisma.proctorEvent.findMany({
            where: {
                userId: { in: memberIds },
            },
            take: limit,
            orderBy: { timestamp: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return res.json({ events });
    } catch (error) {
        console.error("Error fetching team events:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Restart container
router.post("/containers/:teamId/restart", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;

        const containerInfo = await prisma.containerInfo.findUnique({
            where: { teamId },
        });

        if (!containerInfo) {
            return res.status(404).json({ error: "Container not found" });
        }

        // Stop existing container
        await stopContainer(teamId);

        // Create new container
        const containerImage = process.env.CONTAINER_IMAGE || "node:18-alpine";
        const containerId = await createContainer(teamId, containerImage);

        return res.json({
            message: "Container restarted successfully",
            containerId,
        });
    } catch (error) {
        console.error("Error restarting container:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Stop container
router.post("/containers/:teamId/stop", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;

        await stopContainer(teamId);

        return res.json({ message: "Container stopped successfully" });
    } catch (error) {
        console.error("Error stopping container:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get container metrics
router.get("/containers/:teamId/stats", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;

        const containerInfo = await prisma.containerInfo.findUnique({
            where: { teamId },
        });

        if (!containerInfo) {
            return res.status(404).json({ error: "Container not found" });
        }

        const stats = await getContainerStats(containerInfo.containerId);

        return res.json({ stats });
    } catch (error) {
        console.error("Error fetching container stats:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Disqualify team
router.post("/teams/:teamId/disqualify", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;
        const { reason } = req.body;

        // Stop container
        await stopContainer(teamId);

        // End all active sessions
        await prisma.session.updateMany({
            where: { teamId, active: true },
            data: { active: false, endedAt: new Date() },
        });

        // Log the disqualification as a proctor event
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { ownerId: true },
        });

        if (team) {
            await prisma.proctorEvent.create({
                data: {
                    userId: team.ownerId,
                    eventType: "SUSPICIOUS_ACTIVITY",
                    details: JSON.stringify({ reason, action: "DISQUALIFIED" }),
                },
            });
        }

        console.log(`Team ${teamId} disqualified. Reason: ${reason}`);

        return res.json({ message: "Team disqualified successfully" });
    } catch (error) {
        console.error("Error disqualifying team:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get system statistics
router.get("/stats", async (req: AuthRequest, res) => {
    try {
        const [
            totalTeams,
            activeSessions,
            totalSubmissions,
            activeContainers,
            totalUsers,
        ] = await Promise.all([
            prisma.team.count(),
            prisma.session.count({ where: { active: true } }),
            prisma.submission.count(),
            prisma.containerInfo.count({ where: { status: "running" } }),
            prisma.user.count(),
        ]);

        const recentEvents = await prisma.proctorEvent.count({
            where: {
                timestamp: {
                    gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
                },
            },
        });

        // Get recent submissions (last 24 hours)
        const recentSubmissions = await prisma.submission.count({
            where: {
                submittedAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
        });

        return res.json({
            stats: {
                totalTeams,
                totalUsers,
                activeSessions,
                totalSubmissions,
                recentSubmissions,
                activeContainers,
                recentProctorEvents: recentEvents,
            },
        });
    } catch (error) {
        console.error("Error fetching system stats:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get all terminal logs for a team
router.get("/terminals/:teamId", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit as string) || 100;

        const logs = await prisma.terminalLog.findMany({
            where: { teamId },
            orderBy: { timestamp: "desc" },
            take: limit,
        });

        return res.json({ logs });
    } catch (error) {
        console.error("Error fetching terminal logs:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get AI usage for a team
router.get("/ai-usage/:teamId", async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const aiUsage = await prisma.aIUsage.findMany({
            where: { teamId },
            orderBy: { usedAt: "desc" },
            take: limit,
        });

        return res.json({ aiUsage });
    } catch (error) {
        console.error("Error fetching AI usage:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
