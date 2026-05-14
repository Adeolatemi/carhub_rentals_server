// import { Redis } from '@upstash/redis';

// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN,
// });

// async function test() {
  
//   await redis.set('test-key', 'Hello CarHub!');
//   const value = await redis.get('test-key');
//   console.log('Cache test:', value);
// }

// test();

// server/src/test-cache.js
import { Redis } from '@upstash/redis';

// Initialize Redis with your secrets
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function testCache() {
  console.log('🔍 Testing Redis Cache...');
  console.log('📡 URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing');
  console.log('🔑 Token:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing');
  
  try {
    // Test 1: Set a value
    console.log('\n📝 Test 1: Setting cache...');
    await redis.set('test:greeting', 'Hello CarHub!');
    console.log('✅ Value set successfully');
    
    // Test 2: Get the value
    console.log('\n📖 Test 2: Getting cache...');
    const value = await redis.get('test:greeting');
    console.log('✅ Retrieved value:', value);
    
    // Test 3: Set with expiration (10 seconds)
    console.log('\n⏰ Test 3: Setting cache with TTL...');
    await redis.set('test:expiring', 'This will expire', { ex: 10 });
    console.log('✅ Set with 10 second expiration');
    
    // Test 4: Check if key exists
    console.log('\n🔎 Test 4: Checking key exists...');
    const exists = await redis.exists('test:greeting');
    console.log('✅ Key exists:', exists === 1);
    
    // Test 5: Delete the key
    console.log('\n🗑️ Test 5: Deleting cache...');
    await redis.del('test:greeting');
    const afterDelete = await redis.get('test:greeting');
    console.log('✅ After delete:', afterDelete || 'null (correct)');
    
    console.log('\n🎉 ALL TESTS PASSED! Redis is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your UPSTASH_REDIS_REST_URL is correct');
    console.log('2. Check your UPSTASH_REDIS_REST_TOKEN is correct');
    console.log('3. Make sure your Upstash database is active');
  }
}

testCache();