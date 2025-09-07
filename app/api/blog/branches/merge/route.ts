import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { BlogBranchManager } from '../../../../../lib/BlogBranchManager';
import { executeOracleQuery } from '../../../../../lib/database-utils';

// Initialize BlogBranchManager with database query executor
const branchManager = new BlogBranchManager(executeOracleQuery);

/**
 * POST /api/blog/branches/merge
 * Merge one branch into another
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      postId,
      fromBranch,
      toBranch,
      strategy = 'auto',
      commitMessage,
      conflictResolution
    } = body;

    if (!postId || !fromBranch || !toBranch) {
      return NextResponse.json(
        { error: 'postId, fromBranch, and toBranch are required' },
        { status: 400 }
      );
    }

    const result = await branchManager.mergeBranches({
      postId: parseInt(postId),
      fromBranch,
      toBranch,
      mergedBy: session.user.email,
      strategy,
      commitMessage,
      conflictResolution
    });

    return NextResponse.json({
      success: result.success,
      mergeId: result.mergeId,
      conflicts: result.conflicts
    });

  } catch (error) {
    console.error('Error merging branches:', error);
    return NextResponse.json(
      { error: 'Failed to merge branches', details: (error as Error).message },
      { status: 500 }
    );
  }
}
