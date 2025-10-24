import { Router } from "express";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";
import { getBuildStatus, cancelBuild, getQueueStats, addBuildJob, getQueuePosition } from "../realTimeServerUtilities/buildQueue";
import { prisma } from "../lib/prismaClient";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Queue } from "bullmq";
import { getBuildCommand } from "../lib/frameworkTemplate";

const router = Router();

// Rate limiter: max 5 builds per 5 minutes per team
const buildRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5,
    message: { error: "Too many build requests. Please wait before trying again." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: AuthRequest) => req.user?.teamId || 'no-team',
});

// Build queue instance (read-only for checking status) 
const buildQueue = new Queue("build-queue", {
    connection: {
        host: process.env.UPSTASH_REDIS_HOST!,
        port: parseInt(process.env.UPSTASH_REDIS_PORT || "6379"),
        password: process.env.UPSTASH_REDIS_PASSWORD,
        tls: process.env.UPSTASH_REDIS_TLS === "true" ? {} : undefined,
    }
});

// Helper function to check if team has active build
const hasActiveBuild = async (teamId: string): Promise<boolean> => {
    const [activeJobs, waitingJobs] = await Promise.all([
        buildQueue.getActive(),
        buildQueue.getWaiting()
    ]);

    return [...activeJobs, ...waitingJobs].some(
        job => job.data.teamId === teamId
    );
};

// Start build for team
router.post("/start", authenticate, buildRateLimiter, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user || !user.teamId) {
        return res.status(401).json({ error: "Unauthorized or no team" });
    }

    try {
        // Check if team already has an active build
        const alreadyBuilding = await hasActiveBuild(user.teamId);
        if (alreadyBuilding) {
            return res.status(409).json({
                error: "You already have a build in progress. Please wait for it to complete."
            });
        }

        const containerInfo = await prisma.containerInfo.findUnique({
            where: { teamId: user.teamId }
        });

        if (!containerInfo) {
            return res.status(404).json({ error: "Container not found. Start a session first." });
        }

        // Get team framework for build command
        const team = await prisma.team.findUnique({
            where: { id: user.teamId },
            select: { framework: true }
        });

        // Use framework-specific build command if not provided
        const buildCommand = req.body.buildCommand || getBuildCommand(team?.framework || "NEXTJS");

        // Add to build queue using the worker's queue instance
        const job = await addBuildJob({
            teamId: user.teamId,
            containerId: containerInfo.containerId,
            buildCommand
        });

        // Get accurate queue position
        const position = await getQueuePosition(job.id.toString());

        return res.json({
            jobId: job.id,
            position,
            framework: team?.framework || "NEXTJS",
            buildCommand,
            message: position > 1
                ? `Build queued successfully. Position in queue: ${position}`
                : "Build started"
        });

    } catch (error) {
        console.error("Error starting build:", error);
        return res.status(500).json({ error: "Failed to start build" });
    }
});

// Get build status
router.get("/status/:jobId", authenticate, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user || !user.teamId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { jobId } = req.params;
        const status = await getBuildStatus(jobId);

        if (!status) {
            return res.status(404).json({ error: "Build job not found" });
        }

        // Verify ownership (unless admin)
        if (status.data.teamId !== user.teamId && user.role !== "ADMIN") {
            return res.status(403).json({ error: "Cannot view another team's build status" });
        }

        return res.json({ status });
    } catch (error) {
        console.error("Error getting build status:", error);
        return res.status(500).json({ error: "Failed to get build status" });
    }
});

// Cancel build
router.delete("/:jobId", authenticate, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user || !user.teamId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { jobId } = req.params;

        // Get job details first to verify ownership
        const status = await getBuildStatus(jobId);

        if (!status) {
            return res.status(404).json({ error: "Build job not found" });
        }

        // Verify ownership (unless admin)
        if (status.data.teamId !== user.teamId && user.role !== "ADMIN") {
            return res.status(403).json({ error: "Cannot cancel another team's build" });
        }

        const cancelled = await cancelBuild(jobId);

        if (!cancelled) {
            return res.status(400).json({ error: "Cannot cancel active build. Build is currently running." });
        }

        return res.json({ message: "Build cancelled successfully" });
    } catch (error) {
        console.error("Error cancelling build:", error);
        return res.status(500).json({ error: "Failed to cancel build" });
    }
});

// Get current team's build queue position
router.get("/queue/position", authenticate, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user || !user.teamId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // Find team's active or waiting build
        const [activeJobs, waitingJobs] = await Promise.all([
            buildQueue.getActive(),
            buildQueue.getWaiting()
        ]);

        const teamJob = [...activeJobs, ...waitingJobs].find(
            job => job.data.teamId === user.teamId
        );

        if (!teamJob) {
            return res.json({
                hasActiveBuild: false,
                message: "No active build"
            });
        }

        const position = await getQueuePosition(teamJob.id?.toString() || "");
        const state = await teamJob.getState();

        return res.json({
            hasActiveBuild: true,
            jobId: teamJob.id,
            position,
            state,
            isActive: state === "active"
        });
    } catch (error) {
        console.error("Error getting queue position:", error);
        return res.status(500).json({ error: "Failed to get queue position" });
    }
});

// Get queue statistics (admin only)
router.get("/queue/stats", authenticate, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const stats = await getQueueStats();
        return res.json({ stats });
    } catch (error) {
        console.error("Error getting queue stats:", error);
        return res.status(500).json({ error: "Failed to get queue stats" });
    }
});

export default router;