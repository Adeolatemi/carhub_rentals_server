// server/src/routes/newsletter.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateEmail, sendNewsletterConfirmation } from '../services/email.service.js';

const router = express.Router();
const prisma = new PrismaClient();

// Subscribe to newsletter
router.post('/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }
    
    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existing) {
      return res.status(400).json({ 
        error: 'This email is already subscribed to our newsletter' 
      });
    }
    
    // Create subscription
    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        subscribedAt: new Date(),
        isActive: true,
      }
    });
    
    // Send confirmation email
    await sendNewsletterConfirmation(email);
    
    res.status(201).json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter! Check your email for confirmation.' 
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ error: 'Subscription failed. Please try again.' });
  }
});

// Unsubscribe from newsletter
router.post('/newsletter/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    await prisma.newsletterSubscriber.update({
      where: { email: email.toLowerCase() },
      data: { isActive: false, unsubscribedAt: new Date() }
    });
    
    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Unsubscribe failed' });
  }
});

export default router;