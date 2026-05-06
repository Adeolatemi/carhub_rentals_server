import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prismaClient';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const router = Router();

// Generate 2FA secret and QR code
router.post('/setup', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only allow admins to setup 2FA
    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: '2FA only available for admin accounts' });
    }

    const secret = speakeasy.generateSecret({
      name: `CarHub:${user.email}`,
      length: 20,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Save secret temporarily
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.base32 },
    });

    res.json({
      secret: secret.base32,
      qrCode,
      message: 'Scan the QR code with Google Authenticator',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Verify and enable 2FA
router.post('/verify', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not initialized' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    res.json({ message: '2FA enabled successfully', enabled: true });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Disable 2FA
router.post('/disable', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    res.json({ message: '2FA disabled successfully', enabled: false });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Get 2FA status
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { twoFactorEnabled: true, role: true },
    });

    res.json({
      enabled: user?.twoFactorEnabled || false,
      isAdmin: user?.role === 'SUPERADMIN' || user?.role === 'ADMIN',
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

export default router;