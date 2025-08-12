import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { appCache } from '../../../../lib/cache';

const execPromise = promisify(exec);

interface CategoryPost {
  id: number;
  title: string;
  author: string;
  publishedAt: string;
}

interface CategorizedPosts {
  ai: CategoryPost[];
  cs: CategoryPost[];
  science: CategoryPost[];
}

export async function GET() {
  try {
    console.log('🔍 Fetching categorized blog posts...');

    // CACHING: Check cache first (using node-cache)
    const cacheKey = 'categorized_blog_posts';
    const cachedResult = appCache.get(cacheKey);
    if (cachedResult) {
      console.log('🚀 Serving categorized posts from node-cache');
      
      // Set appropriate cache headers for browser/CDN caching
      const response = NextResponse.json(cachedResult);
      response.headers.set('Cache-Control', 'public, s-maxage=1800, max-age=300'); // 30min CDN, 5min browser
      response.headers.set('X-Cache-Status', 'HIT');
      return response;
    }

    const scriptPath = path.join(process.cwd(), 'SQLclScript.sh');
    
    // PERFORMANCE OPTIMIZATION: Single query with CASE statements instead of 3 separate queries
    // This reduces database round trips and improves performance significantly
    // Uses SUBSTR for first 4 chars to avoid full title scans
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
    
    console.log('🚀 Executing single optimized categorized query...');
    
    const { stdout: output, stderr: error } = await execPromise(`bash "${scriptPath}" "${escapeForShell(optimizedCategorizedQuery)}"`, {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    
    if (error) {
      console.error('❌ Categorized query stderr:', error);
    }
    
    console.log('✅ Optimized categorized query completed');
    
    // Parse the single result and categorize client-side
    const allPosts = parseOptimizedResults(output);
    
    // Categorize posts efficiently
    const categorizedPosts: CategorizedPosts = {
      ai: allPosts.filter(post => post.category === 'ai').map(({ category, ...post }) => post),
      cs: allPosts.filter(post => post.category === 'cs').map(({ category, ...post }) => post),
      science: allPosts.filter(post => post.category === 'science').map(({ category, ...post }) => post)
    };
    
    console.log(`✅ Categorized posts optimized: AI=${categorizedPosts.ai.length}, CS=${categorizedPosts.cs.length}, Science=${categorizedPosts.science.length}`);
    
    const responseData = {
      success: true,
      categories: categorizedPosts
    };
    
    // CACHING: Store result in node-cache with 30-minute TTL
    appCache.set(cacheKey, responseData, 1800); // 30 minutes
    console.log('🗄️ Stored categorized posts in node-cache');
    
    // Set HTTP cache headers for browser/CDN caching
    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'public, s-maxage=1800, max-age=300'); // 30min CDN, 5min browser
    response.headers.set('X-Cache-Status', 'MISS');
    
    return response;
    
  } catch (error) {
    console.error('❌ Error in optimized categorized posts:', error);
    
    // FALLBACK: If optimized query fails, fall back to original approach
    console.log('⚠️ Falling back to original 3-query approach...');
    
    try {
      return await getOriginalCategorizedPosts();
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch categorized blog posts',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
}

// Optimized result parser for single query approach
function parseOptimizedResults(output: string): (CategoryPost & { category: string })[] {
  try {
    console.log('📤 Optimized Raw Output (first 500 chars):', output.substring(0, 500));
    
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
    console.log('🧹 Cleaned optimized output (first 500 chars):', cleanOutput.substring(0, 500));
    
    const trimmedOutput = cleanOutput.trim();
    
    // Check if output contains Oracle errors
    if (trimmedOutput.includes('Error starting at line') || 
        trimmedOutput.includes('ORA-') || 
        trimmedOutput.includes('Error report') ||
        trimmedOutput.startsWith('Error')) {
      console.error('❌ Optimized Oracle Error detected:', trimmedOutput);
      return [];
    }
    
    // Handle empty results
    if (trimmedOutput === '' || 
        trimmedOutput === 'no rows selected' || 
        trimmedOutput.toLowerCase().includes('no rows')) {
      console.log('✅ Optimized Empty result set (no matching posts)');
      return [];
    }
    
    // Parse JSON response
    const parsed = JSON.parse(cleanOutput);
    console.log('✅ Optimized Successfully parsed as JSON');
    
    // Handle Oracle's specific JSON format: {results: [{items: [...]}]}
    if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
      const items = parsed.results[0].items || [];
      console.log('🔍 Optimized Items structure:', items.length > 0 ? JSON.stringify(items[0], null, 2) : 'No items');
      
      // Process the results - much simpler since we only need 4 fields
      let dataArray = items;
      
      if (!Array.isArray(dataArray)) {
        console.log('⚠️ Optimized Data is not an array, using empty array');
        dataArray = [];
      }
      
      const posts = dataArray.map((post: any) => ({
        id: post.id,
        title: post.title,
        author: post.author,
        publishedAt: post.published_at,
        category: post.category
      }));
      
      console.log(`✅ Optimized Extracted ${posts.length} posts`);
      if (posts.length > 0) {
        console.log('✅ Optimized Sample post:', posts[0]);
      }
      return posts;
    }
    
    // Handle direct array format (fallback)
    if (Array.isArray(parsed)) {
      console.log('✅ Optimized Direct array format');
      return parsed.map((item: any) => ({
        id: parseInt(item[0]),
        title: item[1],
        author: item[2],
        publishedAt: item[3],
        category: item[4]
      }));
    }
    
    console.log('⚠️ Optimized No items found in results structure');
    return [];
    
  } catch (error) {
    console.error('❌ Optimized Error parsing query results:', error);
    console.error('❌ Optimized Raw output that failed to parse:', output);
    
    // Try to handle non-JSON output gracefully
    const trimmedOutput = output.trim();
    if (trimmedOutput === '' || 
        trimmedOutput === 'no rows selected' || 
        trimmedOutput.toLowerCase().includes('no rows')) {
      console.log('✅ Optimized Treating non-JSON empty result as success');
      return [];
    }
    
    return [];
  }
}

// Original approach as fallback
async function getOriginalCategorizedPosts() {
  const scriptPath = path.join(process.cwd(), 'SQLclScript.sh');
  
  // FALLBACK: Original 3 separate queries (more selective to reduce data)
  const aiQuery = `
    SELECT 
      id,
      title,
      author,
      TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at
    FROM blog_posts
    WHERE UPPER(SUBSTR(title, 1, 4)) = '(AI)' AND status = 'published'
    ORDER BY published_at DESC`;
  
  const csQuery = `
    SELECT 
      id,
      title,
      author,
      TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at
    FROM blog_posts
    WHERE UPPER(SUBSTR(title, 1, 4)) = '(CS)' AND status = 'published'
    ORDER BY published_at DESC`;
  
  const scienceQuery = `
    SELECT 
      id,
      title,
      author,
      TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at
    FROM blog_posts
    WHERE UPPER(SUBSTR(title, 1, 4)) NOT IN ('(AI)', '(CS)') AND status = 'published'
    ORDER BY published_at DESC`;

  // Execute all three queries in parallel (fallback performance optimization)
  console.log('🔄 Executing fallback category queries in parallel...');
  const [
    { stdout: aiOutput, stderr: aiError },
    { stdout: csOutput, stderr: csError },
    { stdout: scienceOutput, stderr: scienceError }
  ] = await Promise.all([
    execPromise(`bash "${scriptPath}" "${escapeForShell(aiQuery)}"`, {
      maxBuffer: 50 * 1024 * 1024
    }),
    execPromise(`bash "${scriptPath}" "${escapeForShell(csQuery)}"`, {
      maxBuffer: 50 * 1024 * 1024
    }),
    execPromise(`bash "${scriptPath}" "${escapeForShell(scienceQuery)}"`, {
      maxBuffer: 50 * 1024 * 1024
    })
  ]);
  console.log('✅ All fallback category queries completed');

  if (aiError) console.error('❌ Fallback AI query stderr:', aiError);
  if (csError) console.error('❌ Fallback CS query stderr:', csError);
  if (scienceError) console.error('❌ Fallback Science query stderr:', scienceError);

  const aiPosts = parseResults(aiOutput, 'AI');
  const csPosts = parseResults(csOutput, 'CS');
  const sciencePosts = parseResults(scienceOutput, 'Science');

  console.log(`✅ Fallback categorized posts: AI=${aiPosts.length}, CS=${csPosts.length}, Science=${sciencePosts.length}`);

  return NextResponse.json({
    success: true,
    categories: {
      ai: aiPosts,
      cs: csPosts,
      science: sciencePosts
    }
  });
}

// Escape queries for shell execution (same approach as main blog API)
const escapeForShell = (query: string): string => {
  return query
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"')   // Escape double quotes
    .replace(/`/g, '\\`')    // Escape backticks to prevent command substitution
    .replace(/\$/g, '\\$');  // Escape dollar signs to prevent variable expansion
};

// Fallback parseResults function for the original 3-query approach
const parseResults = (output: string, queryType: string): CategoryPost[] => {
  try {
    console.log(`📤 ${queryType} Raw Output (first 500 chars):`, output.substring(0, 500));
    
    const trimmedOutput = output.trim();
    
    // Check if output contains Oracle errors
    if (trimmedOutput.includes('Error starting at line') || 
        trimmedOutput.includes('ORA-') || 
        trimmedOutput.includes('Error report') ||
        trimmedOutput.startsWith('Error')) {
      console.error(`❌ ${queryType} Oracle Error detected:`, trimmedOutput);
      return [];
    }
    
    // Handle empty results
    if (trimmedOutput === '' || 
        trimmedOutput === 'no rows selected' || 
        trimmedOutput.toLowerCase().includes('no rows')) {
      console.log(`✅ ${queryType} Empty result set (no matching posts)`);
      return [];
    }
    
    // Parse JSON response
    const parsed = JSON.parse(output);
    console.log(`✅ ${queryType} Successfully parsed as JSON`);
    
    // Handle Oracle's specific JSON format: {results: [{items: [...]}]}
    if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
      const items = parsed.results[0].items || [];
      console.log(`🔍 ${queryType} Items structure:`, items.length > 0 ? JSON.stringify(items[0], null, 2) : 'No items');
      
      let dataArray = items;
      
      if (!Array.isArray(dataArray)) {
        console.log(`⚠️ ${queryType} Data is not an array, using empty array`);
        dataArray = [];
      }
      
      // Simple mapping since we only select the 4 needed fields
      const categoryPosts = dataArray.map((post: any) => ({
        id: post.id,
        title: post.title,
        author: post.author,
        publishedAt: post.published_at
      }));
      
      console.log(`✅ ${queryType} Extracted ${categoryPosts.length} items`);
      if (categoryPosts.length > 0) {
        console.log(`✅ ${queryType} Sample post:`, categoryPosts[0]);
      }
      return categoryPosts;
    }
    
    // Handle direct array format (fallback)
    if (Array.isArray(parsed)) {
      console.log(`✅ ${queryType} Direct array format`);
      return parsed.map((item: any) => ({
        id: parseInt(item[0]),
        title: item[1],
        author: item[2],
        publishedAt: item[3]
      }));
    }
    
    console.log(`⚠️ ${queryType} No items found in results structure`);
    return [];
    
  } catch (error) {
    console.error(`❌ ${queryType} Error parsing query results:`, error);
    console.error(`❌ ${queryType} Raw output that failed to parse:`, output);
    
    // Try to handle non-JSON output gracefully
    const trimmedOutput = output.trim();
    if (trimmedOutput === '' || 
        trimmedOutput === 'no rows selected' || 
        trimmedOutput.toLowerCase().includes('no rows')) {
      console.log(`✅ ${queryType} Treating non-JSON empty result as success`);
      return [];
    }
    
    return [];
  }
};

