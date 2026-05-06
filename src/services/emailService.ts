import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email configuration with Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email using Nodemailer
export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('SMTP credentials not configured. Email not sent.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"CarHub" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

// Welcome email
export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1D3557;">Welcome to CarHub, ${name}! 🚗</h2>
      <p>Thank you for joining CarHub. Your account has been successfully created.</p>
      <p>With CarHub, you can:</p>
      <ul>
        <li>Browse our premium fleet of vehicles</li>
        <li>Book rides instantly</li>
        <li>Track your bookings</li>
        <li>Manage your profile</li>
      </ul>
      <p>Need help? Contact our support team at support@carhub.com</p>
      <hr />
      <p style="color: #666; font-size: 12px;">CarHub - Premium Car Hire Service</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to CarHub! 🚗',
    html,
  });
}

// Booking confirmation email
export async function sendBookingConfirmation(to: string, name: string, bookingDetails: any) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1D3557;">Booking Confirmed! 🎉</h2>
      <p>Dear ${name},</p>
      <p>Your booking has been successfully confirmed. Here are your booking details:</p>
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px;">
        <p><strong>Booking ID:</strong> ${bookingDetails.id?.slice(0, 8)}</p>
        <p><strong>Pickup Location:</strong> ${bookingDetails.pickupLocation}</p>
        <p><strong>Dropoff Location:</strong> ${bookingDetails.dropoffLocation}</p>
        <p><strong>Start Date:</strong> ${new Date(bookingDetails.startDate).toLocaleDateString()}</p>
        <p><strong>End Date:</strong> ${new Date(bookingDetails.endDate).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> ₦${bookingDetails.total?.toLocaleString()}</p>
      </div>
      <p>We'll send you a reminder before your pickup date.</p>
      <p>Need to modify your booking? Contact our support team.</p>
      <hr />
      <p style="color: #666; font-size: 12px;">CarHub - Premium Car Hire Service</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Booking Confirmed - CarHub',
    html,
  });
}

// Password reset email
export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://carhub-rentals.vercel.app'}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1D3557;">Reset Your Password</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #F4D35E; color: #0A2342; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr />
      <p style="color: #666; font-size: 12px;">CarHub - Premium Car Hire Service</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Reset Your Password - CarHub',
    html,
  });
}

// Order status update email
export async function sendOrderStatusUpdate(to: string, name: string, orderId: string, status: string) {
  const statusMessages: Record<string, string> = {
    CONFIRMED: 'Your order has been confirmed! We are preparing your vehicle.',
    COMPLETED: 'Your order has been completed. Thank you for choosing CarHub!',
    CANCELLED: 'Your order has been cancelled. If this was a mistake, please contact support.',
    PENDING: 'Your order is pending confirmation. We\'ll notify you once confirmed.',
  };

  const message = statusMessages[status] || `Your order status has been updated to ${status}.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1D3557;">Order Status Update</h2>
      <p>Dear ${name},</p>
      <p>${message}</p>
      <p><strong>Order ID:</strong> ${orderId.slice(0, 8)}</p>
      <p>If you have any questions, please contact our support team.</p>
      <hr />
      <p style="color: #666; font-size: 12px;">CarHub - Premium Car Hire Service</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Order ${status} - CarHub`,
    html,
  });
}