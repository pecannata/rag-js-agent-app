import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import NodeCache from 'node-cache';

const execAsync = promisify(exec);

// NodeCache-based blog post cache with LRU behavior and auto re-priming
const blogPostCache = new NodeCache({
  stdTTL: 43200,     // 12 hours TTL
  checkperiod: 720,  // Check for expired keys every 12 minutes
  useClones: false,   // Better performance
  maxKeys: 20         // LRU with max 20 entries
});

// Set up auto re-prime event listener for individual blog posts
blogPostCache.on('expired', async (key: string, _value: any) => {
  console.log(`⏰ Blog post cache expired: ${key} - starting automatic re-prime...`);
  
  try {
    // Extract blog post ID from cache key (format: blog_post_123)
    const postId = key.replace('blog_post_', '');
    
    if (postId && !isNaN(parseInt(postId))) {
      console.log(`🔄 Auto re-priming individual blog post: ${postId}...`);
      const freshPost = await fetchBlogPostById(postId);
      
      if (freshPost) {
        blogPostCache.set(key, freshPost, 43200); // Re-cache for 12 hours
        console.log(`🔥 Auto re-prime completed - blog post ${postId} cache is warm!`);
      } else {
        console.log(`⚠️ Blog post ${postId} not found during auto re-prime (may have been unpublished)`);
      }
    } else {
      console.log(`⚠️ Invalid blog post cache key format: ${key}`);
    }
  } catch (error) {
    console.error(`❌ Auto re-prime failed for blog post ${key}:`, error);
    console.log('⚠️ Next request will trigger manual fetch');
  }
});

// Additional event logging for blog post cache
blogPostCache.on('set', (key: string, _value: any) => {
  const stats = blogPostCache.getStats();
  console.log(`💾 Blog post cached: ${key} (${stats.keys}/${20})`);
});

blogPostCache.on('del', (key: string, _value: any) => {
  console.log(`🗑️ Blog post cache DELETE: ${key}`);
});

blogPostCache.on('flush', () => {
  console.log('🧹 Blog post cache FLUSH: All keys cleared');
});

console.log('✅ Blog post cache auto re-prime system initialized');

// Helper function to fetch a single blog post by ID for auto re-priming
async function fetchBlogPostById(postId: string): Promise<any | null> {
  try {
    const query = `
      SELECT 
        id,
        title,
        slug,
        content,
        excerpt,
        author,
        status,
        tags,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
        TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at
      FROM blog_posts 
      WHERE id = ${parseInt(postId)} AND status = 'published'
    `;
    
    const result = await executeOracleQuery(query);
    
    if (!result.success || !result.data || result.data.length === 0) {
      return null;
    }
    
    const post = result.data[0];
    
    // Parse tags if they exist
    let parsedTags = [];
    if (post.tags) {
      try {
        parsedTags = JSON.parse(post.tags);
      } catch (e) {
        parsedTags = post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
      }
    }
    
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      author: post.author,
      status: post.status,
      tags: parsedTags,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at
    };
    
  } catch (error) {
    console.error(`❌ Error fetching blog post ${postId}:`, error);
    return null;
  }
}

// Function to prime the cache with the 10 most recent published posts
async function primeRecentPostsCache(): Promise<{ success: boolean, count: number, error?: string }> {
  try {
    console.log('🔥 Priming blog post cache with 10 most recent published posts...');
    
    const query = `
      SELECT 
        id,
        title,
        slug,
        content,
        excerpt,
        author,
        status,
        tags,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
        TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at
      FROM blog_posts 
      WHERE status = 'published'
        AND published_at IS NOT NULL
      ORDER BY published_at DESC
      FETCH FIRST 10 ROWS ONLY
    `;
    
    const result = await executeOracleQuery(query);
    
    if (!result.success || !result.data) {
      return { success: false, count: 0, error: result.error || 'Unknown error occurred' };
    }
    
    let primedCount = 0;
    
    for (const post of result.data) {
      // Parse tags if they exist
      let parsedTags = [];
      if (post.tags) {
        try {
          parsedTags = JSON.parse(post.tags);
        } catch (e) {
          parsedTags = post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
        }
      }
      
      const blogPost = {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        author: post.author,
        status: post.status,
        tags: parsedTags,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        publishedAt: post.published_at
      };
      
      const cacheKey = `blog_post_${post.id}`;
      blogPostCache.set(cacheKey, blogPost);
      primedCount++;
    }
    
    console.log(`✅ Primed ${primedCount} blog posts in LRU cache`);
    return { success: true, count: primedCount };
    
  } catch (error) {
    console.error('❌ Error priming blog post cache:', error);
    return { success: false, count: 0, error: (error as Error).message };
  }
}

// Declare global types for cache management
declare global {
  var getBlogPostCacheStats: (() => { size: number, maxSize: number, keys: string[] }) | undefined;
  var clearBlogPostCache: (() => void) | undefined;
  var primeBlogPostCache: (() => Promise<{ success: boolean, count: number, error?: string }>) | undefined;
}

// Global cache management functions
global.getBlogPostCacheStats = () => {
  const stats = blogPostCache.getStats();
  return {
    size: stats.keys,
    maxSize: 20,
    keys: blogPostCache.keys()
  };
};

global.clearBlogPostCache = () => {
  blogPostCache.flushAll();
  console.log('🧹 Blog post cache cleared via global function');
};

global.primeBlogPostCache = async () => {
  return await primeRecentPostsCache();
};

// New: Invalidate cache for a specific blog post key base (id or title)
// This removes both admin and public variants so drafts update immediately for admins
(global as any).invalidateBlogPostCache = (keyBase: string) => {
  if (!keyBase) return;
  const keys = [
    `blog_post_${keyBase}_admin`,
    `blog_post_${keyBase}_public`
  ];
  keys.forEach(k => {
    if (blogPostCache.del(k)) {
      console.log(`🗑️ Blog post cache invalidated: ${k}`);
    }
  });
};

// Oracle database execution function (same as in main blog route)
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Blog ID Database Query Execution:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    // Execute the SQLclScript.sh with the SQL query
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Blog ID database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Blog ID database query executed successfully');
    console.log('📤 Raw Oracle Output (first 500 chars):', stdout.substring(0, 500) + (stdout.length > 500 ? '...' : ''));
    
    // Parse JSON response
    try {
      // Clean Oracle output by removing warning messages that interfere with JSON parsing
      let cleanOutput = stdout;
      
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
      console.log('🧹 Cleaned Oracle output for blog post (first 500 chars):', cleanOutput.substring(0, 500));
      
      const jsonData = JSON.parse(cleanOutput);
      console.log('✅ Successfully parsed as JSON');
      
      // Handle Oracle's specific JSON format: {results: [{items: [...]}]}
      if (jsonData.results && Array.isArray(jsonData.results) && jsonData.results.length > 0) {
        const items = jsonData.results[0].items || [];
        console.log('✅ Extracted Oracle items:', items.length, 'rows');
        return { success: true, data: items };
      }
      
      // Handle direct array format
      if (Array.isArray(jsonData)) {
        return { success: true, data: jsonData };
      }
      
      // Handle single object
      return { success: true, data: [jsonData] };
      
    } catch (parseError) {
      const trimmedOutput = stdout.trim();
      if (trimmedOutput === '' || trimmedOutput === 'no rows selected' || trimmedOutput.toLowerCase().includes('no rows')) {
        return { success: true, data: [] };
      }
      return { success: true, data: trimmedOutput };
    }
  } catch (error) {
    console.error('❌ Blog ID database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 Blog post request for ID: ${id}`);
    
    // Check if user is admin (can view draft posts)
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const isAdmin = userEmail === 'phil.cannata@yahoo.com';
    
    console.log(`🔐 Admin access: ${isAdmin} (userEmail: ${userEmail})`);
    
    // Create cache key that includes admin status for draft posts
    const cacheKey = `blog_post_${id}_${isAdmin ? 'admin' : 'public'}`;
    
    // Check LRU cache first
    const cachedPost = blogPostCache.get(cacheKey);
    if (cachedPost) {
      console.log(`🚀 Serving blog post from LRU cache: ${id}`);
      console.log(`🔍 Cached post structure:`, Object.keys(cachedPost));
      
      // Set cache control headers - disable browser cache for admin users viewing drafts
      const response = NextResponse.json(cachedPost);
      if (isAdmin && (cachedPost as any).status === 'draft') {
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // No browser cache for admin draft posts
      } else {
        response.headers.set('Cache-Control', 'public, s-maxage=1800, max-age=300'); // 30min CDN, 5min browser
      }
      response.headers.set('X-Cache-Status', 'HIT-LRU');
      return response;
    }
    
    console.log(`🔍 Blog post cache miss, fetching from database: ${id}`);
    
    // First try to parse as numeric ID for backward compatibility
    const postId = parseInt(id);
    let query = '';
    
    if (!isNaN(postId)) {
      // Numeric ID - use the old id field (for backward compatibility)
      const statusCondition = isAdmin ? '' : "AND status = 'published'";
      query = `
        SELECT 
          id,
          title,
          slug,
          content,
          excerpt,
          author,
          status,
          tags,
          TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
          TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at
        FROM blog_posts 
        WHERE id = ${postId} ${statusCondition}
      `;
    } else {
      // Assume it's a title - escape it properly
      const escapedTitle = id.replace(/'/g, "''");
      const statusCondition = isAdmin ? '' : "AND status = 'published'";
      query = `
        SELECT 
          id,
          title,
          slug,
          content,
          excerpt,
          author,
          status,
          tags,
          TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
          TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
          TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at
        FROM blog_posts 
        WHERE title = '${escapedTitle}' ${statusCondition}
      `;
    }

    const result = await executeOracleQuery(query);
    console.log(`🔍 Query result:`, { success: result.success, dataLength: result.data?.length, error: result.error });
    
    if (!result.success || !result.data || result.data.length === 0) {
      console.log(`❌ Blog post not found: ID=${id}, success=${result.success}, dataLength=${result.data?.length}`);
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const post = result.data[0];
    console.log(`🔍 Raw post data:`, Object.keys(post || {}));
    
    // Parse tags if they exist
    let parsedTags = [];
    if (post.tags) {
      try {
        parsedTags = JSON.parse(post.tags);
      } catch (e) {
        // If JSON parsing fails, treat as comma-separated string
        parsedTags = post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
      }
    }

    const blogPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      author: post.author,
      status: post.status,
      tags: parsedTags,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at
    };
    
    console.log(`✅ Blog post constructed:`, { ...blogPost, content: blogPost.content?.substring(0, 100) + '...' });
    
    // Cache the result in LRU cache
    blogPostCache.set(cacheKey, blogPost);
    console.log(`💾 Cached blog post in LRU: ${id}`);
    
    // Set cache control headers - disable browser cache for admin users viewing drafts
    const response = NextResponse.json(blogPost);
    if (isAdmin && blogPost.status === 'draft') {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // No browser cache for admin draft posts
    } else {
      response.headers.set('Cache-Control', 'public, s-maxage=1800, max-age=300'); // 30min CDN, 5min browser
    }
    response.headers.set('X-Cache-Status', 'MISS');
    return response;

  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}
