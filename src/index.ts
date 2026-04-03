import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import path from "path";
import express from "express";
import { prisma } from "./prismaClient";

const PORT = process.env.PORT || 5000;

// Serve uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ✅ Serve frontend static files (VERY IMPORTANT)
app.use(express.static(path.join(__dirname, "../public")));

// ✅ Handle React/Vite routing (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start server
const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received. Shutting down gracefully...`);

  try {
    await prisma.$disconnect();
    console.log("✅ Prisma disconnected");
  } catch (err) {
    console.error("❌ Error disconnecting Prisma:", err);
  }

  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

// Only in production
if (process.env.NODE_ENV === "production") {
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}