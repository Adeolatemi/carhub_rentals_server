// server/src/routes/contact.js
import express from 'express';
import nodemailer from 'nodemailer';
import { validateEmail } from '../services/email.service.js';

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post('/contact/submit', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Email to admin
    const adminEmailContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `;

    // Auto-reply to user
    const userEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0A2342, #1D3557); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Thank You for Contacting CarHub!</h2>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Thank you for reaching out to CarHub Rentals. We have received your message and will get back to you within 24 hours.</p>
            <p><strong>Your message:</strong></p>
            <p><em>"${message}"</em></p>
            <p>In the meantime, feel free to:</p>
            <ul>
              <li>📞 Call us at <strong>+234 703 168 5999</strong> for urgent inquiries</li>
              <li>🚗 Browse our fleet at <a href="https://carhub-rentals.vercel.app/fleet">carhub-rentals.vercel.app/fleet</a></li>
              <li>💬 Chat with us on WhatsApp: <a href="https://wa.me/2347031685999">Click here</a></li>
            </ul>
            <p>We look forward to serving you!</p>
            <p>Best regards,<br><strong>The CarHub Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to admin
    await transporter.sendMail({
      from: `"CarHub Contact" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || 'info@carhubrental.com',
      subject: `Contact Form: ${subject}`,
      html: adminEmailContent,
    });

    // Send auto-reply to user
    await transporter.sendMail({
      from: `"CarHub Rentals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'We received your message - CarHub Rentals',
      html: userEmailContent,
    });

    res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

export default router;