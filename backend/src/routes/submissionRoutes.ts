import { Router } from "express";
import {
  uploadSubmissionFile,
  getSubmissions,
} from "../controllers/submissionController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/upload", authenticate, uploadSubmissionFile);
router.get("/", authenticate, getSubmissions);

export default router;
