import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { sendPostNotification } from '../../lib/email';

const execAsync = promisify(exec);

// Utility function to escape strings for SQL
function escapeSqlString(str: string): string {
  if (typeof str !== 'string') {
    return String(str);
  }
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\0/g, '')
    .replace(/\x1a/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

// Oracle database execution function
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Scheduler Database Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE'].includes(queryType);
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Scheduler database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Scheduler database query executed successfully');
    
    if (isModificationQuery) {
      const trimmedOutput = stdout.trim();
      console.log('📝 Modification query completed:', queryType, '- Output:', trimmedOutput || '(empty - success)');
      return { success: true, data: trimmedOutput || 'Operation completed successfully' };
    }
    
    if (isDataQuery) {
      console.log('📤 Raw Oracle Output (first 500 chars):', stdout.substring(0, 500));
    }
    
    try {
      const jsonData = JSON.parse(stdout);
      console.log('✅ Successfully parsed as JSON');
      
      if (jsonData.results && Array.isArray(jsonData.results) && jsonData.results.length > 0) {
        const items = jsonData.results[0].items || [];
        console.log('✅ Extracted Oracle items:', items.length, 'rows');
        return { success: true, data: items };
      }
      
      if (Array.isArray(jsonData)) {
        console.log('✅ Direct array format');
        return { success: true, data: jsonData };
      }
      
      console.log('ℹ️ Single object, wrapping in array');
      return { success: true, data: [jsonData] };
      
    } catch (_parseError) {
      const trimmedOutput = stdout.trim();
      
      if (isDataQuery) {
        console.log('⚠️ SELECT query could not parse as JSON. Output:', trimmedOutput.substring(0, 200));
        if (trimmedOutput === '' || trimmedOutput === 'no rows selected' || trimmedOutput.toLowerCase().includes('no rows')) {
          console.log('✅ Treating as empty result set');
          return { success: true, data: [] };
        }
        return { success: true, data: trimmedOutput };
      } else {
        console.log('✅ Non-SELECT query completed successfully');
        return { success: true, data: trimmedOutput || 'Operation completed successfully' };
      }
    }
  } catch (error) {
    console.error('❌ Scheduler database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Function to process scheduled posts that are ready to publish
async function processScheduledPosts(): Promise<{ success: boolean; publishedCount: number; errors: string[] }> {
  try {
    console.log('🕒 Processing scheduled posts...');
    
    // Get posts ready to publish using the view
    const getReadyPostsQuery = `
      SELECT id, title, slug, scheduled_date
      FROM v_posts_ready_to_publish
    `;
    
    const readyPostsResult = await executeOracleQuery(getReadyPostsQuery);
    
    if (!readyPostsResult.success) {
      return { success: false, publishedCount: 0, errors: [readyPostsResult.error || 'Failed to fetch scheduled posts'] };
    }
    
    let postsToPublish = readyPostsResult.data;
    if (!Array.isArray(postsToPublish)) {
      postsToPublish = [];
    }
    
    console.log(`📋 Found ${postsToPublish.length} posts ready to publish`);
    
    if (postsToPublish.length === 0) {
      return { success: true, publishedCount: 0, errors: [] };
    }
    
    let publishedCount = 0;
    const errors: string[] = [];
    
    // Process each post
    for (const post of postsToPublish) {
      try {
        console.log(`📝 Publishing post: ${post.title} (ID: ${post.id})`);
        
        // Update the post status to published
        const publishQuery = `
          UPDATE blog_posts 
          SET 
            status = 'published',
            published_at = CURRENT_TIMESTAMP,
            is_scheduled = 0,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${post.id} AND status = 'scheduled'
        `;
        
        const publishResult = await executeOracleQuery(publishQuery);
        
        if (publishResult.success) {
          publishedCount++;
          console.log(`✅ Successfully published post: ${post.title}`);
          
          // Create a scheduled job to send email notifications
          const scheduleEmailQuery = `
            INSERT INTO scheduled_jobs (
              job_type,
              reference_id,
              scheduled_for,
              status
            ) VALUES (
              'send_email',
              ${post.id},
              CURRENT_TIMESTAMP + INTERVAL '1' MINUTE,
              'pending'
            )
          `;
          
          const emailJobResult = await executeOracleQuery(scheduleEmailQuery);
          if (!emailJobResult.success) {
            console.error(`⚠️ Failed to schedule email for post ${post.id}:`, emailJobResult.error);
          } else {
            console.log(`📧 Scheduled email notification for post: ${post.title}`);
          }
          
        } else {
          const error = `Failed to publish post ${post.id}: ${publishResult.error}`;
          errors.push(error);
          console.error('❌', error);
        }
        
      } catch (error) {
        const errorMsg = `Error processing post ${post.id}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }
    
    return { success: true, publishedCount, errors };
    
  } catch (error) {
    console.error('❌ Error in processScheduledPosts:', error);
    return { success: false, publishedCount: 0, errors: [(error as Error).message] };
  }
}

// Function to process scheduled email jobs
async function processScheduledEmails(): Promise<{ success: boolean; processedCount: number; errors: string[] }> {
  try {
    console.log('📧 Processing scheduled email jobs...');
    
    // Get pending email jobs that are ready to process
    const getPendingEmailsQuery = `
      SELECT 
        sj.id,
        sj.reference_id as post_id,
        bp.title as post_title,
        bp.slug as post_slug,
        bp.excerpt
      FROM scheduled_jobs sj
      JOIN blog_posts bp ON sj.reference_id = bp.id
      WHERE sj.job_type = 'send_email' 
        AND sj.status = 'pending'
        AND sj.scheduled_for <= CURRENT_TIMESTAMP
        AND sj.attempts < sj.max_attempts
      ORDER BY sj.scheduled_for ASC
      FETCH FIRST 10 ROWS ONLY
    `;
    
    const emailJobsResult = await executeOracleQuery(getPendingEmailsQuery);
    
    if (!emailJobsResult.success) {
      return { success: false, processedCount: 0, errors: [emailJobsResult.error || 'Failed to fetch email jobs'] };
    }
    
    let emailJobs = emailJobsResult.data;
    if (!Array.isArray(emailJobs)) {
      emailJobs = [];
    }
    
    console.log(`📋 Found ${emailJobs.length} email jobs to process`);
    
    if (emailJobs.length === 0) {
      return { success: true, processedCount: 0, errors: [] };
    }
    
    let processedCount = 0;
    const errors: string[] = [];
    
    // Get active subscribers
    const getSubscribersQuery = `SELECT * FROM v_active_subscribers`;
    const subscribersResult = await executeOracleQuery(getSubscribersQuery);
    
    let subscribers = subscribersResult.success ? subscribersResult.data : [];
    if (!Array.isArray(subscribers)) {
      subscribers = [];
    }
    
    console.log(`👥 Found ${subscribers.length} active subscribers`);
    
    // Process each email job
    for (const job of emailJobs) {
      try {
        console.log(`📧 Processing email job ${job.id} for post: ${job.post_title}`);
        
        // Mark job as running
        const markRunningQuery = `
          UPDATE scheduled_jobs 
          SET status = 'running', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${job.id}
        `;
        
        await executeOracleQuery(markRunningQuery);
        
        if (subscribers.length === 0) {
          // No subscribers - mark as completed
          const completeQuery = `
            UPDATE scheduled_jobs 
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP, result_data = 'No active subscribers'
            WHERE id = ${job.id}
          `;
          await executeOracleQuery(completeQuery);
          processedCount++;
          console.log(`✅ Email job ${job.id} completed (no subscribers)`);
          continue;
        }
        
        // Create email campaign
        const createCampaignQuery = `
          INSERT INTO email_campaigns (
            post_id,
            campaign_type,
            subject,
            recipient_count,
            status
          ) VALUES (
            ${job.post_id},
            'post_notification',
            'New Post: ${escapeSqlString(job.post_title)}',
            ${subscribers.length},
            'pending'
          )
        `;
        
        const campaignResult = await executeOracleQuery(createCampaignQuery);
        
        if (!campaignResult.success) {
          throw new Error(`Failed to create email campaign: ${campaignResult.error}`);
        }
        
        // Get the campaign ID
        const getCampaignQuery = `
          SELECT id FROM email_campaigns 
          WHERE post_id = ${job.post_id} AND campaign_type = 'post_notification'
          ORDER BY created_at DESC
          FETCH FIRST 1 ROWS ONLY
        `;
        
        const campaignIdResult = await executeOracleQuery(getCampaignQuery);
        
        if (!campaignIdResult.success || !campaignIdResult.data || campaignIdResult.data.length === 0) {
          throw new Error('Failed to get campaign ID');
        }
        
        const campaignId = campaignIdResult.data[0].id;
        
        // Create email campaign logs for each subscriber
        let successfulSends = 0;
        let failedSends = 0;
        
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
              // Actually send the email
              console.log(`📧 Sending email to ${subscriber.email} about post: ${job.post_title}`);
              
              const emailResult = await sendPostNotification(
                subscriber.email,
                {
                  title: job.post_title,
                  slug: job.post_slug,
                  excerpt: job.excerpt,
                  tags: [] // You might want to fetch tags from the post
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
                console.error(`❌ Failed to send email to ${subscriber.email}:`, emailResult.error);
              }
            } else {
              failedSends++;
              console.error(`❌ Failed to log email for subscriber ${subscriber.id}`);
            }
            
          } catch (error) {
            failedSends++;
            console.error(`❌ Error processing subscriber ${subscriber.id}:`, error);
            
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
        
        // Mark job as completed
        const completeJobQuery = `
          UPDATE scheduled_jobs 
          SET 
            status = 'completed', 
            completed_at = CURRENT_TIMESTAMP,
            result_data = 'Campaign ID: ${campaignId}, Sent: ${successfulSends}, Failed: ${failedSends}'
          WHERE id = ${job.id}
        `;
        
        await executeOracleQuery(completeJobQuery);
        
        processedCount++;
        console.log(`✅ Email job ${job.id} completed - Sent: ${successfulSends}, Failed: ${failedSends}`);
        
      } catch (error) {
        const errorMsg = `Error processing email job ${job.id}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
        
        // Mark job as failed
        const failJobQuery = `
          UPDATE scheduled_jobs 
          SET 
            status = 'failed', 
            completed_at = CURRENT_TIMESTAMP,
            error_message = '${escapeSqlString((error as Error).message)}'
          WHERE id = ${job.id}
        `;
        
        await executeOracleQuery(failJobQuery);
      }
    }
    
    return { success: true, processedCount, errors };
    
  } catch (error) {
    console.error('❌ Error in processScheduledEmails:', error);
    return { success: false, processedCount: 0, errors: [(error as Error).message] };
  }
}

// GET /api/scheduler - Get scheduler status and pending jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobType = searchParams.get('job_type');
    const status = searchParams.get('status');
    
    let query = `
      SELECT 
        sj.id,
        sj.job_type,
        sj.reference_id,
        sj.status,
        sj.attempts,
        sj.max_attempts,
        sj.error_message,
        sj.result_data,
        TO_CHAR(sj.scheduled_for, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as scheduled_for,
        TO_CHAR(sj.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
        TO_CHAR(sj.completed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as completed_at,
        bp.title as post_title
      FROM scheduled_jobs sj
      LEFT JOIN blog_posts bp ON sj.reference_id = bp.id AND sj.job_type IN ('publish_post', 'send_email')
    `;
    
    const conditions = [];
    if (jobType) {
      conditions.push(`sj.job_type = '${escapeSqlString(jobType)}'`);
    }
    if (status) {
      conditions.push(`sj.status = '${escapeSqlString(status)}'`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY sj.created_at DESC FETCH FIRST 100 ROWS ONLY';
    
    const result = await executeOracleQuery(query);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch scheduled jobs' },
        { status: 500 }
      );
    }
    
    let dataArray = result.data;
    if (!Array.isArray(dataArray)) {
      dataArray = [];
    }
    
    const jobs = dataArray.map((job: any) => ({
      ...job,
      scheduledFor: job.scheduled_for,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      postTitle: job.post_title
    }));
    
    // Get summary statistics
    const statsQuery = `
      SELECT 
        job_type,
        status,
        COUNT(*) as count
      FROM scheduled_jobs
      GROUP BY job_type, status
      ORDER BY job_type, status
    `;
    
    const statsResult = await executeOracleQuery(statsQuery);
    const stats = statsResult.success ? statsResult.data : [];
    
    return NextResponse.json({ 
      success: true, 
      jobs,
      stats: Array.isArray(stats) ? stats : []
    });
    
  } catch (error) {
    console.error('Error in scheduler GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/scheduler - Trigger scheduler processing
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    let result: any;
    
    switch (action) {
      case 'process_posts':
        result = await processScheduledPosts();
        break;
        
      case 'process_emails':
        result = await processScheduledEmails();
        break;
        
      case 'process_all':
        const postsResult = await processScheduledPosts();
        const emailsResult = await processScheduledEmails();
        
        result = {
          success: postsResult.success && emailsResult.success,
          posts: {
            publishedCount: postsResult.publishedCount,
            errors: postsResult.errors
          },
          emails: {
            processedCount: emailsResult.processedCount,
            errors: emailsResult.errors
          }
        };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "process_posts", "process_emails", or "process_all"' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ 
      success: true, 
      result 
    });
    
  } catch (error) {
    console.error('Error in scheduler POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
