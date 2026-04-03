import { Router } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { createPayment as createPaystackPayment } from "../services/paystack";
import { sendEmail } from "../services/notifications";
import { prisma } from "../prismaClient";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

/* ------------------------------------------------ */
/* FILE UPLOAD CONFIG                               */
/* ------------------------------------------------ */

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "orders");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_ROOT),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* ------------------------------------------------ */
/* CREATE ORDER + REDIRECT TO PAYSTACK              */
/* ------------------------------------------------ */

router.post(
  "/request",
  authenticate,
  upload.single("idDocument"),
  async (req: AuthRequest, res) => {
    try {
      const {
        firstName, lastName, email, phone,
        pickupLocation, dropoffLocation,
        pickupDate, pickupTime, dropoffDate, dropoffTime,
        carType, serviceType, driver, passengers, requests,
        vehicleId,
      } = req.body;

      const userId = req.user!.id;
      const userEmail = email || req.user!.email;
      const fullName = `${firstName || ""} ${lastName || ""}`.trim();

      // Calculate total — use vehicle dailyRate if vehicleId provided, else flat rate
      let total = 25000;
      if (vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (vehicle) {
          const days = pickupDate && dropoffDate
            ? Math.max(1, Math.ceil((new Date(dropoffDate).getTime() - new Date(pickupDate).getTime()) / 86400000))
            : 1;
          total = vehicle.dailyRate * days;
        }
      }

      const order = await prisma.order.create({
        data: {
          userId,
          vehicleId: vehicleId || null,
          fullName,
          phone: phone || null,
          email: userEmail,
          carType: carType || null,
          serviceType: serviceType || null,
          driver: driver || null,
          passengers: passengers ? Number(passengers) : null,
          requests: requests || null,
          pickupLocation: pickupLocation || null,
          dropoffLocation: dropoffLocation || null,
          pickupDate: pickupDate ? new Date(pickupDate) : null,
          dropoffDate: dropoffDate ? new Date(dropoffDate) : null,
          pickupTime: pickupTime || null,
          dropoffTime: dropoffTime || null,
          total,
          status: "PENDING",
        },
      });

      // Save uploaded ID document
      if (req.file) {
        await prisma.orderAttachment.create({
          data: {
            orderId: order.id,
            path: `/uploads/orders/${req.file.filename}`,
            type: "idDocument",
          },
        });
      }

      // Initialise Paystack payment
      const callbackUrl = `${process.env.FRONTEND_BASE || "http://localhost:5173"}/booking/confirm?orderId=${order.id}`;

      let authorization_url = null;

      const paystackKey = process.env.PAYSTACK_SECRET_KEY || "";
      if (paystackKey && !paystackKey.includes("your_paystack")) {
        try {
          const payment = await createPaystackPayment({
            amount: total,
            email: userEmail,
            callback_url: callbackUrl,
          });

          await prisma.transaction.create({
            data: {
              orderId: order.id,
              provider: "paystack",
              providerRef: payment.reference,
              amount: total,
            },
          });

          authorization_url = payment.authorization_url;
        } catch (paystackErr) {
          console.error("Paystack init failed:", paystackErr instanceof Error ? paystackErr.message : String(paystackErr));
          // Continue — order is saved, payment can be retried
        }
      }

      // Confirmation email
      try {
        await sendEmail(
          userEmail,
          "Booking Received – CarHub",
          `Hi ${fullName}, your booking #${order.id.slice(0, 8)} has been received. Complete payment to confirm.`,
          `<p>Hi <strong>${fullName}</strong>,</p><p>Your booking <strong>#${order.id.slice(0, 8)}</strong> has been received.</p><p>Please complete payment to confirm your ride.</p>`
        );
      } catch (_) {}

      res.json({
        ok: true,
        orderId: order.id,
        authorization_url: authorization_url || `${process.env.FRONTEND_BASE || "http://localhost:5173"}/booking/confirm?orderId=${order.id}`,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  }
);

/* ------------------------------------------------ */
/* PAYSTACK WEBHOOK — confirm payment               */
/* ------------------------------------------------ */

router.post("/webhooks/paystack", async (req, res) => {
  try {
    const event = req.body;
    if (event.event !== "charge.success") return res.json({ ok: true });

    const ref = event.data.reference;
    const tx = await prisma.transaction.findUnique({ where: { providerRef: ref } });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    await prisma.order.update({
      where: { id: tx.orderId },
      data: { status: "CONFIRMED" },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------ */
/* GET USER'S ORDERS                                */
/* ------------------------------------------------ */

router.get("/my-orders", authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: { attachments: true },
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------ */
/* ADMIN LIST ORDERS                                */
/* ------------------------------------------------ */

router.get(
  "/",
  authenticate,
  requireRole(["SUPERADMIN", "ADMIN", "PARTNER"]),
  async (req: AuthRequest, res) => {
    try {
      const { status, userId, vehicleId } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (vehicleId) where.vehicleId = vehicleId;

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          attachments: true,
          user: { select: { id: true, email: true, name: true } },
        },
      });
      res.json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ------------------------------------------------ */
/* GET ORDER BY ID                                  */
/* ------------------------------------------------ */

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id },
      include: {
        attachments: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.user!.id && !["SUPERADMIN", "ADMIN", "PARTNER"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ------------------------------------------------ */
/* ADMIN UPDATE ORDER STATUS                        */
/* ------------------------------------------------ */

router.patch(
  "/:id/status",
  authenticate,
  requireRole(["SUPERADMIN", "ADMIN", "PARTNER"]),
  async (req: AuthRequest, res) => {
    try {
      const { status, adminNote, canceledReason } = req.body;
      const updated = await prisma.order.update({
        where: { id: req.params.id },
        data: { status, adminNote } as any,
      });
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ------------------------------------------------ */
/* CANCEL ORDER                                     */
/* ------------------------------------------------ */

router.post("/:id/cancel", authenticate, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.user!.id && !["SUPERADMIN", "ADMIN"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    if (order.status !== "PENDING") {
      return res.status(400).json({ error: "Can only cancel pending orders" });
    }
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: "CANCELED", adminNote: req.body.reason || "User requested cancellation" } as any,
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
