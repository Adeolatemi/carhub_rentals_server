import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../prismaClient";
import { verifyTwoFactorToken } from '../services/twoFactorService';
import { validateEmail, sendWelcomeEmail, sendAdminNewUserNotification } from '../services/email.service.js';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// Register

// In your register route, add validation:
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, company } = req.body;
    
    // ✅ Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address (e.g., name@example.com)' 
      });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'CUSTOMER',
        phone: phone || null,
        company: company || null,
        isActive: true,
      }
    });
    
    // ✅ Send welcome email (don't await - fire and forget)
    sendWelcomeEmail({ name: user.name, email: user.email }).catch(console.error);
    
    // ✅ Send admin notification (don't await - fire and forget)
    sendAdminNewUserNotification(user).catch(console.error);
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'Registration successful! Welcome email sent.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, role, company } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    });
    
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashed,
        role: role === "PARTNER" ? "PARTNER" : "CUSTOMER",
        isActive: true,
        phone: phone || null,
        company: company || null,
      },
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    });
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account disabled" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Return requires2FA flag instead of token
      return res.json({
        requires2FA: true,
        userId: user.id,
        message: '2FA verification required',
      });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify 2FA after login
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const isValid = verifyTwoFactorToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }
    
    const jwtToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    
    res.json({
      ok: true,
      token: jwtToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true, message: "Logged out successfully" });
});

// Get current user
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, twoFactorEnabled: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, user });
  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } 
});

export default router;