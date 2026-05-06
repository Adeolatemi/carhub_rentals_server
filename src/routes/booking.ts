import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// POST /booking - Create a new booking (with authentication)
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

    const userId = req.user?.id;

    // Basic validation
    if (!fullName || !phone || !pickupLocation || !dropoffLocation || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields", ok: false });
    }

    // Calculate total amount
    const totalAmount = 25000;

    const booking = await prisma.carBooking.create({
      data: {
        fullName,
        phone,
        email,
        pickupLocation,
        dropoffLocation,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalAmount,
        userId,
        ...(vehicleId && { vehicleId }),
      },
    });

    // Return the same format as orders endpoint for consistency
    return res.status(201).json({ ok: true, order: booking });
  } catch (error) {
    console.error("BOOKING ERROR:", error);
    return res.status(500).json({ error: "Booking failed", ok: false });
  }
});

export default router;