// server/src/routes/vehicles.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import cacheService from '../services/cache.service.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all vehicles with caching
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    const cacheKey = `vehicles:${category || 'all'}:${search || 'none'}:${page}:${limit}`;
    
    // Try cache first
    let result = await cacheService.get(cacheKey);
    
    if (!result) {
      // Build query
      const where = {};
      if (category && category !== 'All') where.category = category;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      const [vehicles, total] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.vehicle.count({ where }),
      ]);
      
      result = { vehicles, total, page: parseInt(page), limit: parseInt(limit) };
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, result, 600);
      console.log(`📝 Cached vehicles with key: ${cacheKey}`);
    } else {
      console.log(`✅ Cache hit for: ${cacheKey}`);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Get single vehicle with caching
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `vehicle:${id}`;
    
    let vehicle = await cacheService.get(cacheKey);
    
    if (!vehicle) {
      vehicle = await prisma.vehicle.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (vehicle) {
        await cacheService.set(cacheKey, vehicle, 3600); // 1 hour
        console.log(`📝 Cached vehicle: ${id}`);
      }
    } else {
      console.log(`✅ Cache hit for vehicle: ${id}`);
    }
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

export default router;