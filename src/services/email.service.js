// server/src/services/email.service.js
import nodemailer from 'nodemailer';
import validator from 'validator';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email validation function
export const validateEmail = (email) => {
  if (!email) return false;
  return validator.isEmail(email, {
    allow_display_name: false,
    require_tld: true,
    allow_utf8_local_part: true,
    require_rfc6535: true,
  });
};

// Welcome email template
export const sendWelcomeEmail = async (user) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0A2342, #1D3557); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #F4D35E; color: #0A2342; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗 Welcome to CarHub!</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.name || user.email}!</h2>
          <p>Thank you for joining CarHub - your trusted partner for premium car rentals in Lagos!</p>
          <p>With your CarHub account, you can:</p>
          <ul>
            <li>🚘 Browse our extensive fleet of vehicles</li>
            <li>📅 Book cars instantly for any duration</li>
            <li>⭐ Save your favorite vehicles</li>
            <li>📱 Track your booking history</li>
            <li>💳 Make secure online payments</li>
          </ul>
          <p>Ready to hit the road? Start exploring our fleet now!</p>
          <a href="${process.env.FRONTEND_URL || 'https://carhub-rentals.vercel.app'}/fleet" class="button">Browse Fleet</a>
          <p style="margin-top: 20px;">Need help? Contact our support team at <strong>support@carhub.com</strong> or call us at <strong>+234 703 168 5999</strong>.</p>
        </div>
        <div class="footer">
          <p>© 2024 CarHub Rentals. All rights reserved.</p>
          <p>Lagos, Nigeria</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"CarHub Rentals" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: '🚗 Welcome to CarHub! Your Journey Begins Here',
    html: htmlContent,
    text: `Welcome to CarHub! Thank you for joining us. You can now browse our fleet and book cars for your trips. Visit our website to get started.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}`);
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${user.email}:`, error.message);
  }
};

// Newsletter subscription confirmation email
export const sendNewsletterConfirmation = async (email) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0A2342, #1D3557); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Newsletter Subscription Confirmed!</h1>
        </div>
        <div class="content">
          <h2>Thank you for subscribing!</h2>
          <p>You've successfully subscribed to the CarHub newsletter.</p>
          <p>You'll receive:</p>
          <ul>
            <li>🎉 Exclusive offers and discounts</li>
            <li>🚗 New vehicle arrivals</li>
            <li>💡 Travel tips and local guides</li>
            <li>🏆 Special promotions for subscribers only</li>
          </ul>
          <p>Stay tuned for exciting updates from CarHub!</p>
          <p style="margin-top: 20px;">Best regards,<br><strong>The CarHub Team</strong></p>
        </div>
        <div class="footer">
          <p>You can unsubscribe at any time by clicking the link in our emails.</p>
          <p>© 2024 CarHub Rentals. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"CarHub Newsletter" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '📧 Welcome to the CarHub Newsletter!',
    html: htmlContent,
    text: `Thank you for subscribing to the CarHub newsletter! You'll receive exclusive offers, new vehicle updates, and travel tips.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Newsletter confirmation sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send newsletter confirmation to ${email}:`, error.message);
  }
};

// Admin notification for new user signup
export const sendAdminNewUserNotification = async (user) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@carhub.com';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
        .header { background: #0A2342; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #F4D35E; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🆕 New User Registration</h2>
        </div>
        <div class="content">
          <p>A new user has joined CarHub!</p>
          <div class="info">
            <strong>Name:</strong> ${user.name || 'Not provided'}<br>
            <strong>Email:</strong> ${user.email}<br>
            <strong>Role:</strong> ${user.role || 'CUSTOMER'}<br>
            <strong>Registered:</strong> ${new Date().toLocaleString()}
          </div>
          <p>Total users: <strong>${await getTotalUsers()}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"CarHub System" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    subject: '🆕 New User Registration - CarHub',
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notification sent for new user: ${user.email}`);
  } catch (error) {
    console.error(`❌ Failed to send admin notification:`, error.message);
  }
};

// Helper function to get total users (simplified)
async function getTotalUsers() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const count = await prisma.user.count();
    await prisma.$disconnect();
    return count;
  } catch (error) {
    return 'N/A';
  }
}

export default {
  validateEmail,
  sendWelcomeEmail,
  sendNewsletterConfirmation,
  sendAdminNewUserNotification,
};