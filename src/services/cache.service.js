// server/src/services/cache.service.js
import { Redis } from '@upstash/redis';

// Initialize Redis (Upstash is free tier friendly)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Cache TTLs (in seconds)
const TTL = {
  STATS: 300,        // 5 minutes - stats change less frequently
  VEHICLES: 600,     // 10 minutes - car listings
  SEARCH: 300,       // 5 minutes - search results
  LOCATIONS: 86400,  // 24 hours - locations rarely change
  PRICING: 3600,     // 1 hour
  FAQS: 86400,       // 24 hours - FAQs are static
  POPULAR: 1800,     // 30 minutes
};

class CacheService {
  // Generic get/set methods
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, data, ttl) {
    try {
      await redis.set(key, JSON.stringify(data), { ex: ttl });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache pattern delete error:`, error);
    }
  }

  // Specific cache methods
  async getStats() {
    return this.get('stats:overview');
  }

  async setStats(data) {
    return this.set('stats:overview', data, TTL.STATS);
  }

  async getMonthlyRevenue(month) {
    return this.get(`stats:revenue:${month}`);
  }

  async setMonthlyRevenue(month, data) {
    return this.set(`stats:revenue:${month}`, data, TTL.STATS);
  }

  async getVehicles(filters = {}) {
    const filterKey = Object.keys(filters).length > 0 
      ? `vehicles:${JSON.stringify(filters)}`
      : 'vehicles:all';
    return this.get(filterKey);
  }

  async setVehicles(filters, data) {
    const filterKey = Object.keys(filters).length > 0 
      ? `vehicles:${JSON.stringify(filters)}`
      : 'vehicles:all';
    return this.set(filterKey, data, TTL.VEHICLES);
  }

  async getPopularVehicles() {
    return this.get('vehicles:popular');
  }

  async setPopularVehicles(data) {
    return this.set('vehicles:popular', data, TTL.POPULAR);
  }

  async getLocations() {
    return this.get('locations:all');
  }

  async setLocations(data) {
    return this.set('locations:all', data, TTL.LOCATIONS);
  }

  async getFAQs() {
    return this.get('faqs:all');
  }

  async setFAQs(data) {
    return this.set('faqs:all', data, TTL.FAQS);
  }

  async getSearchResults(query) {
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    return this.get(cacheKey);
  }

  async setSearchResults(query, data) {
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    return this.set(cacheKey, data, TTL.SEARCH);
  }

  // Cache invalidation methods
  async invalidateVehicleCache(vehicleId) {
    // Delete specific vehicle
    await this.del(`vehicle:${vehicleId}`);
    // Delete all vehicle listings (they need refresh)
    await this.delPattern('vehicles:*');
    // Delete popular vehicles
    await this.del('vehicles:popular');
    // Delete stats (revenue might change)
    await this.del('stats:overview');
  }

  async invalidateBookingCache() {
    // Bookings affect stats
    await this.del('stats:overview');
    await this.delPattern('stats:revenue:*');
  }

  async invalidateAll() {
    await this.delPattern('*');
  }
}

export default new CacheService();