import { Router } from "express";
import path from "path";
import fs from "fs";
import { authenticate, AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");

/**
 * GET /:id/kyc-file
 * Secure route to fetch a user's KYC file
 */
router.get("/:id/kyc-file", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;

    // Only admin or owner can access
    const isAdmin = ["ADMIN", "SUPERADMIN"].includes(req.user!.role);
    const isOwner = req.user!.id === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycFile: true },
    });

    if (!user || !user.kycFile) {
      return res.status(404).json({ error: "KYC file not found" });
    }

    const filePath = path.join(uploadDir, path.basename(user.kycFile));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File missing on server" });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
