import { sendPostNotification } from './email';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface EmailJob {
  id: string;
  type: 'post_notification';
  data: {
    postId: number;
    postTitle: string;
    postSlug: string;
    postExcerpt: string;
    postTags: string[];
  };
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// In-memory job queue (for simple implementation)
// In production, you'd want to use Redis or a proper queue system
const jobQueue: EmailJob[] = [];
const processingJobs = new Set<string>();

// Oracle database execution function (duplicated from blog route for modularity)
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Background Job Database Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0] || '';
    const isDataQuery = ['SELECT'].includes(queryType);
    const isModificationQuery = ['UPDATE', 'INSERT', 'DELETE', 'CREATE', 'DROP', 'ALTER'].includes(queryType);
    
    const escapedQuery = sqlQuery.replace(/"/g, '\\"');
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`);
    
    if (stderr) {
      console.error('❌ Background job database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Background job database query executed successfully');
    
    if (isModificationQuery) {
      const trimmedOutput = stdout.trim();
      console.log('📝 Background job modification query completed', queryType, '- Output:', trimmedOutput || '(empty - success)');
      return { success: true, data: trimmedOutput || 'Operation completed successfully' };
    }
    
    if (isDataQuery) {
      console.log('📤 Background job raw Oracle output (first 500 chars):', stdout.substring(0, 500) + (stdout.length > 500 ? '...' : ''));
    }
    
    try {
      const jsonData = JSON.parse(stdout);
      console.log('✅ Background job successfully parsed as JSON');
      
      if (jsonData.results && Array.isArray(jsonData.results) && jsonData.results.length > 0) {
        const items = jsonData.results[0].items || [];
        console.log('✅ Background job extracted Oracle items:', items.length, 'rows');
        return { success: true, data: items };
      }
      
      if (Array.isArray(jsonData)) {
        console.log('✅ Background job direct array format');
        return { success: true, data: jsonData };
      }
      
      console.log('ℹ️ Background job single object, wrapping in array');
      return { success: true, data: [jsonData] };
      
    } catch (_parseError) {
      const trimmedOutput = stdout.trim();
      
      if (isDataQuery) {
        console.log('⚠️ Background job SELECT query could not parse as JSON');
        if (trimmedOutput === '' || trimmedOutput === 'no rows selected' || trimmedOutput.toLowerCase().includes('no rows')) {
          console.log('✅ Background job treating as empty result set');
          return { success: true, data: [] };
        }
        console.log('ℹ️ Background job returning raw output as string');
        return { success: true, data: trimmedOutput };
      } else {
        console.log('✅ Background job non-SELECT query completed successfully');
        return { success: true, data: trimmedOutput || 'Operation completed successfully' };
      }
    }
  } catch (error) {
    console.error('❌ Background job database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Utility function to escape SQL strings
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
    .replace(/\r/g, '\n');
}

// Add a job to the queue
export function queueEmailJob(postData: {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
}): string {
  const jobId = `email-${postData.id}-${Date.now()}`;
  
  const job: EmailJob = {
    id: jobId,
    type: 'post_notification',
    data: {
      postId: postData.id,
      postTitle: postData.title,
      postSlug: postData.slug,
      postExcerpt: postData.excerpt,
      postTags: postData.tags
    },
    priority: 1,
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    scheduledAt: new Date(),
    status: 'pending'
  };
  
  jobQueue.push(job);
  console.log(`📧 Queued email job ${jobId} for post: ${postData.title}`);
  
  // Start processing if not already running
  if (!isProcessing) {
    processJobs();
  }
  
  return jobId;
}

// Processing state
let isProcessing = false;

// Process jobs from the queue
export async function processJobs(): Promise<void> {
  if (isProcessing) {
    console.log('⚠️ Job processing already in progress');
    return;
  }
  
  isProcessing = true;
  console.log('🔄 Starting background job processing...');
  
  try {
    while (jobQueue.length > 0) {
      // Get the next job
      const jobIndex = jobQueue.findIndex(job => 
        job.status === 'pending' && 
        job.scheduledAt <= new Date() &&
        !processingJobs.has(job.id)
      );
      
      if (jobIndex === -1) {
        console.log('ℹ️ No jobs ready for processing');
        break;
      }
      
      const job = jobQueue[jobIndex];
      
      if (!job) {
        console.log('⚠️ Job not found at index, skipping...');
        continue;
      }
      
      try {
        console.log(`🔄 Processing job ${job.id} (attempt ${job.attempts + 1}/${job.maxAttempts})`);
        
        processingJobs.add(job.id);
        job.status = 'processing';
        job.attempts++;
        
        const result = await processEmailJob(job);
        
        if (result.success) {
          console.log(`✅ Job ${job.id} completed successfully`);
          job.status = 'completed';
          jobQueue.splice(jobIndex, 1); // Remove completed job
        } else {
          console.error(`❌ Job ${job.id} failed:`, result.error);
          
          if (job.attempts >= job.maxAttempts) {
            console.error(`❌ Job ${job.id} exceeded max attempts, marking as failed`);
            job.status = 'failed';
            // Keep failed jobs for inspection/debugging
          } else {
            console.log(`🔄 Job ${job.id} will be retried (attempt ${job.attempts}/${job.maxAttempts})`);
            job.status = 'pending';
            job.scheduledAt = new Date(Date.now() + 5000 * job.attempts); // Exponential backoff
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);
        
        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed';
        } else {
          job.status = 'pending';
          job.scheduledAt = new Date(Date.now() + 5000 * job.attempts);
        }
      } finally {
        processingJobs.delete(job.id);
      }
    }
    
  } finally {
    isProcessing = false;
    console.log('✅ Background job processing completed');
  }
}

// Process a single email job
async function processEmailJob(job: EmailJob): Promise<{ success: boolean; error?: string; sent?: number; failed?: number }> {
  try {
    console.log(`📧 Processing email notifications for post: ${job.data.postTitle}`);
    
    // Get email-enabled subscribers
    const getSubscribersQuery = `SELECT * FROM v_email_enabled_subscribers`;
    const subscribersResult = await executeOracleQuery(getSubscribersQuery);
    
    let subscribers = subscribersResult.success ? subscribersResult.data : [];
    if (!Array.isArray(subscribers)) {
      subscribers = [];
    }
    
    console.log(`👥 Found ${subscribers.length} email-enabled subscribers for background job`);
    
    if (subscribers.length === 0) {
      console.log('ℹ️ No email-enabled subscribers to notify in background job');
      return { success: true, sent: 0, failed: 0 };
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
        ${job.data.postId},
        'post_notification',
        'New Post: ${escapeSqlString(job.data.postTitle)}',
        ${subscribers.length},
        'pending'
      )
    `;
    
    const campaignResult = await executeOracleQuery(createCampaignQuery);
    
    if (!campaignResult.success) {
      console.error('❌ Failed to create email campaign in background job:', campaignResult.error);
      return { success: false, error: campaignResult.error || 'Failed to create campaign' };
    }
    
    // Get the campaign ID
    const getCampaignQuery = `
      SELECT id FROM email_campaigns 
      WHERE post_id = ${job.data.postId} AND campaign_type = 'post_notification'
      ORDER BY created_at DESC
      FETCH FIRST 1 ROWS ONLY
    `;
    
    const campaignIdResult = await executeOracleQuery(getCampaignQuery);
    
    if (!campaignIdResult.success || !campaignIdResult.data || campaignIdResult.data.length === 0) {
      console.error('❌ Failed to get campaign ID in background job');
      return { success: false, error: 'Failed to get campaign ID' };
    }
    
    const campaignId = campaignIdResult.data[0].id;
    
    // Send emails to all subscribers
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
          // Send the email
          console.log(`📧 Sending background email to ${subscriber.email} about post: ${job.data.postTitle}`);
          
          const emailResult = await sendPostNotification(
            subscriber.email,
            {
              title: job.data.postTitle,
              slug: job.data.postSlug,
              excerpt: job.data.postExcerpt,
              tags: job.data.postTags
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
            console.log(`✅ Background email sent successfully to ${subscriber.email}`);
          } else {
            // Update log to failed
            await executeOracleQuery(`
              UPDATE email_campaign_logs 
              SET status = 'failed', error_message = '${escapeSqlString(emailResult.error || 'Unknown error')}'
              WHERE campaign_id = ${campaignId} AND subscriber_id = ${subscriber.id}
            `);
            failedSends++;
            const errorMsg = `Failed to send background email to ${subscriber.email}: ${emailResult.error}`;
            errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        } else {
          failedSends++;
          const errorMsg = `Failed to log background email for subscriber ${subscriber.id}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
        
      } catch (error) {
        failedSends++;
        const errorMsg = `Error processing background email for subscriber ${subscriber.id}: ${(error as Error).message}`;
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
          console.error('Failed to update background error log:', logError);
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
    
    console.log(`📧 Background email campaign completed: ${successfulSends} sent, ${failedSends} failed`);
    
    return { success: true, sent: successfulSends, failed: failedSends };
    
  } catch (error) {
    console.error('❌ Error in background email job processing:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Get job status
export function getJobStatus(jobId: string): { status: string; attempts: number; maxAttempts: number } | null {
  const job = jobQueue.find(j => j.id === jobId);
  if (!job) return null;
  
  return {
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts
  };
}

// Get queue stats
export function getQueueStats(): { pending: number; processing: number; failed: number } {
  const pending = jobQueue.filter(job => job.status === 'pending').length;
  const processing = jobQueue.filter(job => job.status === 'processing').length;
  const failed = jobQueue.filter(job => job.status === 'failed').length;
  
  return { pending, processing, failed };
}

// Start the background job processor on module load
// This will run periodically to process any queued jobs
setInterval(() => {
  if (jobQueue.length > 0 && !isProcessing) {
    processJobs();
  }
}, 10000); // Check every 10 seconds

console.log('📧 Background job processor initialized');
