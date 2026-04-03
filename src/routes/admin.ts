// src/routes/admin.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { authenticate, requireRole } from "../middleware/auth";
import { prisma } from "../prismaClient";

const router = Router();

const handleError = (res: Response, err: unknown, message = "Server error") => {
  console.error(err);
  return res.status(500).json({ error: message });
};

// Create Admin user
router.post("/admins", authenticate, requireRole(["SUPERADMIN"]), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: "Missing required fields" });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), password: hashed, name, role: "ADMIN", isActive: true },
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    handleError(res, err);
  }
});

// Create Partner user
router.post("/partners", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: "Missing required fields" });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), password: hashed, name, role: "PARTNER", isActive: true },
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    handleError(res, err);
  }
});

// Enable / Disable user
router.patch("/users/:id/active", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean")
      return res.status(400).json({ error: "isActive must be boolean" });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
    });
    res.json({ id: user.id, isActive: user.isActive });
  } catch (err) {
    handleError(res, err);
  }
});

// List all users
router.get("/users", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    handleError(res, err);
  }
});

// Overview metrics
router.get("/overview", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (_req: Request, res: Response) => {
  try {
    const [totalUsers, totalVehicles, totalOrders, pendingOrders, confirmedOrders, canceledOrders] = await Promise.all([
      prisma.user.count(),
      prisma.vehicle.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "CANCELED" } }),
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueAgg = await prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: thirtyDaysAgo }, status: "CONFIRMED" },
    });

    res.json({
      totalUsers,
      totalVehicles,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      canceledOrders,
      monthlyRevenue: revenueAgg._sum.total || 0,
    });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
