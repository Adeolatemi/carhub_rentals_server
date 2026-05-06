import { Router } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { prisma } from "../prismaClient";
import bcrypt from "bcrypt";

const router = Router();

// ==================== STATISTICS ====================
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

// ==================== BOOKINGS ====================
router.get("/bookings", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const bookings = await prisma.carBooking.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.patch("/bookings/:id", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await prisma.carBooking.update({
      where: { id },
      data: { status },
    });
    res.json(booking);
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// ==================== ORDERS ====================
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

router.get("/orders/:id", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        vehicle: { select: { id: true, title: true, dailyRate: true } },
      },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.patch("/orders/:orderId", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminNote } = req.body;
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status, adminNote },
    });
    res.json(order);
  } catch (error) {
    console.error("Update order error:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// ==================== USERS ====================
router.get("/users", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

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
      data: { name, email: email.toLowerCase(), password: hashedPassword, role: role || "ADMIN", isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.status(201).json(user);
  } catch (error) {
    console.error("Add admin error:", error);
    res.status(500).json({ error: "Failed to create admin" });
  }
});

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
      data: { name, email: email.toLowerCase(), password: hashedPassword, role: "PARTNER", isActive: true, phone, company },
      select: { id: true, name: true, email: true, role: true, isActive: true, phone: true, company: true },
    });
    res.status(201).json(user);
  } catch (error) {
    console.error("Create partner error:", error);
    res.status(500).json({ error: "Failed to create partner" });
  }
});

// ==================== VEHICLES ====================
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

// Add this endpoint to your admin.ts file
router.get("/bookings", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const bookings = await prisma.carBooking.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.post("/vehicles", authenticate, requireRole(["SUPERADMIN", "ADMIN"]), async (req: AuthRequest, res) => {
  try {
    const { title, description, dailyRate, imageUrl } = req.body;
    const vehicle = await prisma.vehicle.create({
      data: { title, description, dailyRate: parseFloat(dailyRate), imageUrl, available: true },
    });
    res.status(201).json(vehicle);
  } catch (error) {
    console.error("Create vehicle error:", error);
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

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

export default router;