#!/usr/bin/env node

/**
 * Blog Scheduler Script
 * 
 * This script processes scheduled blog posts and email notifications.
 * It should be run as a cron job every few minutes to check for and process:
 * - Scheduled posts that are ready to be published
 * - Email campaigns that need to be sent to subscribers
 * 
 * Usage:
 *   node scripts/scheduler.js [action]
 * 
 * Actions:
 *   posts    - Process only scheduled posts
 *   emails   - Process only email campaigns  
 *   all      - Process both (default)
 * 
 * Example cron job (run every 5 minutes):
 *   */5 * * * * cd /path/to/your/app && node scripts/scheduler.js
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  // Update these to match your deployment
  host: 'localhost',
  port: 3000,
  protocol: 'http', // or 'https' if using SSL
  
  // Action to perform: 'posts', 'emails', or 'all'
  action: process.argv[2] || 'all',
  
  // Timeout for API requests (in milliseconds)
  timeout: 30000
};

/**
 * Make HTTP request to the scheduler API
 */
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(config.timeout);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * Process scheduled jobs
 */
async function processJobs() {
  try {
    console.log(`🕒 [${new Date().toISOString()}] Starting scheduler - Action: ${config.action}`);
    
    const requestOptions = {
      hostname: config.host,
      port: config.port,
      path: '/api/scheduler',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      protocol: config.protocol + ':'
    };
    
    const postData = JSON.stringify({
      action: config.action === 'posts' ? 'process_posts' : 
              config.action === 'emails' ? 'process_emails' : 
              'process_all'
    });
    
    const response = await makeRequest(requestOptions, postData);
    
    if (response.statusCode !== 200) {
      throw new Error(`API returned status ${response.statusCode}: ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.success) {
      throw new Error(`Scheduler API failed: ${JSON.stringify(response.data)}`);
    }
    
    const result = response.data.result;
    
    // Log results based on action
    if (config.action === 'posts' || config.action === 'all') {
      const posts = config.action === 'all' ? result.posts : result;
      console.log(`📝 Published ${posts.publishedCount} scheduled posts`);
      
      if (posts.errors && posts.errors.length > 0) {
        console.error('❌ Post processing errors:');
        posts.errors.forEach(error => console.error('  -', error));
      }
    }
    
    if (config.action === 'emails' || config.action === 'all') {
      const emails = config.action === 'all' ? result.emails : result;
      console.log(`📧 Processed ${emails.processedCount} email campaigns`);
      
      if (emails.errors && emails.errors.length > 0) {
        console.error('❌ Email processing errors:');
        emails.errors.forEach(error => console.error('  -', error));
      }
    }
    
    console.log(`✅ [${new Date().toISOString()}] Scheduler completed successfully`);
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Scheduler failed:`, error.message);
    process.exit(1);
  }
}

/**
 * Get scheduler status (for monitoring)
 */
async function getStatus() {
  try {
    const requestOptions = {
      hostname: config.host,
      port: config.port,
      path: '/api/scheduler?status=pending',
      method: 'GET',
      protocol: config.protocol + ':'
    };
    
    const response = await makeRequest(requestOptions);
    
    if (response.statusCode !== 200) {
      throw new Error(`API returned status ${response.statusCode}`);
    }
    
    const data = response.data;
    
    if (data.success) {
      console.log(`📊 Scheduler Status:`);
      console.log(`   - Pending jobs: ${data.jobs.filter(j => j.status === 'pending').length}`);
      console.log(`   - Running jobs: ${data.jobs.filter(j => j.status === 'running').length}`);
      console.log(`   - Total jobs: ${data.jobs.length}`);
      
      if (data.stats && data.stats.length > 0) {
        console.log(`📈 Job Statistics:`);
        data.stats.forEach(stat => {
          console.log(`   - ${stat.job_type} (${stat.status}): ${stat.count}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to get scheduler status:', error.message);
  }
}

// Main execution
if (process.argv.includes('--status')) {
  getStatus();
} else {
  // Validate action parameter
  const validActions = ['posts', 'emails', 'all'];
  if (!validActions.includes(config.action)) {
    console.error(`❌ Invalid action: ${config.action}`);
    console.error(`Valid actions: ${validActions.join(', ')}`);
    process.exit(1);
  }
  
  processJobs();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`❌ [${new Date().toISOString()}] Uncaught exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`❌ [${new Date().toISOString()}] Unhandled rejection at:`, promise, 'reason:', reason);
  process.exit(1);
});
