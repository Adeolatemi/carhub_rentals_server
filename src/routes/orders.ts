import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../prismaClient";

const router = Router();

// ✅ POST /orders - Create a new booking
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      pickupLocation,
      dropoffLocation,
      startDate,
      endDate,
      vehicleId,
    } = req.body;

    const userId = req.user!.id;

    // Validate required fields
    if (!fullName || !pickupLocation || !dropoffLocation || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Calculate total amount (example: ₦25,000 per day)
    let total = 25000;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (vehicle) {
        const days = Math.max(1, Math.ceil(
          (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
        ));
        total = vehicle.dailyRate * days;
      }
    }

    // Create the order
    const order = await prisma.order.create({
      data: {
        userId,
        vehicleId: vehicleId || null,
        fullName,
        phone: phone || null,
        email: email || req.user!.email,
        pickupLocation,
        dropoffLocation,
        pickupDate: new Date(startDate),
        dropoffDate: new Date(endDate),
        total,
        status: "PENDING",
      },
    });

    res.status(201).json({ ok: true, order });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ✅ GET /orders/my-orders - Get user's orders
router.get("/my-orders", authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ ok: true, orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;