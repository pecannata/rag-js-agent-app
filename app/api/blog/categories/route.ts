import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

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

    const scriptPath = path.join(process.cwd(), 'SQLclScript.sh');
    
    // AI Posts Query - Use same structure as main blog API
    const aiQuery = `
      SELECT 
        id,
        title,
        slug,
        '' as content,
        excerpt,
        author,
        status,
        tags,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
        TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at,
        TO_CHAR(scheduled_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_date,
        is_scheduled
      FROM blog_posts
      WHERE lower(title) like '(ai)%' and status = 'published'
      ORDER BY published_at DESC`;
    
    // Computer Science Posts Query  
    const csQuery = `
      SELECT 
        id,
        title,
        slug,
        '' as content,
        excerpt,
        author,
        status,
        tags,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
        TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at,
        TO_CHAR(scheduled_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_date,
        is_scheduled
      FROM blog_posts
      WHERE lower(title) like '(cs)%' and status = 'published'
      ORDER BY published_at DESC`;
    
    // Science Posts Query (everything else)
    const scienceQuery = `
      SELECT 
        id,
        title,
        slug,
        '' as content,
        excerpt,
        author,
        status,
        tags,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
        TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at,
        TO_CHAR(scheduled_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_date,
        is_scheduled
      FROM blog_posts
      WHERE lower(title) not like '(cs)%' and lower(title) not like '(ai)%' and status = 'published'
      ORDER BY published_at DESC`;

    // Escape queries for shell execution (same approach as main blog API)
    const escapeForShell = (query: string): string => {
      return query
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')   // Escape double quotes
        .replace(/`/g, '\\`')    // Escape backticks to prevent command substitution
        .replace(/\$/g, '\\$');  // Escape dollar signs to prevent variable expansion
    };
    
    // Execute all three queries with increased buffer for large outputs
    console.log('🔄 Executing AI posts query...');
    const { stdout: aiOutput, stderr: aiError } = await execPromise(`bash "${scriptPath}" "${escapeForShell(aiQuery)}"`, {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    
    console.log('🔄 Executing CS posts query...');
    const { stdout: csOutput, stderr: csError } = await execPromise(`bash "${scriptPath}" "${escapeForShell(csQuery)}"`, {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    
    console.log('🔄 Executing Science posts query...');
    const { stdout: scienceOutput, stderr: scienceError } = await execPromise(`bash "${scriptPath}" "${escapeForShell(scienceQuery)}"`, {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });

    // Check for stderr errors first
    if (aiError) {
      console.error('❌ AI query stderr:', aiError);
    }
    if (csError) {
      console.error('❌ CS query stderr:', csError);
    }
    if (scienceError) {
      console.error('❌ Science query stderr:', scienceError);
    }

    // Parse results using exactly the same logic as the main blog API
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
        
        // Handle Oracle's specific JSON format: {results: [{items: [...]}]} - same as main blog API
        if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
          const items = parsed.results[0].items || [];
          console.log(`🔍 ${queryType} Items structure:`, items.length > 0 ? JSON.stringify(items[0], null, 2) : 'No items');
          
          // Process the results using the same logic as main blog API
          let dataArray = items;
          
          // Ensure we have an array to work with
          if (!Array.isArray(dataArray)) {
            console.log(`⚠️ ${queryType} Data is not an array, using empty array`);
            dataArray = [];
          }
          
          const posts = dataArray.map((post: any) => ({
            ...post,
            tags: post.tags ? post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [],
            createdAt: post.created_at,
            updatedAt: post.updated_at,
            publishedAt: post.published_at,
            scheduledDate: post.scheduled_date,
            isScheduled: post.is_scheduled === 1
          }));
          
          // Convert to CategoryPost format (subset of full blog post)
          const categoryPosts = posts.map((post: any) => ({
            id: post.id,
            title: post.title,
            author: post.author,
            publishedAt: post.publishedAt
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

    const aiPosts = parseResults(aiOutput, 'AI');
    const csPosts = parseResults(csOutput, 'CS');
    const sciencePosts = parseResults(scienceOutput, 'Science');

    console.log(`✅ Categorized posts loaded: AI=${aiPosts.length}, CS=${csPosts.length}, Science=${sciencePosts.length}`);

    const result: CategorizedPosts = {
      ai: aiPosts,
      cs: csPosts,
      science: sciencePosts
    };

    return NextResponse.json({
      success: true,
      categories: result
    });

  } catch (error) {
    console.error('❌ Error fetching categorized blog posts:', error);
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
