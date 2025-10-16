import { Router } from "express";
import { createTeam, getTeam, inviteToTeam } from "../controllers/teamController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/create", authenticate, createTeam);
router.get("/:teamId", authenticate, getTeam);
router.post("/invite", authenticate, inviteToTeam);

export default router;
