import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { queueEmailJob } from '../../lib/background-jobs';

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
    .replace(/\u2018/g, "''")     // Escape left single quotation mark (U+2018)
    .replace(/\u2019/g, "''")     // Escape right single quotation mark (U+2019)
    .replace(/\u201C/g, '\"')     // Escape left double quotation mark (U+201C)
    .replace(/\u201D/g, '\"')     // Escape right double quotation mark (U+201D)
    .replace(/\u2013/g, '-')        // Replace en dash with regular dash
    .replace(/\u2014/g, '--')       // Replace em dash with double dash
    .replace(/\u2026/g, '...')       // Replace ellipsis with three dots
    .replace(/\0/g, '')             // Remove null bytes
    .replace(/\x1a/g, '')           // Remove substitute character
    .replace(/\r\n/g, ' ')           // Convert CRLF to spaces
    .replace(/\r/g, ' ')             // Convert CR to spaces  
    .replace(/\n/g, ' ')             // Convert LF to spaces
    .replace(/\s+/g, ' ')            // Collapse multiple spaces to single space
    .trim();                         // Remove leading/trailing whitespace
    // Note: Converting newlines to spaces to prevent SQL statement termination while preserving readability
}

// Utility function to validate and sanitize numeric IDs
function validateId(id: any): number | null {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) {
    return null;
  }
  return numId;
}

// Function to handle CLOB content insertion with chunking for large content
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

    // Check if content is large and needs TO_CLOB() chunking
    if (postData.content.length > 4000) {
      console.log('⚠️ Content is large, using TO_CLOB() chunking strategy...');
      
      // Split content into manageable chunks for Oracle (less than 4000 chars each)
      const chunkSize = 2000; // Conservative size to account for escaping and special characters
      const chunks: string[] = [];
      
      for (let i = 0; i < postData.content.length; i += chunkSize) {
        chunks.push(postData.content.substring(i, i + chunkSize));
      }
      
      console.log(`📊 Split content into ${chunks.length} chunks for TO_CLOB() concatenation`);
      
      // Build INSERT statement with TO_CLOB() concatenation for content
      let insertQuery = `
        INSERT INTO blog_posts (
          title, slug, content, excerpt, author, status, tags, published_at, scheduled_date, is_scheduled
        ) VALUES (
          '${escapeSqlString(postData.title)}',
          '${escapeSqlString(postData.slug)}',
          `;
      
      // Add each chunk as TO_CLOB('chunk') concatenated with ||
      const clobParts = chunks.map(chunk => {
        // Use the comprehensive escapeSqlString function for each chunk
        const escapedChunk = escapeSqlString(chunk);
        return `TO_CLOB('${escapedChunk}')`;
      });
      
      insertQuery += clobParts.join(' || ');
      
      insertQuery += `,
          '${escapeSqlString(postData.excerpt)}',
          '${escapeSqlString(postData.author)}',
          '${escapeSqlString(postData.status)}',
          '${escapeSqlString(postData.tags)}',
          ${postData.publishedAt ? `TIMESTAMP '${escapeSqlString(postData.publishedAt)}'` : 'NULL'},
          ${postData.scheduledDate ? `TIMESTAMP '${escapeSqlString(postData.scheduledDate)}'` : 'NULL'},
          ${postData.isScheduled ? 1 : 0}
        )`;
      
      console.log('📊 Executing TO_CLOB concatenation insert for blog post');
      console.log('📊 Total content length:', postData.content.length);
      console.log('📊 Query length:', insertQuery.length);
      
      const insertResult = await executeOracleQuery(insertQuery);
      console.log('✅ TO_CLOB Insert result (ALL content stored):', insertResult);
      
      if (!insertResult.success) {
        console.error('❌ TO_CLOB Insert failed with error:', insertResult.error);
        return insertResult;
      }
      
      // Additional verification - check if the post was actually inserted
      const verifyQuery = `SELECT title FROM blog_posts WHERE slug = '${postData.slug}'`;
      const verifyResult = await executeOracleQuery(verifyQuery);
      console.log('🔍 Post insertion verification:', verifyResult);
      
      if (!verifyResult.success || !verifyResult.data || verifyResult.data.length === 0) {
        console.error('❌ Post was not actually inserted despite success response');
        return { success: false, error: 'Post insertion verification failed' };
      }
    } else {
      // Direct CLOB insertion for smaller content
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
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Error in insertBlogPostSafely:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Function to handle CLOB content updates with chunking for large content
async function updateBlogPostSafely(postData: {
  originalTitle: string; // Original title to identify the record
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
    
    // Check if content is large and needs TO_CLOB() chunking
    if (postData.content.length > 4000) {
      console.log('⚠️ Update content is large, using TO_CLOB() chunking strategy...');
      
      // Split content into manageable chunks for Oracle (less than 4000 chars each)
      const chunkSize = 2000; // Conservative size to account for escaping and special characters
      const chunks: string[] = [];
      
      for (let i = 0; i < postData.content.length; i += chunkSize) {
        chunks.push(postData.content.substring(i, i + chunkSize));
      }
      
      console.log(`📊 Split update content into ${chunks.length} chunks for TO_CLOB() concatenation`);
      
      // Build UPDATE statement with TO_CLOB() concatenation for content
      let updateQuery = `
        UPDATE blog_posts SET
          title = '${escapeSqlString(postData.title)}',
          content = `;
      
      // Add each chunk as TO_CLOB('chunk') concatenated with ||
      const clobParts = chunks.map(chunk => {
        // Use the comprehensive escapeSqlString function for each chunk
        const escapedChunk = escapeSqlString(chunk);
        return `TO_CLOB('${escapedChunk}')`;
      });
      
      updateQuery += clobParts.join(' || ');
      
      updateQuery += `,
          excerpt = '${escapeSqlString(postData.excerpt)}',
          status = '${escapeSqlString(postData.status)}',
          tags = '${escapeSqlString(postData.tags)}',
          updated_at = CURRENT_TIMESTAMP,
          published_at = ${postData.publishedAt ? `TIMESTAMP '${escapeSqlString(postData.publishedAt)}'` : 'NULL'},
          scheduled_date = ${postData.scheduledDate ? `TIMESTAMP '${escapeSqlString(postData.scheduledDate)}'` : 'NULL'},
          is_scheduled = ${postData.isScheduled ? 1 : 0}
        WHERE title = '${escapeSqlString(postData.originalTitle)}'`;
      
      console.log('📊 Executing TO_CLOB concatenation update for blog post');
      console.log('📊 Total update content length:', postData.content.length);
      console.log('📊 Update query length:', updateQuery.length);
      
      const updateResult = await executeOracleQuery(updateQuery);
      console.log('✅ TO_CLOB Update result (ALL content stored):', updateResult);
      
      return updateResult;
    } else {
      // Direct CLOB update for smaller content
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
        WHERE title = '${escapeSqlString(postData.originalTitle)}'
      `;
      
      return await executeOracleQuery(updateQuery);
    }
    
  } catch (error) {
    console.error('❌ Error in updateBlogPostSafely:', error);
    return { success: false, error: (error as Error).message };
  }
}

interface BlogPost {
  id?: number; // Kept for backwards compatibility, but title is now primary
  title: string; // This is now the primary key
  originalTitle?: string; // Used for updates when title changes
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


// Note: Email notifications are now handled by the background job system

// Oracle database execution function
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Blog Database Query Execution:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    // Determine query type for better handling
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE', 'CREATE', 'DROP', 'ALTER'].includes(queryType);
    
    // Execute the SQLclScript.sh with the SQL query
    // Proper escaping for shell - escape both double quotes and backslashes
    const escapedQuery = sqlQuery
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"');   // Then escape double quotes
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
      
      // Check for Oracle errors in the output
      if (trimmedOutput.includes('Error starting at line') || trimmedOutput.includes('ORA-') || trimmedOutput.includes('Error report')) {
        console.error('❌ Oracle error detected in modification query:', trimmedOutput);
        return { success: false, error: trimmedOutput };
      }
      
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

  try {
    // First, check if table exists by trying to query it
    const checkTableQuery = `SELECT COUNT(*) as count FROM blog_posts WHERE ROWNUM <= 1`;
    const checkResult = await executeOracleQuery(checkTableQuery);
    
    if (checkResult.success) {
      console.log('✅ Blog posts table already exists (verified by query)');
      tableInitialized = true;
      return true;
    }
  } catch (error) {
    console.log('ℹ️ Table check failed, will attempt to create table:', (error as Error).message);
  }
  
  // If query failed, table likely doesn't exist, so create it
  console.log('📋 Blog posts table does not exist, creating it...');
  
  const createTableQuery = `
    CREATE TABLE blog_posts (
      id NUMBER GENERATED BY DEFAULT AS IDENTITY,
      title VARCHAR2(500) PRIMARY KEY,
      slug VARCHAR2(500) UNIQUE NOT NULL,
      content CLOB NOT NULL,
      excerpt VARCHAR2(1000),
      author VARCHAR2(255) NOT NULL,
      status VARCHAR2(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      tags VARCHAR2(2000),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      published_at TIMESTAMP,
      scheduled_date TIMESTAMP,
      is_scheduled NUMBER(1) DEFAULT 0 CHECK (is_scheduled IN (0, 1))
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
    // Table already exists, skip initialization for debugging
    // await initializeBlogTable();
    
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
      
      // If this is a published post, queue email notifications for background processing
      if (postData.status === 'published') {
        try {
          console.log('📧 Queuing email notifications for published post:', post.title);
          
          const jobId = queueEmailJob({
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            tags: post.tags ? post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : []
          });
          
          console.log(`✅ Email notifications queued with job ID: ${jobId}`);
        } catch (emailError) {
          console.error('❌ Error queuing email notifications:', emailError);
          // Don't fail the post creation if email queuing fails
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
    
    // Validate required fields - now use originalTitle or title as identifier
    const titleToFind = postData.originalTitle || postData.title;
    if (!titleToFind?.trim()) {
      return NextResponse.json(
        { error: 'Title or originalTitle is required to identify the post for updates' },
        { status: 400 }
      );
    }
    
    if (!postData.title?.trim() || !postData.content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }
    
    // Check if post exists using title
    const checkQuery = `SELECT title, status, published_at FROM blog_posts WHERE title = '${escapeSqlString(titleToFind)}'`;
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
      originalTitle: titleToFind,
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
      WHERE title = '${escapeSqlString(postData.title)}'
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
      
      // If this post was just published (status changed from non-published to published), queue email notifications for background processing
      if (postData.status === 'published' && existingPost.status !== 'published') {
        try {
          console.log('📧 Queuing email notifications for newly published post:', post.title);
          
          const jobId = queueEmailJob({
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            tags: post.tags ? post.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : []
          });
          
          console.log(`✅ Email notifications queued for updated post with job ID: ${jobId}`);
        } catch (emailError) {
          console.error('❌ Error queuing email notifications for updated post:', emailError);
          // Don't fail the post update if email queuing fails
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
    const { title } = await request.json();
    
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Post title is required for deletion' },
        { status: 400 }
      );
    }
    
    // Check if post exists
    const checkQuery = `SELECT title FROM blog_posts WHERE title = '${escapeSqlString(title)}'`;
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
    
    const deleteQuery = `DELETE FROM blog_posts WHERE title = '${escapeSqlString(title)}'`;
    const result = await executeOracleQuery(deleteQuery);
    
    if (!result.success) {
      // Check if it's a foreign key constraint violation
      const errorMessage = result.error || 'Failed to delete blog post';
      if (errorMessage.includes('ORA-02292') || errorMessage.includes('integrity constraint')) {
        return NextResponse.json(
          { error: 'Cannot delete this blog post because it has related records (e.g., campaign references). Please remove related records first.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: errorMessage },
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
