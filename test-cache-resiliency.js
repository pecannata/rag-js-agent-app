#!/usr/bin/env node

const API_KEY = '4c18c847-2c26-40fe-8ce5-c0b5d3d6bda8';
const BASE_URL = 'http://129.146.0.190:3000';

async function testCacheResiliency() {
  console.log('🧪 Testing cache resiliency with multiple uncached posts...\n');
  
  const tests = [
    { postId: 290, name: 'Uncached post #1' },
    { postId: 291, name: 'Uncached post #2' },
    { postId: 292, name: 'Uncached post #3' },
    { postId: 293, name: 'Uncached post #4' },
    { postId: 294, name: 'Uncached post #5' }
  ];
  
  console.log('Testing multiple uncached posts to verify cache overflow handling...\n');
  
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
  
  console.log('🔄 Now testing if one of the earlier posts is now cached...\n');
  
  const retestId = 290;
  console.log(`Re-testing Post ID: ${retestId}`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/blog/${retestId}`, {
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
}

testCacheResiliency().catch(console.error);
