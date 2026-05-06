import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyPayment } from "../services/paystack";

const prisma = new PrismaClient();
const router = Router();

router.post("/webhook", async (req, res) => {
  try {
    const event = req.body;
    if (event.event !== 'charge.success') return res.json({ ok: true });

    const ref = event.data.reference;
    const paymentData = await verifyPayment(ref);

    if (paymentData.status === 'success') {
      const tx = await prisma.transaction.findUnique({
        where: { providerRef: ref },
      });

      if (tx) {
        await prisma.carBooking.update({
          where: { id: tx.orderId },
          data: { status: "CONFIRMED" },
        });
      }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

