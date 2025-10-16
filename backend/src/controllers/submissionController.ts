import { Response } from "express";
import formidable from "formidable";
import fs from "fs/promises";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prismaClient";
import { uploadSubmission } from "../lib/s3";

export const uploadSubmissionFile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user || !user.teamId) {
    return res.status(401).json({ error: "Unauthorized or no team" });
  }

  const form = formidable({
    maxFileSize: 50 * 1024 * 1024, // 50MB
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: "File upload failed" });
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const fileBuffer = await fs.readFile(uploadedFile.filepath);
      const { s3Key, cdnUrl } = await uploadSubmission(
        user.teamId!,
        uploadedFile.originalFilename || "submission.zip",
        fileBuffer
      );

      const submission = await prisma.submission.create({
        data: {
          teamId: user.teamId!,
          fileName: uploadedFile.originalFilename || "submission.zip",
          filePath: uploadedFile.filepath,
          s3Key,
          cdnUrl,
          status: "UPLOADED",
        },
      });

      await fs.unlink(uploadedFile.filepath).catch(() => {});

      return res.status(201).json({
        submission: {
          id: submission.id,
          fileName: submission.fileName,
          cdnUrl: submission.cdnUrl,
          status: submission.status,
          submittedAt: submission.submittedAt,
        },
      });
    } catch (error) {
      console.error("Error uploading submission:", error);
      return res.status(500).json({ error: "Failed to upload submission" });
    }
  });
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user || !user.teamId) {
    return res.status(401).json({ error: "Unauthorized or no team" });
  }

  try {
    const submissions = await prisma.submission.findMany({
      where: { teamId: user.teamId },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        fileName: true,
        cdnUrl: true,
        status: true,
        submittedAt: true,
      },
    });

    return res.status(200).json({ submissions });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
