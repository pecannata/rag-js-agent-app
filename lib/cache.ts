import NodeCache from 'node-cache';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

// Create single cache instance for entire app
const appCache = new NodeCache({
  stdTTL: 1800,      // 30 minutes default TTL
  checkperiod: 120,  // Check for expired keys every 2 minutes
  useClones: false   // Better performance
});

// AUTO RE-PRIME: Set up event listener for automatic cache refresh on expiry
appCache.on('expired', async (key, _value) => {
  console.log(`⏰ Cache expired: ${key} - starting automatic re-prime...`);
  
  // Only auto-reprime specific keys we care about
  if (key === 'categorized_blog_posts') {
    try {
      console.log('🔄 Auto re-priming categorized blog posts...');
      const freshData = await fetchCategorizedBlogPosts();
      appCache.set(key, freshData, 1800); // Re-cache for 30 minutes
      console.log('🔥 Auto re-prime completed - cache is warm!');
    } catch (error) {
      console.error('❌ Auto re-prime failed:', error);
      console.log('⚠️ Next request will trigger manual fetch');
    }
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
    appCache.set(cacheKey, freshData, 1800); // 30 minutes TTL
    console.log('🔥 Cache re-primed with fresh data immediately');
    return { success: true, message: 'Cache invalidated and re-primed successfully' };
  } catch (error) {
    console.error('❌ Failed to re-prime cache:', error);
    return { success: false, message: 'Cache cleared but re-prime failed', error: (error as Error).message };
  }
};

// Export cache instance
export { appCache };
