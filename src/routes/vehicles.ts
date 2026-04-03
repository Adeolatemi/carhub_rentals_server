import { Router } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { prisma } from "../prismaClient";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "vehicles");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_ROOT),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Create vehicle
router.post(
  "/",
  authenticate,
  requireRole(["SUPERADMIN", "ADMIN", "PARTNER"]),
  upload.single("image"),
  async (req: AuthRequest, res) => {
    try {
      const { title, description, dailyRate, category } = req.body;
      if (!title || !dailyRate)
        return res.status(400).json({ error: "Title and daily rate are required" });

      if (isNaN(Number(dailyRate)) || Number(dailyRate) <= 0)
        return res.status(400).json({ error: "Daily rate must be a positive number" });

      let categoryId: string | undefined;
      if (category) {
        const cat = await prisma.vehicleCategory.upsert({
          where: { name: category },
          update: {},
          create: { name: category },
        });
        categoryId = cat.id;
      }

      const imageUrl = req.file ? `/uploads/vehicles/${req.file.filename}` : null;

      const vehicle = await prisma.vehicle.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          dailyRate: Number(dailyRate),
          categoryId: categoryId || null,
          ownerId: req.user!.id,
          imageUrl,
          available: true,
        },
      });

      res.status(201).json(vehicle);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// List vehicles — public, but ?my=true requires auth
router.get("/", async (req: AuthRequest, res) => {
  try {
    const { q, available, my } = req.query as any;
    const where: any = {};

    if (my === "true") {
      // Require auth for own vehicles
      let token: string | undefined;
      const auth = req.headers.authorization;
      if (auth) {
        const parts = auth.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") token = parts[1];
      }
      if (!token && req.cookies?.token) token = req.cookies.token;
      if (!token) return res.status(401).json({ error: "Authentication required" });
      const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (!user || !user.isActive) return res.status(401).json({ error: "Invalid token or user inactive" });
      req.user = user;
      where.ownerId = req.user.id;
    }

    if (q) where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
    if (available !== undefined) where.available = available === "true";

    const list = await prisma.vehicle.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get vehicle by id
router.get("/:id", async (req, res) => {
  try {
    const v = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!v) return res.status(404).json({ error: "Vehicle not found" });
    res.json(v);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Toggle availability (delist/relist)
router.patch(
  "/:id/delist",
  authenticate,
  requireRole(["SUPERADMIN", "ADMIN", "PARTNER"]),
  async (req: AuthRequest, res) => {
    try {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

      if (vehicle.ownerId !== req.user!.id && !["SUPERADMIN", "ADMIN"].includes(req.user!.role)) {
        return res.status(403).json({ error: "Forbidden — not your vehicle" });
      }

      const updated = await prisma.vehicle.update({
        where: { id: req.params.id },
        data: { available: !vehicle.available },
      });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
