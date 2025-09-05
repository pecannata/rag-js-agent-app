import { NextRequest, NextResponse } from 'next/server';

interface CommentAction {
  commentIds: number[];
  action: 'approve' | 'reject' | 'spam' | 'delete';
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
    
    // For INSERT/UPDATE/DELETE operations, we might not get JSON back
    if (query.trim().toUpperCase().startsWith('SELECT')) {
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
    } else {
      // For non-SELECT queries, just check if the command succeeded
      return { success: true, data: null };
    }
  } catch (error: any) {
    console.error(`❌ ${errorContext} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// Check if user is admin
function isAdmin(email: string | null | undefined): boolean {
  return email === 'phil.cannata@yahoo.com';
}

// GET: Fetch all comments for admin review
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication and admin status
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!isAdmin(userEmail)) {
      return NextResponse.json({ 
        error: 'Unauthorized. Admin access required.' 
      }, { status: 403 });
    }

    // Get filter parameters
    const status = searchParams.get('status') || 'all'; // pending, approved, rejected, spam, all
    const blogPostId = searchParams.get('blogPostId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    // Build the query with filters
    let whereConditions = [];
    
    if (status !== 'all') {
      whereConditions.push(`status = '${status}'`);
    }
    
    if (blogPostId) {
      whereConditions.push(`blog_post_id = ${parseInt(blogPostId)}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

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
        notify_follow_up,
        notify_new_posts,
        ip_address,
        user_agent,
        TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
        TO_CHAR(approved_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as approved_at,
        approved_by
      FROM blog_comments 
      ${whereClause}
      ORDER BY 
        CASE status 
          WHEN 'pending' THEN 1 
          WHEN 'approved' THEN 2 
          WHEN 'rejected' THEN 3 
          WHEN 'spam' THEN 4 
          ELSE 5 
        END,
        created_at DESC
      ${limit > 0 ? `FETCH FIRST ${limit} ROWS ONLY` : ''}
    `;

    const result = await executeSQLQuery(commentsQuery, 'Fetch Comments for Admin');

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to fetch comments' 
      }, { status: 500 });
    }

    const comments = result.data?.results?.[0]?.items || [];

    // Get summary counts
    const summaryQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM blog_comments 
      GROUP BY status
      ORDER BY status
    `;

    const summaryResult = await executeSQLQuery(summaryQuery, 'Get Comment Summary');
    const summary = summaryResult.data?.results?.[0]?.items || [];

    return NextResponse.json({
      success: true,
      comments,
      summary,
      total: comments.length,
      filters: {
        status,
        blogPostId,
        limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching admin comments:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred while fetching comments'
    }, { status: 500 });
  }
}

// PUT: Moderate comments (approve/reject/spam/delete)
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body: CommentAction = await request.json();
    const userEmail = request.headers.get('x-user-email');
    
    if (!isAdmin(userEmail)) {
      return NextResponse.json({ 
        error: 'Unauthorized. Admin access required.' 
      }, { status: 403 });
    }

    // Validate input
    if (!body.commentIds || !Array.isArray(body.commentIds) || body.commentIds.length === 0) {
      return NextResponse.json({ 
        error: 'Comment IDs are required' 
      }, { status: 400 });
    }

    if (!['approve', 'reject', 'spam', 'delete'].includes(body.action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be approve, reject, spam, or delete' 
      }, { status: 400 });
    }

    const commentIds = body.commentIds.join(',');
    
    let query = '';
    let successMessage = '';

    if (body.action === 'delete') {
      // Delete comments permanently
      query = `DELETE FROM blog_comments WHERE id IN (${commentIds})`;
      successMessage = `${body.commentIds.length} comment(s) deleted successfully`;
    } else {
      // Update status
      const newStatus = body.action === 'approve' ? 'approved' : body.action;
      const approvalFields = body.action === 'approve' 
        ? `, approved_at = CURRENT_TIMESTAMP, approved_by = '${userEmail}'`
        : ', approved_at = NULL, approved_by = NULL';

      query = `
        UPDATE blog_comments 
        SET status = '${newStatus}'${approvalFields}
        WHERE id IN (${commentIds})
      `;
      
      successMessage = `${body.commentIds.length} comment(s) ${body.action === 'approve' ? 'approved' : body.action + 'ed'} successfully`;
    }

    const result = await executeSQLQuery(query, `${body.action} Comments`);

    if (!result.success) {
      console.error(`❌ Failed to ${body.action} comments:`, result.error);
      return NextResponse.json({ 
        error: `Failed to ${body.action} comments. Please try again.` 
      }, { status: 500 });
    }

    // If comments were approved, we might want to send notifications to users who opted in for follow-up comments
    // This would be a future enhancement

    console.log(`✅ ${successMessage}`);

    return NextResponse.json({
      success: true,
      message: successMessage,
      action: body.action,
      affectedComments: body.commentIds.length
    });

  } catch (error) {
    console.error('❌ Error moderating comments:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred while moderating comments'
    }, { status: 500 });
  }
}

// POST: Bulk actions or special comment operations
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userEmail = request.headers.get('x-user-email');
    
    if (!isAdmin(userEmail)) {
      return NextResponse.json({ 
        error: 'Unauthorized. Admin access required.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { operation } = body;

    switch (operation) {
      case 'approve_all_pending':
        // Approve all pending comments
        const approveAllQuery = `
          UPDATE blog_comments 
          SET status = 'approved', 
              approved_at = CURRENT_TIMESTAMP, 
              approved_by = '${userEmail}'
          WHERE status = 'pending'
        `;
        
        const approveResult = await executeSQLQuery(approveAllQuery, 'Approve All Pending Comments');
        
        if (!approveResult.success) {
          return NextResponse.json({ 
            error: 'Failed to approve all pending comments' 
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'All pending comments have been approved'
        });

      case 'delete_spam':
        // Delete all spam comments
        const deleteSpamQuery = `DELETE FROM blog_comments WHERE status = 'spam'`;
        
        const deleteResult = await executeSQLQuery(deleteSpamQuery, 'Delete Spam Comments');
        
        if (!deleteResult.success) {
          return NextResponse.json({ 
            error: 'Failed to delete spam comments' 
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'All spam comments have been deleted'
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid operation' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error processing bulk comment operation:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred while processing the operation'
    }, { status: 500 });
  }
}
