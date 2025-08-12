import NodeCache from 'node-cache';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

// Create single cache instance for entire app
const appCache = new NodeCache({
  stdTTL: 43200,     // 12 hours default TTL
  checkperiod: 720,  // Check for expired keys every 12 minutes
  useClones: false   // Better performance
});

// AUTO RE-PRIME: Set up event listener for automatic cache refresh on expiry
appCache.on('expired', async (key, _value) => {
  console.log(`⏰ Cache expired: ${key} - starting automatic re-prime...`);
  
  try {
    // Auto-reprime categorized blog posts
    if (key === 'categorized_blog_posts') {
      console.log('🔄 Auto re-priming categorized blog posts...');
      const freshData = await fetchCategorizedBlogPosts();
      appCache.set(key, freshData, 43200); // Re-cache for 12 hours
      console.log('🔥 Auto re-prime completed - categorized posts cache is warm!');
    }
    // Auto-reprime blog posts queries
    else if (key.startsWith('blog_posts_')) {
      console.log(`🔄 Auto re-priming blog posts cache: ${key}...`);
      const freshData = await fetchBlogPostsForKey(key);
      
      // Determine TTL based on query type
      const ttl = getTTLForCacheKey(key);
      appCache.set(key, freshData, ttl);
      console.log(`🔥 Auto re-prime completed - ${key} cache is warm (TTL: ${ttl}s)!`);
    }
    else {
      console.log(`ℹ️ Cache key ${key} expired but no auto re-prime configured`);
    }
  } catch (error) {
    console.error(`❌ Auto re-prime failed for ${key}:`, error);
    console.log('⚠️ Next request will trigger manual fetch');
  }
});

console.log('✅ Cache auto re-prime system initialized');

// Additional event logging for monitoring
appCache.on('set', (key, _value) => {
  console.log(`💾 Cache SET: ${key}`);
});

appCache.on('del', (key, _value) => {
  console.log(`🗑️ Cache DELETE: ${key}`);
});

appCache.on('flush', () => {
  console.log('🧹 Cache FLUSH: All keys cleared');
});

const execPromise = promisify(exec);

// Helper function to determine TTL based on cache key
function getTTLForCacheKey(cacheKey: string): number {
  // Parse cache key format: blog_posts_{status}_{limit}_{offset}_{includeContent}
  if (cacheKey.includes('_published_3_')) {
    return 21600; // 6 hours for recent posts (limit=3)
  } else if (cacheKey.includes('_published_nolimit_')) {
    return 43200; // 12 hours for published posts
  } else if (cacheKey.includes('_all_nolimit_')) {
    return 28800; // 8 hours for all posts (admin)
  }
  return 43200; // Default 12 hours
}

// Helper function to parse cache key and generate query parameters
function parseCacheKey(cacheKey: string): { status: string | null, limit: number | null, offset: number, includeContent: boolean } {
  // Cache key format: blog_posts_{status}_{limit}_{offset}_{includeContent}
  const parts = cacheKey.split('_');
  
  if (parts.length < 6 || parts[0] !== 'blog' || parts[1] !== 'posts') {
    throw new Error(`Invalid cache key format: ${cacheKey}`);
  }
  
  const status = (parts[2] === 'all' || !parts[2]) ? null : parts[2];
  const limit = (parts[3] === 'nolimit' || !parts[3]) ? null : parseInt(parts[3]);
  const offset = parseInt(parts[4] || '0');
  const includeContent = parts[5] === 'content';
  
  return { status, limit, offset, includeContent };
}

// Helper function to fetch blog posts for a specific cache key
async function fetchBlogPostsForKey(cacheKey: string) {
  console.log(`🔍 Fetching fresh blog posts data for cache key: ${cacheKey}`);
  
  const { status, limit, includeContent } = parseCacheKey(cacheKey);
  
  const scriptPath = path.join(process.cwd(), 'SQLclScript.sh');
  
  // Build query based on parameters
  let query = `
    SELECT 
      id,
      title,
      author,
      TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at,
      status,
      TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
      TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`;
  
  if (includeContent) {
    query += `,
      content.getClobVal() as content`;
  }
  
  query += `
    FROM blog_posts`;
  
  // Add WHERE clause if status filter is specified
  if (status) {
    query += `
    WHERE status = '${status}'`;
  }
  
  // Add ORDER BY
  query += `
    ORDER BY COALESCE(published_at, created_at) DESC`;
  
  // Add LIMIT if specified (Oracle syntax: FETCH FIRST n ROWS ONLY)
  if (limit !== null && limit > 0) {
    query += `
    FETCH FIRST ${limit} ROWS ONLY`;
  }
  
  console.log('🚀 Executing blog posts query for auto re-prime...');
  
  const { stdout: output, stderr: error } = await execPromise(`bash "${scriptPath}" "${escapeForShell(query)}"`, {
    maxBuffer: 50 * 1024 * 1024
  });
  
  if (error) {
    console.error('❌ Query stderr:', error);
  }
  
  const posts = parseBlogPostResults(output, includeContent);
  
  console.log(`✅ Fresh blog posts fetched: ${posts.length} posts`);
  
  return {
    success: true,
    posts: posts
  };
}

// Helper function to parse blog post results
function parseBlogPostResults(output: string, includeContent: boolean): any[] {
  try {
    console.log('📤 Parsing blog posts results (first 500 chars):', output.substring(0, 500));
    
    const trimmedOutput = output.trim();
    
    if (trimmedOutput.includes('Error starting at line') || 
        trimmedOutput.includes('ORA-') || 
        trimmedOutput.includes('Error report') ||
        trimmedOutput.startsWith('Error')) {
      console.error('❌ Oracle Error detected:', trimmedOutput);
      return [];
    }
    
    if (trimmedOutput === '' || 
        trimmedOutput === 'no rows selected' || 
        trimmedOutput.toLowerCase().includes('no rows')) {
      console.log('✅ Empty result set (no matching posts)');
      return [];
    }
    
    const parsed = JSON.parse(output);
    console.log('✅ Successfully parsed blog posts as JSON');
    
    if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
      const items = parsed.results[0].items || [];
      
      let dataArray = items;
      
      if (!Array.isArray(dataArray)) {
        console.log('⚠️ Data is not an array, using empty array');
        dataArray = [];
      }
      
      const posts = dataArray.map((post: any) => {
        const result: any = {
          id: post.id,
          title: post.title,
          author: post.author,
          publishedAt: post.published_at,
          status: post.status,
          createdAt: post.created_at,
          updatedAt: post.updated_at
        };
        
        if (includeContent && post.content) {
          result.content = post.content;
        }
        
        return result;
      });
      
      console.log(`✅ Extracted ${posts.length} blog posts`);
      return posts;
    }
    
    if (Array.isArray(parsed)) {
      console.log('✅ Direct array format for blog posts');
      return parsed.map((item: any) => ({
        id: parseInt(item[0]),
        title: item[1],
        author: item[2],
        publishedAt: item[3],
        status: item[4],
        createdAt: item[5],
        updatedAt: item[6],
        content: includeContent ? item[7] : undefined
      }));
    }
    
    console.log('⚠️ No items found in blog posts results structure');
    return [];
    
  } catch (error) {
    console.error('❌ Error parsing blog posts query results:', error);
    console.error('❌ Raw output that failed to parse:', output);
    
    const trimmedOutput = output.trim();
    if (trimmedOutput === '' || 
        trimmedOutput === 'no rows selected' || 
        trimmedOutput.toLowerCase().includes('no rows')) {
      console.log('✅ Treating non-JSON empty result as success');
      return [];
    }
    
    return [];
  }
}

// Helper function to fetch categorized blog posts (extracted from route)
async function fetchCategorizedBlogPosts() {
  const scriptPath = path.join(process.cwd(), 'SQLclScript.sh');
  
  const optimizedCategorizedQuery = `
    SELECT 
      id,
      title,
      author,
      TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at,
      CASE 
        WHEN UPPER(SUBSTR(title, 1, 4)) = '(AI)' THEN 'ai'
        WHEN UPPER(SUBSTR(title, 1, 4)) = '(CS)' THEN 'cs'
        ELSE 'science'
      END as category
    FROM blog_posts
    WHERE status = 'published' 
      AND published_at IS NOT NULL
    ORDER BY published_at DESC`;
  
  console.log('🚀 Fetching fresh categorized blog data for cache...');
  
  const { stdout: output, stderr: error } = await execPromise(`bash "${scriptPath}" "${escapeForShell(optimizedCategorizedQuery)}"`, {
    maxBuffer: 50 * 1024 * 1024
  });
  
  if (error) {
    console.error('❌ Query stderr:', error);
  }
  
  const allPosts = parseOptimizedResults(output);
  
  // Categorize posts efficiently
  const categorizedPosts = {
    ai: allPosts.filter(post => post.category === 'ai').map(({ category, ...post }) => post),
    cs: allPosts.filter(post => post.category === 'cs').map(({ category, ...post }) => post),
    science: allPosts.filter(post => post.category === 'science').map(({ category, ...post }) => post)
  };
  
  console.log(`✅ Fresh data fetched: AI=${categorizedPosts.ai.length}, CS=${categorizedPosts.cs.length}, Science=${categorizedPosts.science.length}`);
  
  return {
    success: true,
    categories: categorizedPosts
  };
}

// Helper functions (extracted from original route)
function escapeForShell(query: string): string {
  return query
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

function parseOptimizedResults(output: string): any[] {
  try {
    console.log('📤 Parsing results (first 500 chars):', output.substring(0, 500));
    
    // Clean Oracle output by removing warning messages that interfere with JSON parsing
    let cleanOutput = output;
    
    // Remove Oracle warning messages that appear at the beginning of output
    const oracleWarnings = [
      'or must be a 23c compatible instant client',
      'Thick driver unavailable for use.',
      'Warning:',
      'It is recommended'
    ];
    
    // Split output into lines and filter out warning lines
    const lines = cleanOutput.split('\n');
    const cleanLines = lines.filter(line => {
      const trimmedLine = line.trim();
      return !oracleWarnings.some(warning => trimmedLine.includes(warning));
    });
    
    // Find where JSON actually starts (look for opening brace)
    let jsonStartIndex = 0;
    for (let i = 0; i < cleanLines.length; i++) {
      if (cleanLines[i] && cleanLines[i]?.trim().startsWith('{')) {
        jsonStartIndex = i;
        break;
      }
    }
    
    // Reconstruct clean JSON output
    cleanOutput = cleanLines.slice(jsonStartIndex).join('\n').trim();
    console.log('🧹 Cleaned cache output (first 500 chars):', cleanOutput.substring(0, 500));
    
    const trimmedOutput = cleanOutput.trim();
    
    if (trimmedOutput.includes('Error starting at line') || 
        trimmedOutput.includes('ORA-') || 
        trimmedOutput.includes('Error report') ||
        trimmedOutput.startsWith('Error')) {
      console.error('❌ Oracle Error detected:', trimmedOutput);
      return [];
    }
    
    if (trimmedOutput === '' || 
        trimmedOutput === 'no rows selected' || 
        trimmedOutput.toLowerCase().includes('no rows')) {
      console.log('✅ Empty result set (no matching posts)');
      return [];
    }
    
    const parsed = JSON.parse(cleanOutput);
    console.log('✅ Successfully parsed as JSON');
    
    if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
      const items = parsed.results[0].items || [];
      console.log('🔍 Items structure:', items.length > 0 ? JSON.stringify(items[0], null, 2) : 'No items');
      
      let dataArray = items;
      
      if (!Array.isArray(dataArray)) {
        console.log('⚠️ Data is not an array, using empty array');
        dataArray = [];
      }
      
      const posts = dataArray.map((post: any) => ({
        id: post.id,
        title: post.title,
        author: post.author,
        publishedAt: post.published_at,
        category: post.category
      }));
      
      console.log(`✅ Extracted ${posts.length} posts`);
      if (posts.length > 0) {
        console.log('✅ Sample post:', posts[0]);
      }
      return posts;
    }
    
    if (Array.isArray(parsed)) {
      console.log('✅ Direct array format');
      return parsed.map((item: any) => ({
        id: parseInt(item[0]),
        title: item[1],
        author: item[2],
        publishedAt: item[3],
        category: item[4]
      }));
    }
    
    console.log('⚠️ No items found in results structure');
    return [];
    
  } catch (error) {
    console.error('❌ Error parsing query results:', error);
    console.error('❌ Raw output that failed to parse:', output);
    
    const trimmedOutput = output.trim();
    if (trimmedOutput === '' || 
        trimmedOutput === 'no rows selected' || 
        trimmedOutput.toLowerCase().includes('no rows')) {
      console.log('✅ Treating non-JSON empty result as success');
      return [];
    }
    
    return [];
  }
}

// Declare global types
declare global {
  var invalidateCategorizedCache: (() => void) | undefined;
  var invalidateAndReprimeCategorizedCache: (() => Promise<{success: boolean, message: string, error?: string}>) | undefined;
}

// Global invalidation functions (same pattern as before)
global.invalidateCategorizedCache = () => {
  appCache.del('categorized_blog_posts');
  console.log('🧹 Categorized posts cache invalidated via global function');
};

// New function: Invalidate + Immediate Re-prime
global.invalidateAndReprimeCategorizedCache = async () => {
  const cacheKey = 'categorized_blog_posts';
  
  // Step 1: Clear the cache
  appCache.del(cacheKey);
  console.log('🧹 Cache cleared');
  
  // Step 2: Immediately fetch fresh data and re-cache
  try {
    console.log('🔄 Starting immediate cache re-prime...');
    const freshData = await fetchCategorizedBlogPosts();
    appCache.set(cacheKey, freshData, 43200); // 12 hours TTL
    console.log('🔥 Cache re-primed with fresh data immediately');
    return { success: true, message: 'Cache invalidated and re-primed successfully' };
  } catch (error) {
    console.error('❌ Failed to re-prime cache:', error);
    return { success: false, message: 'Cache cleared but re-prime failed', error: (error as Error).message };
  }
};

// Export cache instance
export { appCache };
