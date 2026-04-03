import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prismaClient";
import { User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET not defined in environment (.env)");
}

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Support both Bearer token (header) and cookie-based auth
    let token: string | undefined;
    const auth = req.headers.authorization;
    if (auth) {
      const parts = auth.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") token = parts[1];
    }
    if (!token && req.cookies?.token) token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Missing authorization" });
    const payload: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) return res.status(401).json({ error: "Invalid token or user inactive" });
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const requireRole = (roles: Array<string>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
};
