import { Router } from "express";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prismaClient";
import { askGemini } from "../lib/gemini"
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter: max 10 requests per minute per user
const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: "Too many AI requests. Please wait a minute before trying again." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: AuthRequest) => req.user?.userId || req.ip || "anonymous",
});

// Helper function to atomically increment and check AI usage
const incrementAndCheckAiUsage = async (teamId: string): Promise<{ allowed: boolean; currentCount: number; maxHints: number }> => {
    const maxHints = parseInt(process.env.AI_MAX_HINTS_PER_TEAM || "3");
    const cacheKey = `ai:usage:${teamId}`;

    // Atomically increment the counter
    const newCount = await redis.incr(cacheKey);

    // Set expiry on first use (24 hours, or until competition ends)
    if (newCount === 1) {
        await redis.expire(cacheKey, 24 * 60 * 60);
    }

    // Check if limit exceeded
    if (newCount > maxHints) {
        // Rollback the increment (decrement back)
        await redis.decr(cacheKey);
        return { allowed: false, currentCount: maxHints, maxHints };
    }

    return { allowed: true, currentCount: newCount, maxHints };
};

// Helper function to get current AI usage count
const getAiUsageCount = async (teamId: string): Promise<number> => {
    const cacheKey = `ai:usage:${teamId}`;
    const count = await redis.get(cacheKey);
    return count ? parseInt(count as string) : 0;
};

// Sanitize and validate prompt
const sanitizePrompt = (prompt: string): { valid: boolean; sanitized: string; error?: string } => {
    if (!prompt || typeof prompt !== 'string') {
        return { valid: false, sanitized: '', error: "Prompt is required" };
    }

    const trimmed = prompt.trim();

    if (trimmed.length < 10) {
        return { valid: false, sanitized: '', error: "Prompt must be at least 10 characters" };
    }

    if (trimmed.length > 2000) {
        return { valid: false, sanitized: '', error: "Prompt too long (maximum 2000 characters)" };
    }

    // Basic sanitization (remove potential HTML/script tags for storage)
    const sanitized = trimmed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .substring(0, 2000);

    return { valid: true, sanitized };
};

// Check if team can use AI
router.get("/check", authenticate, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user || !user.teamId) {
        return res.status(401).json({ error: "Unauthorized or no team" });
    }

    try {
        const usageCount = await getAiUsageCount(user.teamId);
        const maxHints = parseInt(process.env.AI_MAX_HINTS_PER_TEAM || "3");
        const canUse = usageCount < maxHints;

        return res.json({
            canUse,
            usageCount,
            maxHints,
            remaining: maxHints - usageCount
        });
    } catch (error) {
        console.error("Error checking AI usage:", error);
        return res.status(500).json({ error: "Failed to check AI usage" });
    }
});

// Submit AI request with rate limiting
router.post("/ask", authenticate, aiRateLimiter, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user || !user.teamId) {
        return res.status(401).json({ error: "Unauthorized or no team" });
    }

    try {
        const { prompt, context } = req.body;

        // Validate and sanitize prompt
        const validation = sanitizePrompt(prompt);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Atomically increment and check usage (prevents race condition)
        const usageCheck = await incrementAndCheckAiUsage(user.teamId);

        if (!usageCheck.allowed) {
            const currentCount = await getAiUsageCount(user.teamId);
            return res.status(429).json({
                error: `AI usage limit reached. You have used ${currentCount}/${usageCheck.maxHints} hints.`,
                usageCount: currentCount,
                maxHints: usageCheck.maxHints,
                remaining: 0
            });
        }

        // Get team framework for context-aware AI responses
        const team = await prisma.team.findUnique({
            where: { id: user.teamId },
            select: { framework: true }
        });

        // Call Gemini AI
        let aiResponse: string;
        let tokensUsed = 0;

        try {
            const result = await askGemini({
                prompt: validation.sanitized,
                framework: team?.framework || "NEXTJS",
                context: context ? {
                    fileName: context.fileName,
                    code: context.code,
                    errorMessage: context.errorMessage
                } : undefined
            });

            aiResponse = result.response;
            tokensUsed = result.tokensUsed || 0;
        } catch (aiError: any) {
            console.error("AI generation error:", aiError);

            // If AI fails, rollback the usage increment
            await redis.decr(`ai:usage:${user.teamId}`);

            return res.status(503).json({
                error: aiError.message || "AI service temporarily unavailable. Your hint has not been used. Please try again.",
                usageCount: usageCheck.currentCount - 1,
                remaining: usageCheck.maxHints - (usageCheck.currentCount - 1)
            });
        }

        // Log to database
        await prisma.aIUsage.create({
            data: {
                teamId: user.teamId,
                prompt: validation.sanitized,
                response: aiResponse,
            },
        });

        const remaining = usageCheck.maxHints - usageCheck.currentCount;

        return res.json({
            response: aiResponse,
            usageCount: usageCheck.currentCount,
            remaining,
            maxHints: usageCheck.maxHints,
            tokensUsed
        });
    } catch (error: any) {
        console.error("Error processing AI request:", error);
        return res.status(500).json({ error: "Failed to process AI request" });
    }
});

// Get AI usage history for current team
router.get("/history", authenticate, async (req: AuthRequest, res) => {
    const user = req.user;
    if (!user || !user.teamId) {
        return res.status(401).json({ error: "Unauthorized or no team" });
    }

    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

        const usage = await prisma.aIUsage.findMany({
            where: { teamId: user.teamId },
            orderBy: { usedAt: "desc" },
            take: limit,
            select: {
                id: true,
                prompt: true,
                response: true,
                usedAt: true
            }
        });

        return res.json({ usage });
    } catch (error) {
        console.error("Error fetching AI history:", error);
        return res.status(500).json({ error: "Failed to get AI history" });
    }
});

// Get AI usage for specific team (admin only)
router.get("/usage/:teamId", authenticate, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

        const usage = await prisma.aIUsage.findMany({
            where: { teamId },
            orderBy: { usedAt: "desc" },
            take: limit,
        });

        const usageCount = await getAiUsageCount(teamId);
        const maxHints = parseInt(process.env.AI_MAX_HINTS_PER_TEAM || "3");

        return res.json({
            usage,
            stats: {
                usageCount,
                maxHints,
                remaining: maxHints - usageCount
            }
        });
    } catch (error) {
        console.error("Error fetching AI usage:", error);
        return res.status(500).json({ error: "Failed to get AI usage" });
    }
});

// Reset AI usage for a team (admin only, for testing or special cases)
router.post("/reset/:teamId", authenticate, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const { teamId } = req.params;

        await redis.del(`ai:usage:${teamId}`);

        console.log(`Admin ${req.user?.email} reset AI usage for team ${teamId}`);

        return res.json({ message: "AI usage reset successfully" });
    } catch (error) {
        console.error("Error resetting AI usage:", error);
        return res.status(500).json({ error: "Failed to reset AI usage" });
    }
});

export default router;