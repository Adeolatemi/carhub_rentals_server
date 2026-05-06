import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import multer from "multer";
import healthRouter from "./routes/health";
import authRoutes from "./routes/auth";
import adminRouter from "./routes/admin";
// import vehiclesRouter from "./routes/vehicles";
// import subscriptionsRouter from "./routes/subscriptions";
import ordersRouter from "./routes/orders";
import usersRouter from "./routes/users";
import twoFactorRouter from "./routes/twoFactor";

dotenv.config();

const app = express();

// Middleware
// app.use(cors({ 
//   origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173', 'https://adeolatemi.github.io/carhub_rentals'], 
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// }));
// Updated CORS setup

const allowedOrigins = [
  'http://localhost:5173',
  'https://adeolatemi.github.io',
  'https://carhub-rentals.vercel.app',
  'https://carhub-rentals-git-main-adeolas-projects-722ce927.vercel.app' // Add your specific preview URL
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));



app.use(express.json());
app.use(cookieParser());

// Parse multipart/form-data for file uploads
// app.use(multer().any()); // Disabled for Vercel serverless

// Routes
app.use("/health", healthRouter);
app.use("/auth", authRoutes);
app.use("/admin", adminRouter);
// app.use("/vehicles", vehiclesRouter);
// app.use("/subscriptions", subscriptionsRouter);
app.use("/orders", ordersRouter);
app.use("/users", usersRouter);

// app.use("/uploads", express.static(path.join(process.cwd(), "uploads"))); // No persistent storage in serverless

// Root endpoint
app.get("/", (_req, res) => res.json({ ok: true, service: "carhub-server" }));
// Add this line with your other routes
app.use("/2fa", twoFactorRouter);
export default app;