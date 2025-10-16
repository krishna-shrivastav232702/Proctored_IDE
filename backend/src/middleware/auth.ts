import { Request, Response, NextFunction } from "express";
import { getUserFromRequest, JWTPayload } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = user;
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};
