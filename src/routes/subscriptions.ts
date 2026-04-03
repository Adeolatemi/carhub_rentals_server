import { Router } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import { createPayment, verifyPayment } from "../services/monnify";
import { prisma } from "../prismaClient";

const router = Router();
const FRONTEND_BASE = process.env.FRONTEND_BASE || "http://localhost:5173";

// Get current subscription
router.get("/me", authenticate, requireRole(["PARTNER"]), async (req: AuthRequest, res) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.user!.id },
    });
    res.json(sub || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Subscribe to a plan
router.post("/subscribe", authenticate, requireRole(["PARTNER"]), async (req: AuthRequest, res) => {
  try {
    const { plan } = req.body;
    if (!["BASIC", "PRO"].includes(plan))
      return res.status(400).json({ error: "Invalid plan. Must be BASIC or PRO" });

    const amount = plan === "BASIC" ? 5000 : 15000;

    // Check if Monnify is configured
    if (!process.env.MONNIFY_API_KEY || !process.env.MONNIFY_CONTRACT_CODE) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }

    const payment = await createPayment({
      amount,
      customerEmail: req.user!.email,
      callbackUrl: `${FRONTEND_BASE}/partner/dashboard`,
    });

    // Create or update subscription record as PENDING
    await prisma.subscription.upsert({
      where: { userId: req.user!.id },
      update: { plan, status: "PENDING", transactionRef: payment.reference },
      create: { userId: req.user!.id, plan, status: "PENDING", transactionRef: payment.reference },
    });

    res.json({ ok: true, paymentUrl: payment.paymentUrl, reference: payment.reference, amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Subscription failed" });
  }
});

// Verify payment and activate subscription
router.post("/verify/:reference", authenticate, async (req: AuthRequest, res) => {
  try {
    const { reference } = req.params;

    const verification = await verifyPayment(reference);

    if (verification.status === "PAID") {
      const sub = await prisma.subscription.findFirst({
        where: { transactionRef: reference },
      });

      if (!sub) return res.status(404).json({ error: "Subscription not found for this reference" });

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "ACTIVE", startDate: new Date(), endDate },
      });

      res.json({ ok: true, status: "ACTIVE" });
    } else {
      res.json({ ok: false, status: verification.status });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
