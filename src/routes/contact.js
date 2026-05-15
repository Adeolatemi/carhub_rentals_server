// // server/src/routes/contact.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { validateEmail } from '../services/email.service.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create contact table in database (run once)
async function ensureContactTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Contact table ready');
  } catch (error) {
    console.error('Contact table error:', error);
  }
}
ensureContactTable();

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Country codes list
const countryCodes = [
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+212", country: "Morocco", flag: "🇲🇦" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
];

// Submit contact form
router.post('/contact/submit', async (req, res) => {
  try {
    const { name, email, phone, phoneCode, subject, message } = req.body;
    const fullPhone = phoneCode ? `${phoneCode}${phone}` : phone || '';

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    // Validate email
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Save to database
    const contact = await prisma.$executeRaw`
      INSERT INTO contact_messages (id, name, email, phone, subject, message, status, created_at)
      VALUES (gen_random_uuid(), ${name}, ${email}, ${fullPhone}, ${subject}, ${message}, 'pending', NOW())
    `;

    // Email to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head><style>body{font-family:Arial,sans-serif;} .container{max-width:600px;margin:0 auto;padding:20px;} .header{background:#0A2342;color:white;padding:20px;text-align:center;} .content{padding:20px;background:#f9f9f9;} .info{margin:10px 0;padding:10px;background:white;border-left:3px solid #F4D35E;}</style></head>
      <body>
        <div class="container">
          <div class="header"><h2>📬 New Contact Form Submission</h2></div>
          <div class="content">
            <div class="info"><strong>Name:</strong> ${name}</div>
            <div class="info"><strong>Email:</strong> ${email}</div>
            <div class="info"><strong>Phone:</strong> ${fullPhone || 'Not provided'}</div>
            <div class="info"><strong>Subject:</strong> ${subject}</div>
            <div class="info"><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"CarHub Contact" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || 'info@carhubrental.com',
      subject: `Contact Form: ${subject}`,
      html: adminEmailHtml,
    });

    // Auto-reply to user
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head><style>body{font-family:Arial,sans-serif;} .container{max-width:600px;margin:0 auto;padding:20px;} .header{background:#0A2342;color:white;padding:20px;text-align:center;} .content{padding:20px;}</style></head>
      <body>
        <div class="container">
          <div class="header"><h2>Thank You for Contacting CarHub!</h2></div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Thank you for reaching out to CarHub Rentals. We have received your message and will get back to you within 24 hours.</p>
            <p><strong>Your message:</strong> "${message}"</p>
            <p>In the meantime, feel free to:</p>
            <ul>
              <li>📞 Call us at <strong>+234 703 168 5999</strong> for urgent inquiries</li>
              <li>🚗 Browse our fleet at <a href="https://carhub-rentals.vercel.app/fleet">carhub-rentals.vercel.app/fleet</a></li>
              <li>💬 Chat with us on WhatsApp: <a href="https://wa.me/2347031685999">Click here</a></li>
            </ul>
            <p>Best regards,<br><strong>The CarHub Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"CarHub Rentals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'We received your message - CarHub Rentals',
      html: userEmailHtml,
    });

    res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

// Get contact messages (admin only)
router.get('/contact/messages', async (req, res) => {
  try {
    const messages = await prisma.$queryRaw`
      SELECT * FROM contact_messages ORDER BY created_at DESC
    `;
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;