// server/src/routes/orders.js
import cacheService from '../services/cache.service.js';

// Create booking
router.post('/orders', async (req, res) => {
  try {
    // ... existing booking creation code ...
    
    // After successful booking, invalidate related caches
    await cacheService.invalidateBookingCache();
    
    // Also invalidate specific vehicle if booked
    if (vehicleId) {
      await cacheService.invalidateVehicleCache(vehicleId);
    }
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});
// In your POST /orders endpoint, after successful order creation, add:
// After creating the order, invalidate relevant caches
await cacheService.del('admin:stats');
await cacheService.delPattern('vehicles:*');
console.log('🗑️ Cache invalidated due to new booking');
// Update order status (confirm/cancel)
router.patch('/orders/:id', async (req, res) => {
  try {
    // ... existing update code ...
    
    // Invalidate caches
    await cacheService.invalidateBookingCache();
    if (status === 'CONFIRMED') {
      await cacheService.invalidateVehicleCache(order.vehicleId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});