import { Router } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { prisma } from "../prismaClient";
import bcrypt from "bcrypt";

const router = Router();

// ==================== STATISTICS ====================

// Get admin dashboard statistics
router.get("/stats", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const [totalUsers, totalVehicles, totalOrders, completedOrders, pendingOrders, canceledOrders, totalRevenue, monthlyRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.vehicle.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "CANCELED" } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: "CONFIRMED" } }),
      prisma.order.aggregate({ 
        _sum: { total: true }, 
        where: { 
          status: "CONFIRMED",
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        } 
      }),
    ]);

    res.json({
      totalUsers,
      totalVehicles,
      totalOrders,
      completedOrders,
      pendingOrders,
      canceledOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// ==================== USER MANAGEMENT ====================

// Get all users
router.get("/users", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Add new admin (Super Admin only)
router.post("/admins", authenticate, requireRole(["SUPERADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || "ADMIN",
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    
    res.status(201).json(user);
  } catch (error) {
    console.error("Add admin error:", error);
    res.status(500).json({ error: "Failed to create admin" });
  }
});

// Create partner account
router.post("/partners", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { name, email, password, phone, company } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "PARTNER",
        isActive: true,
        phone,
        company,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, phone: true, company: true },
    });
    
    res.status(201).json(user);
  } catch (error) {
    console.error("Create partner error:", error);
    res.status(500).json({ error: "Failed to create partner" });
  }
});

// Update user role or status
router.patch("/users/:userId", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;
    
    const updateData: any = {};
    if (role) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    
    res.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Reset user password
router.post("/users/:userId/reset-password", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ==================== VEHICLE MANAGEMENT ====================

// Get all vehicles with details
router.get("/vehicles", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(vehicles);
  } catch (error) {
    console.error("Get vehicles error:", error);
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

// Add new vehicle
router.post("/vehicles", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { title, description, dailyRate, imageUrl } = req.body;
    
    const vehicle = await prisma.vehicle.create({
      data: {
        title,
        description,
        dailyRate: parseFloat(dailyRate),
        imageUrl,
        available: true,
      },
    });
    
    res.status(201).json(vehicle);
  } catch (error) {
    console.error("Create vehicle error:", error);
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

// Update vehicle
router.put("/vehicles/:id", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, dailyRate, imageUrl, available } = req.body;
    
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        title,
        description,
        dailyRate: dailyRate ? parseFloat(dailyRate) : undefined,
        imageUrl,
        available,
      },
    });
    
    res.json(vehicle);
  } catch (error) {
    console.error("Update vehicle error:", error);
    res.status(500).json({ error: "Failed to update vehicle" });
  }
});

// Delete vehicle
router.delete("/vehicles/:id", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.vehicle.delete({ where: { id } });
    res.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
});

// Toggle vehicle available status (delist/relist)
router.patch("/vehicles/:id/toggle-status", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    const updated = await prisma.vehicle.update({
      where: { id },
      data: { available: !vehicle?.available },
    });
    res.json(updated);
  } catch (error) {
    console.error("Toggle vehicle status error:", error);
    res.status(500).json({ error: "Failed to update vehicle status" });
  }
});

// ==================== ORDER MANAGEMENT ====================

// Get all orders with details
router.get("/orders", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get recent orders (for dashboard)
router.get("/orders/recent", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      take: 10,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    console.error("Get recent orders error:", error);
    res.status(500).json({ error: "Failed to fetch recent orders" });
  }
});

// Update order status
router.patch("/orders/:orderId", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminNote } = req.body;
    
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(adminNote && { adminNote }),
      },
    });
    
    res.json(order);
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;