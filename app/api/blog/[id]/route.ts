import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
      const jsonData = JSON.parse(stdout);
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // First try to parse as numeric ID for backward compatibility
    const postId = parseInt(id);
    let query = '';
    
    if (!isNaN(postId)) {
      // Numeric ID - use the old id field (for backward compatibility)
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
        WHERE id = ${postId} AND status = 'published'
      `;
    } else {
      // Assume it's a title - escape it properly
      const escapedTitle = id.replace(/'/g, "''");
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
        WHERE title = '${escapedTitle}' AND status = 'published'
      `;
    }

    const result = await executeOracleQuery(query);
    
    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const post = result.data[0];
    
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

    return NextResponse.json(blogPost);

  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}
