// src/routes/users.ts
import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
// import { prisma } from "../prismaClient"; 
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../prismaClient";
import multer from "multer";

const upload = multer();

const router = Router();

// Ensure KYC upload directory exists
const kycDir = path.join(process.cwd(), "uploads", "kyc");
if (!fs.existsSync(kycDir)) {
  fs.mkdirSync(kycDir, { recursive: true });
}

// POST upload KYC document
router.post("/me/kyc", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const files: any[] = (req.files as any) || [];
    if (!files.length || files[0].fieldname !== "document") {
      return res.status(400).json({ error: "No document file provided" });
    }

    const file = files[0];
    const filename = `kyc_${req.user.id}_${Date.now()}_${file.originalname}`;
    const filepath = path.join(kycDir, filename);

    // Save file
    fs.writeFileSync(filepath, file.buffer);

    await prisma.kycHistory.create({
      data: {
        userId: req.user.id,
        filename,
        status: "PENDING"
      }
    });

    // Update user kycFile and status
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        kycFile: filename,
        kycStatus: "PENDING"
      }
    });

    res.json({ 
      success: true, 
      message: "KYC document uploaded successfully",
      filename 
    });
  } catch (err) {
    console.error("KYC upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET current user
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        kycStatus: true,
        kycFile: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
