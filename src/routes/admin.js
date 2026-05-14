// server/src/routes/admin.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cacheService from '../services/cache.service.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /admin/stats - Get admin dashboard statistics with caching
router.get('/admin/stats', async (req, res) => {
  try {
    // Check cache first
    let stats = await cacheService.get('admin:stats');
    
    if (!stats) {
      console.log('📝 Cache miss - fetching stats from database...');
      
      const [revenueResult, usersCount, vehiclesCount, ordersCount, completedOrders, pendingOrders] = await Promise.all([
        prisma.order.aggregate({
          where: { status: 'CONFIRMED' },
          _sum: { totalAmount: true },
        }),
        prisma.user.count(),
        prisma.vehicle.count(),
        prisma.order.count(),
        prisma.order.count({ where: { status: 'CONFIRMED' } }),
        prisma.order.count({ where: { status: 'PENDING' } }),
      ]);

      // Get monthly revenue
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyRevenue = await prisma.order.aggregate({
        where: {
          status: 'CONFIRMED',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { totalAmount: true },
      });

      stats = {
        totalRevenue: revenueResult._sum.totalAmount || 0,
        totalUsers: usersCount,
        totalVehicles: vehiclesCount,
        totalOrders: ordersCount,
        completedOrders: completedOrders,
        pendingOrders: pendingOrders,
        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      };
      
      // Cache for 5 minutes
      await cacheService.set('admin:stats', stats, 300);
      console.log('✅ Stats cached');
    } else {
      console.log('✅ Cache hit for admin stats');
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// PUT /admin/vehicles/:id - Update vehicle with cache invalidation
router.put('/admin/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    
    // Invalidate caches
    await cacheService.del(`vehicle:${id}`);
    await cacheService.delPattern('vehicles:*');
    await cacheService.del('admin:stats');
    console.log(`🗑️ Cache invalidated for vehicle: ${id}`);
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// POST /admin/vehicles - Add new vehicle with cache invalidation
router.post('/admin/vehicles', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.create({
      data: req.body,
    });
    
    // Invalidate vehicles cache
    await cacheService.delPattern('vehicles:*');
    await cacheService.del('admin:stats');
    console.log(`🗑️ Cache invalidated - new vehicle added: ${vehicle.id}`);
    
    res.json(vehicle);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

// DELETE /admin/vehicles/:id - Delete vehicle with cache invalidation
router.delete('/admin/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vehicle.delete({
      where: { id: parseInt(id) },
    });
    
    // Invalidate caches
    await cacheService.delPattern('vehicles:*');
    await cacheService.del('admin:stats');
    console.log(`🗑️ Cache invalidated - vehicle deleted: ${id}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router;