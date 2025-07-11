import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { sendPostNotification } from '../../lib/email';

const execAsync = promisify(exec);

// Utility function to escape strings for SQL and shell
function escapeSqlString(str: string): string {
  if (typeof str !== 'string') {
    return String(str);
  }
  // Comprehensive SQL string escaping
  return str
    .replace(/\\/g, '\\\\')         // Escape backslashes first
    .replace(/'/g, "''")           // Escape single quotes for SQL
    .replace(/\0/g, '')           // Remove null bytes
    .replace(/\x1a/g, '')         // Remove substitute character
    .replace(/\r\n/g, '\n')       // Normalize line endings
    .replace(/\r/g, '\n');        // Convert CR to LF
    // Note: Preserving newlines for CLOB content - SQLclScript.sh can handle them
}

// Utility function to validate and sanitize numeric IDs
function validateId(id: any): number | null {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) {
    return null;
  }
  return numId;
}

// Function to handle CLOB content insertion
async function insertBlogPostSafely(postData: {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  status: string;
  tags: string;
  publishedAt: string | null;
  scheduledDate?: string | null;
  isScheduled?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📝 Content Length: ${postData.content.length} characters`);

    // Direct CLOB insertion - SQLclScript.sh handles up to 10MB
    const insertQuery = `
      INSERT INTO blog_posts (
        title, slug, content, excerpt, author, status, tags, published_at, scheduled_date, is_scheduled
      ) VALUES (
        '${escapeSqlString(postData.title)}',
        '${escapeSqlString(postData.slug)}',
        '${escapeSqlString(postData.content)}',
        '${escapeSqlString(postData.excerpt)}',
        '${escapeSqlString(postData.author)}',
        '${escapeSqlString(postData.status)}',
        '${escapeSqlString(postData.tags)}',
        ${postData.publishedAt ? `TIMESTAMP '${escapeSqlString(postData.publishedAt)}'` : 'NULL'},
        ${postData.scheduledDate ? `TIMESTAMP '${escapeSqlString(postData.scheduledDate)}'` : 'NULL'},
        ${postData.isScheduled ? 1 : 0}
      )
    `;

    const insertResult = await executeOracleQuery(insertQuery);
    if (!insertResult.success) {
      return insertResult;
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Error in insertBlogPostSafely:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Function to handle CLOB content updates
async function updateBlogPostSafely(postData: {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  status: string;
  tags: string;
  publishedAt: string | null;
  scheduledDate?: string | null;
  isScheduled?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📝 Update: Content Length: ${postData.content.length} characters`);
    
    // Direct CLOB update - SQLclScript.sh handles up to 10MB
    const updateQuery = `
      UPDATE blog_posts SET
        title = '${escapeSqlString(postData.title)}',
        content = '${escapeSqlString(postData.content)}',
        excerpt = '${escapeSqlString(postData.excerpt)}',
        status = '${escapeSqlString(postData.status)}',
        tags = '${escapeSqlString(postData.tags)}',
        updated_at = CURRENT_TIMESTAMP,
        published_at = ${postData.publishedAt ? `TIMESTAMP '${escapeSqlString(postData.publishedAt)}'` : 'NULL'},
        scheduled_date = ${postData.scheduledDate ? `TIMESTAMP '${escapeSqlString(postData.scheduledDate)}'` : 'NULL'},
        is_scheduled = ${postData.isScheduled ? 1 : 0}
      WHERE id = ${postData.id}
    `;
    
    return await executeOracleQuery(updateQuery);
    
  } catch (error) {
    console.error('❌ Error in updateBlogPostSafely:', error);
    return { success: false, error: (error as Error).message };
  }
}

interface BlogPost {
  id?: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  scheduledDate?: string;
  isScheduled?: boolean;
}


// Function to send immediate email notifications to all active subscribers
async function sendImmediateEmailNotifications(post: any): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
  try {
    console.log('📧 Sending immediate email notifications for post:', post.title);
    
    // Get email-enabled subscribers only
    const getSubscribersQuery = `SELECT * FROM v_email_enabled_subscribers`;
    const subscribersResult = await executeOracleQuery(getSubscribersQuery);
    
    let subscribers = subscribersResult.success ? subscribersResult.data : [];
    if (!Array.isArray(subscribers)) {
      subscribers = [];
    }
    
    console.log(`👥 Found ${subscribers.length} email-enabled subscribers`);
    
    if (subscribers.length === 0) {
      console.log('ℹ️ No email-enabled subscribers to notify');
      return { success: true, sent: 0, failed: 0, errors: [] };
    }
    
    // Create email campaign record
    const createCampaignQuery = `
      INSERT INTO email_campaigns (
        post_id,
        campaign_type,
        subject,
        recipient_count,
        status
      ) VALUES (
        ${post.id},
        'post_notification',
        'New Post: ${escapeSqlString(post.title)}',
        ${subscribers.length},
        'pending'
      )
    `;
    
    const campaignResult = await executeOracleQuery(createCampaignQuery);
    
    if (!campaignResult.success) {
      console.error('❌ Failed to create email campaign:', campaignResult.error);
      return { success: false, sent: 0, failed: 0, errors: [campaignResult.error || 'Failed to create campaign'] };
    }
    
    // Get the campaign ID
    const getCampaignQuery = `
      SELECT id FROM email_campaigns 
      WHERE post_id = ${post.id} AND campaign_type = 'post_notification'
      ORDER BY created_at DESC
      FETCH FIRST 1 ROWS ONLY
    `;
    
    const campaignIdResult = await executeOracleQuery(getCampaignQuery);
    
    if (!campaignIdResult.success || !campaignIdResult.data || campaignIdResult.data.length === 0) {
      console.error('❌ Failed to get campaign ID');
      return { success: false, sent: 0, failed: 0, errors: ['Failed to get campaign ID'] };
    }
    
    const campaignId = campaignIdResult.data[0].id;
    
    // Send emails to all subscribers immediately
    let successfulSends = 0;
    let failedSends = 0;
    const errors: string[] = [];
    
    for (const subscriber of subscribers) {
      try {
        // Create initial log entry as pending
        const logQuery = `
          INSERT INTO email_campaign_logs (
            campaign_id,
            subscriber_id,
            status
          ) VALUES (
            ${campaignId},
            ${subscriber.id},
            'pending'
          )
        `;
        
        const logResult = await executeOracleQuery(logQuery);
        
        if (logResult.success) {
          // Send the email immediately
          console.log(`📧 Sending immediate email to ${subscriber.email} about post: ${post.title}`);
          
          const emailResult = await sendPostNotification(
            subscriber.email,
            {
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt,
              tags: post.tags ? post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : []
            },
            subscriber.unsubscribe_token
          );
          
          if (emailResult.success) {
            // Update log to sent
            await executeOracleQuery(`
              UPDATE email_campaign_logs 
              SET status = 'sent', sent_at = CURRENT_TIMESTAMP
              WHERE campaign_id = ${campaignId} AND subscriber_id = ${subscriber.id}
            `);
            successfulSends++;
            console.log(`✅ Email sent successfully to ${subscriber.email}`);
          } else {
            // Update log to failed
            await executeOracleQuery(`
              UPDATE email_campaign_logs 
              SET status = 'failed', error_message = '${escapeSqlString(emailResult.error || 'Unknown error')}'
              WHERE campaign_id = ${campaignId} AND subscriber_id = ${subscriber.id}
            `);
            failedSends++;
            const errorMsg = `Failed to send email to ${subscriber.email}: ${emailResult.error}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        } else {
          failedSends++;
          const errorMsg = `Failed to log email for subscriber ${subscriber.id}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
        
      } catch (error) {
        failedSends++;
        const errorMsg = `Error processing subscriber ${subscriber.id}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        
        // Try to update log with error
        try {
          await executeOracleQuery(`
            UPDATE email_campaign_logs 
            SET status = 'failed', error_message = '${escapeSqlString((error as Error).message)}'
            WHERE campaign_id = ${campaignId} AND subscriber_id = ${subscriber.id}
          `);
        } catch (logError) {
          console.error('Failed to update error log:', logError);
        }
      }
    }
    
    // Update campaign with results
    const updateCampaignQuery = `
      UPDATE email_campaigns 
      SET 
        successful_sends = ${successfulSends},
        failed_sends = ${failedSends},
        sent_date = CURRENT_TIMESTAMP,
        status = 'completed'
      WHERE id = ${campaignId}
    `;
    
    await executeOracleQuery(updateCampaignQuery);
    
    console.log(`📧 Email campaign completed: ${successfulSends} sent, ${failedSends} failed`);
    
    return { success: true, sent: successfulSends, failed: failedSends, errors };
    
  } catch (error) {
    console.error('❌ Error in sendImmediateEmailNotifications:', error);
    return { success: false, sent: 0, failed: 0, errors: [(error as Error).message] };
  }
}

// Oracle database execution function
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Blog Database Query Execution:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    // Determine query type for better handling
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE', 'CREATE', 'DROP', 'ALTER'].includes(queryType);
    
    // Execute the SQLclScript.sh with the SQL query
    // Simple escaping - just escape double quotes for the shell command
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Blog database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Blog database query executed successfully');
    
    // Handle modification queries (UPDATE, INSERT, DELETE) that typically return empty or status messages
    if (isModificationQuery) {
      const trimmedOutput = stdout.trim();
      console.log('📝 Modification query completed', queryType, '- Output:', trimmedOutput || '(empty - success)');
      return { success: true, data: trimmedOutput || 'Operation completed successfully' };
    }
    
    // For data queries (SELECT), expect JSON output
    if (isDataQuery) {
      console.log('📤 Raw Oracle Output (first 500 chars):', stdout.substring(0, 500) + (stdout.length > 500 ? '...' : ''));
    }
    
    // Parse JSON response for SELECT queries
    try {
      const jsonData = JSON.parse(stdout);
      console.log('✅ Successfully parsed as JSON. Structure:', JSON.stringify(jsonData, null, 2).substring(0, 500));
      
      // Handle Oracle's specific JSON format: {results: [{items: [...]}]}
      if (jsonData.results && Array.isArray(jsonData.results) && jsonData.results.length > 0) {
        const items = jsonData.results[0].items || [];
        console.log('✅ Extracted Oracle items:', items.length, 'rows');
        return { success: true, data: items };
      }
      
      // Handle direct array format (fallback)
      if (Array.isArray(jsonData)) {
        console.log('✅ Direct array format');
        return { success: true, data: jsonData };
      }
      
      // Handle single object (wrap in array)
      console.log('ℹ️ Single object, wrapping in array');
      return { success: true, data: [jsonData] };
      
    } catch (_parseError) {
      // If not JSON, handle appropriately based on query type
      const trimmedOutput = stdout.trim();
      
      if (isDataQuery) {
        console.log('⚠️ SELECT query could not parse as JSON. Trimmed output:', trimmedOutput.substring(0, 200));
        if (trimmedOutput === '' || trimmedOutput === 'no rows selected' || trimmedOutput.toLowerCase().includes('no rows')) {
          console.log('✅ Treating as empty result set');
          return { success: true, data: [] };
        }
        // For other non-JSON output from SELECT, return as-is
        console.log('ℹ️ Returning raw output as string');
        return { success: true, data: trimmedOutput };
      } else {
        // For non-SELECT queries, empty or non-JSON output is typically success
        console.log('✅ Non-SELECT query completed successfully');
        return { success: true, data: trimmedOutput || 'Operation completed successfully' };
      }
    }
  } catch (error) {
    console.error('❌ Blog database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Global flag to track if table has been checked
let tableInitialized = false;

// Initialize blog posts table if it doesn't exist
async function initializeBlogTable(): Promise<boolean> {
  // Only check once per application lifecycle
  if (tableInitialized) {
    return true;
  }

  // First, check if table exists by trying to query it
  const checkTableQuery = `SELECT COUNT(*) as count FROM blog_posts WHERE ROWNUM <= 1`;
  const checkResult = await executeOracleQuery(checkTableQuery);
  
  if (checkResult.success) {
    console.log('✅ Blog posts table already exists (verified by query)');
    tableInitialized = true;
    return true;
  }
  
  // If query failed, table likely doesn't exist, so create it
  console.log('📋 Blog posts table does not exist, creating it...');
  
  const createTableQuery = `
    CREATE TABLE blog_posts (
      id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      title VARCHAR2(500) NOT NULL,
      slug VARCHAR2(500) UNIQUE NOT NULL,
      content CLOB NOT NULL,
      excerpt VARCHAR2(1000),
      author VARCHAR2(255) NOT NULL,
      status VARCHAR2(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      tags VARCHAR2(2000),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      published_at TIMESTAMP
    )
  `;

  const result = await executeOracleQuery(createTableQuery);
  
  if (result.success) {
    console.log('✅ Blog posts table created successfully');
    tableInitialized = true;
    return true;
  }
  
  console.error('❌ Failed to create blog posts table:', result.error);
  return false;
}

// Generate unique slug
function generateSlug(title: string, id?: number): string {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  if (id) {
    slug += `-${id}`;
  }
  
  return slug;
}

// GET /api/blog - Get all blog posts
export async function GET(request: NextRequest) {
  try {
    // Initialize table if needed
    await initializeBlogTable();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    
    let query = `
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
        TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at,
        TO_CHAR(scheduled_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_date,
        is_scheduled
      FROM blog_posts
    `;
    
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(`status = '${status}'`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY updated_at DESC';
    
    if (limit) {
      query += ` FETCH FIRST ${parseInt(limit)} ROWS ONLY`;
      if (offset) {
        query += ` OFFSET ${parseInt(offset)} ROWS`;
      }
    }
    
    const result = await executeOracleQuery(query);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch blog posts' },
        { status: 500 }
      );
    }
    
    // Process the results - Oracle response format already handled in executeOracleQuery
    let dataArray = result.data;
    
    // Debug log to see the actual data structure
    console.log('📊 Blog query result structure:', typeof result.data, Array.isArray(result.data), result.data?.length || 0);
    
    // Ensure we have an array to work with
    if (!Array.isArray(dataArray)) {
      console.log('⚠️ Data is not an array, using empty array');
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
    
    return NextResponse.json({ success: true, posts });
    
  } catch (error) {
    console.error('Error in blog GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/blog - Create new blog post
export async function POST(request: NextRequest) {
  try {
    const postData: BlogPost = await request.json();
    
    // Validate required fields
    if (!postData.title?.trim() || !postData.content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    // Initialize table if needed
    await initializeBlogTable();
    
    // Generate slug
    const baseSlug = generateSlug(postData.title);
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug exists and make it unique
    let slugCheckQuery = `SELECT COUNT(*) as count FROM blog_posts WHERE slug = '${slug}'`;
    let slugResult = await executeOracleQuery(slugCheckQuery);
    
    while (slugResult.success && slugResult.data[0]?.count > 0) {
      slug = `${baseSlug}-${counter}`;
      slugCheckQuery = `SELECT COUNT(*) as count FROM blog_posts WHERE slug = '${slug}'`;
      slugResult = await executeOracleQuery(slugCheckQuery);
      counter++;
    }
    
    // Set default values
    const author = 'Blog Author'; // You might want to get this from session
    const now = new Date().toISOString();
    
    // Handle scheduling logic
    let publishedAt = null;
    let scheduledDate = null;
    let isScheduled = false;
    
    if (postData.status === 'published') {
      publishedAt = now;
    } else if (postData.status === 'scheduled' && postData.scheduledDate) {
      scheduledDate = postData.scheduledDate;
      isScheduled = true;
    }
    
    // Generate excerpt if not provided
    let excerpt = postData.excerpt;
    if (!excerpt?.trim()) {
      const plainText = postData.content
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim();
      
      excerpt = plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
    }
    
    // Use simplified CLOB insertion method
    console.log('📝 Content Length:', postData.content.length);
    console.log('📝 Content Preview:', postData.content.substring(0, 100) + '...');
    
    const result = await insertBlogPostSafely({
      title: postData.title,
      slug: slug,
      content: postData.content,
      excerpt: excerpt,
      author: author,
      status: postData.status,
      tags: postData.tags.join(', '),
      publishedAt: publishedAt ? publishedAt.replace('T', ' ').replace('Z', '') : null,
      scheduledDate: scheduledDate ? scheduledDate.replace('T', ' ').replace('Z', '') : null,
      isScheduled: isScheduled
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create blog post' },
        { status: 500 }
      );
    }
    
    // Get the created post
    const getPostQuery = `
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
        TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at,
        TO_CHAR(scheduled_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_date,
        is_scheduled
      FROM blog_posts 
      WHERE slug = '${slug}'
    `;
    
    const getResult = await executeOracleQuery(getPostQuery);
    
    // Handle the result - Oracle response format already handled in executeOracleQuery
    let retrievedData = getResult.data;
    
    // Ensure we have an array to work with
    if (!Array.isArray(retrievedData)) {
      console.log('⚠️ Retrieved data is not an array, using empty array');
      retrievedData = [];
    }
    
    if (getResult.success && retrievedData.length > 0) {
      const post = retrievedData[0];
      const formattedPost = {
        ...post,
        tags: post.tags ? post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [],
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        publishedAt: post.published_at,
        scheduledDate: post.scheduled_date,
        isScheduled: post.is_scheduled === 1
      };
      
      // If this is a published post, send email notifications immediately
      if (postData.status === 'published') {
        try {
          console.log('📧 Sending immediate email notifications for published post:', post.title);
          
          const emailResult = await sendImmediateEmailNotifications(post);
          
          if (emailResult.success) {
            console.log(`✅ Email notifications sent successfully: ${emailResult.sent} sent, ${emailResult.failed} failed`);
            if (emailResult.errors.length > 0) {
              console.warn('⚠️ Some emails failed:', emailResult.errors);
            }
          } else {
            console.error('❌ Failed to send email notifications:', emailResult.errors);
          }
        } catch (emailError) {
          console.error('❌ Error sending email notifications:', emailError);
          // Don't fail the post creation if email sending fails
        }
      }
      
      return NextResponse.json({ success: true, post: formattedPost });
    }
    
    return NextResponse.json({ success: true, message: 'Blog post created successfully' });
    
  } catch (error) {
    console.error('Error in blog POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/blog - Update existing blog post
export async function PUT(request: NextRequest) {
  try {
    const postData: BlogPost = await request.json();
    
    // Validate required fields
    const validId = validateId(postData.id);
    if (!validId) {
      return NextResponse.json(
        { error: 'Valid Post ID is required for updates' },
        { status: 400 }
      );
    }
    
    if (!postData.title?.trim() || !postData.content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    // Check if post exists
    const checkQuery = `SELECT id, status, published_at FROM blog_posts WHERE id = ${validId}`;
    const checkResult = await executeOracleQuery(checkQuery);
    
    // Handle check result - Oracle response format already handled in executeOracleQuery
    let checkData = checkResult.data;
    
    // Ensure we have an array to work with
    if (!Array.isArray(checkData)) {
      console.log('⚠️ Check data is not an array, using empty array');
      checkData = [];
    }
    
    if (!checkResult.success || checkData.length === 0) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    const existingPost = checkData[0];
    
    // Handle published_at and scheduling logic
    let publishedAt = existingPost.published_at;
    let scheduledDate = null;
    let isScheduled = false;
    
    if (postData.status === 'published' && existingPost.status !== 'published') {
      // Publishing for the first time
      publishedAt = new Date().toISOString();
    } else if (postData.status === 'scheduled' && postData.scheduledDate) {
      // Scheduling the post
      scheduledDate = postData.scheduledDate;
      isScheduled = true;
      publishedAt = null; // Clear published_at when scheduling
    } else if (postData.status !== 'published' && postData.status !== 'scheduled') {
      // Unpublishing/drafting
      publishedAt = null;
      scheduledDate = null;
      isScheduled = false;
    }
    
    // Generate excerpt if not provided
    let excerpt = postData.excerpt;
    if (!excerpt?.trim()) {
      const plainText = postData.content
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim();
      
      excerpt = plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
    }
    
    // Use safe update method
    console.log('📝 Update: Content Length:', postData.content.length);
    
    const result = await updateBlogPostSafely({
      id: validId,
      title: postData.title,
      content: postData.content,
      excerpt: excerpt,
      status: postData.status,
      tags: postData.tags ? postData.tags.join(', ') : '',
      publishedAt: publishedAt ? publishedAt.replace('T', ' ').replace('Z', '') : null,
      scheduledDate: scheduledDate ? scheduledDate.replace('T', ' ').replace('Z', '') : null,
      isScheduled: isScheduled
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update blog post' },
        { status: 500 }
      );
    }
    
    // Get the updated post
    const getPostQuery = `
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
        TO_CHAR(published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at,
        TO_CHAR(scheduled_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_date,
        is_scheduled
      FROM blog_posts 
      WHERE id = ${validId}
    `;
    
    const getResult = await executeOracleQuery(getPostQuery);
    
    // Handle final result - Oracle response format already handled in executeOracleQuery
    let finalData = getResult.data;
    
    // Ensure we have an array to work with
    if (!Array.isArray(finalData)) {
      console.log('⚠️ Final data is not an array, using empty array');
      finalData = [];
    }
    
    if (getResult.success && finalData.length > 0) {
      const post = finalData[0];
      const formattedPost = {
        ...post,
        tags: post.tags ? post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [],
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        publishedAt: post.published_at,
        scheduledDate: post.scheduled_date,
        isScheduled: post.is_scheduled === 1
      };
      
      // If this post was just published (status changed from non-published to published), send email notifications immediately
      if (postData.status === 'published' && existingPost.status !== 'published') {
        try {
          console.log('📧 Sending immediate email notifications for newly published post:', post.title);
          
          const emailResult = await sendImmediateEmailNotifications(post);
          
          if (emailResult.success) {
            console.log(`✅ Email notifications sent successfully for updated post: ${emailResult.sent} sent, ${emailResult.failed} failed`);
            if (emailResult.errors.length > 0) {
              console.warn('⚠️ Some emails failed for updated post:', emailResult.errors);
            }
          } else {
            console.error('❌ Failed to send email notifications for updated post:', emailResult.errors);
          }
        } catch (emailError) {
          console.error('❌ Error sending email notifications for updated post:', emailError);
          // Don't fail the post update if email sending fails
        }
      }
      
      return NextResponse.json({ success: true, post: formattedPost });
    }
    
    return NextResponse.json({ success: true, message: 'Blog post updated successfully' });
    
  } catch (error) {
    console.error('Error in blog PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/blog - Delete blog post
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    const validId = validateId(id);
    if (!validId) {
      return NextResponse.json(
        { error: 'Valid Post ID is required' },
        { status: 400 }
      );
    }
    
    // Check if post exists
    const checkQuery = `SELECT id FROM blog_posts WHERE id = ${validId}`;
    const checkResult = await executeOracleQuery(checkQuery);
    
    // Handle check result - Oracle response format already handled in executeOracleQuery
    let checkData = checkResult.data;
    
    // Ensure we have an array to work with
    if (!Array.isArray(checkData)) {
      console.log('⚠️ Check data is not an array, using empty array');
      checkData = [];
    }
    
    if (!checkResult.success || checkData.length === 0) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }
    
    const deleteQuery = `DELETE FROM blog_posts WHERE id = ${validId}`;
    const result = await executeOracleQuery(deleteQuery);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete blog post' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Blog post deleted successfully' });
    
  } catch (error) {
    console.error('Error in blog DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
