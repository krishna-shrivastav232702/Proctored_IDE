import { Router } from "express";
import {
  listFiles,
  getFile,
  saveFile,
  deleteFile,
} from "../controllers/filesController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/:teamId/list", authenticate, listFiles);
router.get("/:teamId/*", authenticate, getFile);
router.post("/:teamId/*", authenticate, saveFile);
router.delete("/:teamId/*", authenticate, deleteFile);

export default router;
