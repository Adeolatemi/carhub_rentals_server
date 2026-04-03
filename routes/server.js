import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "carhub-server" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error " + (err.message || "")  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});