import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Generate 2FA secret for a user
export function generateTwoFactorSecret(email: string) {
  const secret = speakeasy.generateSecret({
    name: `CarHub:${email}`,
    length: 20,
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

// Generate QR code data URL for the user to scan
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Verify the 2FA token
export function verifyTwoFactorToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // Allow 1 step window for time drift
  });
}