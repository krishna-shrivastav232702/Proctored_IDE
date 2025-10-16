import { Router } from "express";
import {
  startSession,
  endSession,
  getSessionStatus,
} from "../controllers/sessionController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/start", authenticate, startSession);
router.post("/end", authenticate, endSession);
router.get("/:sessionId/status", authenticate, getSessionStatus);

export default router;
