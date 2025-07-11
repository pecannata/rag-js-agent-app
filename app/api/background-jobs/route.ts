import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus, getQueueStats, processJobs } from '../../lib/background-jobs';

// GET /api/background-jobs - Get job status and queue statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (jobId) {
      // Get specific job status
      const jobStatus = getJobStatus(jobId);
      
      if (!jobStatus) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        job: {
          id: jobId,
          ...jobStatus
        }
      });
    } else {
      // Get queue statistics
      const queueStats = getQueueStats();
      
      return NextResponse.json({
        success: true,
        stats: queueStats
      });
    }
    
  } catch (error) {
    console.error('Error in background jobs GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/background-jobs - Manually trigger job processing
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'process') {
      // Manually trigger job processing
      console.log('📧 Manually triggering background job processing...');
      
      // Run processing in background (don't await to return quickly)
      processJobs().catch(error => {
        console.error('❌ Error in manual job processing:', error);
      });
      
      return NextResponse.json({
        success: true,
        message: 'Background job processing triggered'
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use "process" to trigger job processing.' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error in background jobs POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
