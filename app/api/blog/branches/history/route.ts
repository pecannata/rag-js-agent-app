import { NextRequest, NextResponse } from 'next/server';
import { BlogBranchManager } from '../../../../../lib/BlogBranchManager';
import { executeOracleQuery } from '../../../../../lib/database-utils';

// Initialize BlogBranchManager with database query executor
const branchManager = new BlogBranchManager(executeOracleQuery);

/**
 * GET /api/blog/branches/history?postId=123&branchId=abc
 * Get branch history and change logs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const branchId = searchParams.get('branchId');
    
    if (!postId) {
      return NextResponse.json(
        { error: 'postId parameter is required' },
        { status: 400 }
      );
    }

    const history = await branchManager.getBranchHistory(
      parseInt(postId), 
      branchId || undefined
    );
    
    return NextResponse.json({
      success: true,
      history
    });
    
  } catch (error) {
    console.error('Error fetching branch history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch history', details: (error as Error).message },
      { status: 500 }
    );
  }
}
