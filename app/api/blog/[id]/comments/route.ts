import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '../../../../../lib/admin';

interface CommentSubmission {
  authorName: string;
  authorEmail: string;
  authorWebsite?: string;
  commentContent: string;
  notifyFollowUp: boolean;
  notifyNewPosts: boolean;
  saveInfo: boolean;
}


// Helper function to get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    const firstForwarded = forwarded.split(',')[0];
    if (firstForwarded) {
      return firstForwarded.trim();
    }
  }
  
  if (real) {
    return real.trim();
  }
  
  return 'unknown';
}

// Helper function to execute SQL queries with proper error handling
async function executeSQLQuery(query: string, errorContext: string = 'SQL Query') {
  console.log(`🔍 ${errorContext}:`, query);
  
  try {
    const { execSync } = require('child_process');
    const result = execSync(`./SQLclScript.sh "${query.replace(/"/g, '\\"')}"`, { 
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 30000
    });
    
    console.log(`✅ ${errorContext} executed successfully`);
    console.log('📤 Raw Oracle Output (first 500 chars):', result.substring(0, 500));
    
    // Extract JSON from the result
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('⚠️ No JSON found in Oracle output');
      return { success: true, data: null };
    }
    
    const cleanedOutput = jsonMatch[0];
    console.log('🧹 Cleaned Oracle output (first 500 chars):', cleanedOutput.substring(0, 500));
    
    try {
      const parsedData = JSON.parse(cleanedOutput);
      console.log(`✅ Successfully parsed as JSON. Structure:`, {
        resultsCount: parsedData.results?.length || 0,
        firstResultColumns: parsedData.results?.[0]?.columns?.length || 0,
        firstResultItems: parsedData.results?.[0]?.items?.length || 0
      });
      
      return { success: true, data: parsedData };
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.log('🔍 Attempted to parse:', cleanedOutput.substring(0, 200));
      return { success: false, error: 'Failed to parse database response' };
    }
  } catch (error: any) {
    console.error(`❌ ${errorContext} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// POST: Submit a new comment
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const blogPostId = parseInt(params.id);
    if (isNaN(blogPostId)) {
      return NextResponse.json({ error: 'Invalid blog post ID' }, { status: 400 });
    }

    // Parse the request body
    const body: CommentSubmission = await request.json();
    
    // Validate required fields
    if (!body.authorName?.trim() || !body.authorEmail?.trim() || !body.commentContent?.trim()) {
      return NextResponse.json({ 
        error: 'Name, email, and comment content are required' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.authorEmail)) {
      return NextResponse.json({ 
        error: 'Please provide a valid email address' 
      }, { status: 400 });
    }

    // First, get the blog post title for the foreign key
    const postQuery = `SELECT title FROM blog_posts WHERE id = ${blogPostId}`;
    const postResult = await executeSQLQuery(postQuery, 'Get Blog Post Title');
    
    if (!postResult.success || !postResult.data?.results?.[0]?.items?.[0]) {
      return NextResponse.json({ 
        error: 'Blog post not found' 
      }, { status: 404 });
    }

    const blogPostTitle = postResult.data.results[0].items[0].title;
    
    // Get client metadata
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Prepare comment data for insertion
    const commentData = {
      blog_post_id: blogPostId,
      blog_post_title: blogPostTitle,
      author_name: body.authorName.trim(),
      author_email: body.authorEmail.trim().toLowerCase(),
      author_website: body.authorWebsite?.trim() || null,
      comment_content: body.commentContent.trim(),
      status: 'pending', // All comments start as pending for moderation
      notify_follow_up: body.notifyFollowUp ? 'Y' : 'N',
      notify_new_posts: body.notifyNewPosts ? 'Y' : 'N',
      save_info: body.saveInfo ? 'Y' : 'N',
      ip_address: clientIP,
      user_agent: userAgent.substring(0, 500) // Truncate to fit column limit
    };

    // Build the INSERT query
    const insertQuery = `
      INSERT INTO blog_comments (
        blog_post_id,
        blog_post_title,
        author_name,
        author_email,
        author_website,
        comment_content,
        status,
        notify_follow_up,
        notify_new_posts,
        save_info,
        ip_address,
        user_agent
      ) VALUES (
        ${commentData.blog_post_id},
        '${commentData.blog_post_title.replace(/'/g, "''")}',
        '${commentData.author_name.replace(/'/g, "''")}',
        '${commentData.author_email}',
        ${commentData.author_website ? `'${commentData.author_website.replace(/'/g, "''")}'` : 'NULL'},
        '${commentData.comment_content.replace(/'/g, "''")}',
        '${commentData.status}',
        '${commentData.notify_follow_up}',
        '${commentData.notify_new_posts}',
        '${commentData.save_info}',
        '${commentData.ip_address}',
        '${commentData.user_agent.replace(/'/g, "''")}'
      )
    `;

    const insertResult = await executeSQLQuery(insertQuery, 'Insert New Comment');
    
    if (!insertResult.success) {
      console.error('❌ Failed to insert comment:', insertResult.error);
      return NextResponse.json({ 
        error: 'Failed to submit comment. Please try again.' 
      }, { status: 500 });
    }

    // If user opted for new post notifications, add them to subscribers if not already there
    if (body.notifyNewPosts) {
      const subscriberQuery = `
        INSERT INTO blog_subscribers (email, verified, created_at)
        SELECT '${commentData.author_email}', 'Y', CURRENT_TIMESTAMP
        FROM dual
        WHERE NOT EXISTS (
          SELECT 1 FROM blog_subscribers WHERE LOWER(email) = '${commentData.author_email}'
        )
      `;
      
      await executeSQLQuery(subscriberQuery, 'Add to Blog Subscribers');
    }

    console.log('✅ Comment submitted successfully for moderation');

    return NextResponse.json({
      success: true,
      message: 'Your comment has been submitted and is awaiting moderation. It will appear once approved.',
      comment: {
        author: body.authorName,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ Error processing comment submission:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred while submitting your comment'
    }, { status: 500 });
  }
}

// GET: Fetch comments for a blog post
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const blogPostId = parseInt(params.id);
    if (isNaN(blogPostId)) {
      return NextResponse.json({ error: 'Invalid blog post ID' }, { status: 400 });
    }

    // Check if this is an admin request (simple check via user agent or special header)
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    const userEmail = searchParams.get('userEmail');
    const isAdmin = isAdminEmail(userEmail);
    
    // Build query based on user permissions
    let statusFilter = "";
    if (!isAdmin || !includeAll) {
      statusFilter = "AND status = 'approved'";
    }

    const commentsQuery = `
      SELECT 
        id,
        blog_post_id,
        blog_post_title,
        author_name,
        author_email,
        author_website,
        comment_content,
        status,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(approved_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as approved_at,
        approved_by
      FROM blog_comments 
      WHERE blog_post_id = ${blogPostId} 
      ${statusFilter}
      ORDER BY created_at ASC
    `;

    const result = await executeSQLQuery(commentsQuery, 'Fetch Blog Comments');

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to fetch comments' 
      }, { status: 500 });
    }

    const comments = result.data?.results?.[0]?.items || [];
    
    // Simplify: Always include status field, but hide sensitive info for non-admin users
    const sanitizedComments = comments.map((comment: any) => {
      const sanitized: any = {
        id: comment.id,
        author_name: comment.author_name,
        comment_content: comment.comment_content,
        created_at: comment.created_at,
        status: comment.status, // Always include status for filtering
      };

      // Only include additional sensitive fields for admin users
      if (isAdmin && includeAll) {
        sanitized.author_email = comment.author_email;
        sanitized.author_website = comment.author_website;
        sanitized.approved_at = comment.approved_at;
        sanitized.approved_by = comment.approved_by;
      }

      return sanitized;
    });

    return NextResponse.json({
      success: true,
      comments: sanitizedComments,
      total: comments.length,
      blogPostId
    });

  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred while fetching comments'
    }, { status: 500 });
  }
}
