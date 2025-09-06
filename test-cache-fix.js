#!/usr/bin/env node

const API_KEY = '4c18c847-2c26-40fe-8ce5-c0b5d3d6bda8';
const BASE_URL = 'http://129.146.0.190:3000';

async function testCacheOverflowFix() {
  console.log('🧪 Testing cache overflow fix...\n');
  
  const tests = [
    { postId: 300, name: 'Previously failing post (should now work)' },
    { postId: 299, name: 'Another older post' },
    { postId: 314, name: 'Cached recent post (control)' }
  ];
  
  for (const test of tests) {
    console.log(`Testing ${test.name} - Post ID: ${test.postId}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${BASE_URL}/api/blog/${test.postId}`, {
        headers: {
          'X-Api-Key': API_KEY,
          'Accept': 'application/json'
        }
      });
      
      const duration = Date.now() - startTime;
      const status = response.status;
      const cacheStatus = response.headers.get('X-Cache-Status') || 'No header';
      
      console.log(`  ⏱️  ${duration}ms`);
      console.log(`  📊 ${status}`);
      console.log(`  🏷️  Cache: ${cacheStatus}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ SUCCESS: ${data.title?.substring(0, 40)}...`);
      } else {
        const errorText = await response.text();
        console.log(`  ❌ ERROR: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`  💥 EXCEPTION: ${error.message}`);
    }
    
    console.log(); // Empty line for readability
  }
}

testCacheOverflowFix().catch(console.error);
