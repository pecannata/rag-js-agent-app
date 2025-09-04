#!/usr/bin/env node

/**
 * Test script to verify that new blog posts get IDs starting from 500
 * This script will create a test blog post and check its ID
 */

const https = require('https');

// Configuration
const HOST = 'localhost';
const PORT = 3000;
const API_URL = `http://${HOST}:${PORT}/api/blog`;

// Test blog post data
const testBlogPost = {
  title: `Test Blog Post - ${new Date().toISOString()}`,
  content: `# Test Blog Post

This is a test blog post created to verify that new blog IDs start from 500.

## Content
This post contains some test content to ensure the blog creation works properly.

Created at: ${new Date().toISOString()}
`,
  excerpt: 'This is a test blog post to verify that new blog IDs start from 500.',
  status: 'draft',
  tags: ['test', 'verification', 'id-testing']
};

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const protocol = urlObj.protocol === 'https:' ? https : require('http');
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testBlogIdStarts500() {
  console.log('🧪 Testing Blog ID Starting Point...');
  console.log('=====================================\n');

  try {
    // Step 1: Check existing posts to see current max ID
    console.log('📊 Step 1: Checking existing blog posts...');
    const getResponse = await makeRequest(API_URL);
    
    if (getResponse.statusCode !== 200) {
      console.log('⚠️  Could not fetch existing posts:', getResponse.data);
    } else {
      const posts = getResponse.data.posts || [];
      console.log(`📝 Found ${posts.length} existing blog posts`);
      
      if (posts.length > 0) {
        const maxId = Math.max(...posts.map(p => p.id || 0));
        console.log(`🔢 Current max ID: ${maxId}`);
      } else {
        console.log('📝 No existing posts found');
      }
    }
    
    console.log('\n📝 Step 2: Creating a new test blog post...');
    
    // Step 2: Create a new blog post
    const createResponse = await makeRequest(API_URL, 'POST', testBlogPost);
    
    if (createResponse.statusCode === 200 && createResponse.data.success) {
      const newPost = createResponse.data.post;
      console.log('✅ Blog post created successfully!');
      console.log(`🆔 New Blog Post ID: ${newPost.id}`);
      console.log(`📝 Title: "${newPost.title}"`);
      console.log(`📊 Status: ${newPost.status}`);
      
      // Verify ID is >= 500
      if (newPost.id >= 500) {
        console.log('🎉 SUCCESS: Blog ID is >= 500! ✅');
        console.log(`🔢 Expected: >= 500, Got: ${newPost.id}`);
      } else {
        console.log('❌ FAILURE: Blog ID is still below 500!');
        console.log(`🔢 Expected: >= 500, Got: ${newPost.id}`);
      }
      
      // Step 3: Fetch the post to double-check
      console.log('\n🔍 Step 3: Verifying post was saved correctly...');
      const verifyResponse = await makeRequest(`${API_URL}?includeContent=true`);
      
      if (verifyResponse.statusCode === 200) {
        const allPosts = verifyResponse.data.posts || [];
        const createdPost = allPosts.find(p => p.title === testBlogPost.title);
        
        if (createdPost) {
          console.log('✅ Post verification successful!');
          console.log(`🆔 Verified ID: ${createdPost.id}`);
        } else {
          console.log('⚠️  Could not find the created post in verification');
        }
      }
      
    } else {
      console.log('❌ Failed to create blog post:');
      console.log('Status:', createResponse.statusCode);
      console.log('Response:', JSON.stringify(createResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }

  console.log('\n=====================================');
  console.log('🧪 Blog ID Test Complete');
}

// Run the test
if (require.main === module) {
  testBlogIdStarts500().catch(console.error);
}

module.exports = { testBlogIdStarts500 };
