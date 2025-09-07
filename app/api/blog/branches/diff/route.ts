import { NextRequest, NextResponse } from 'next/server';
import { BlogBranchManager } from '../../../../../lib/BlogBranchManager';
import { executeOracleQuery } from '../../../../../lib/database-utils';
import { branchAwareCache } from '../../../../../lib/branch-aware-cache';

// Initialize BlogBranchManager with database query executor
const branchManager = new BlogBranchManager(executeOracleQuery);

/**
 * GET /api/blog/branches/diff?postId=123&fromBranch=abc&toBranch=def
 * Get diff between two branches
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const fromBranch = searchParams.get('fromBranch');
    const toBranch = searchParams.get('toBranch');
    
    if (!postId || !fromBranch || !toBranch) {
      return NextResponse.json(
        { error: 'postId, fromBranch, and toBranch parameters are required' },
        { status: 400 }
      );
    }

    const postIdNum = parseInt(postId);
    
    // Check cache first
    let diffData = branchAwareCache.getDiffResult(postIdNum, fromBranch, toBranch);
    
    if (!diffData) {
      // Cache miss - generate diff and analysis
      const [diffs, analysis] = await Promise.all([
        branchManager.generateDiff(postIdNum, fromBranch, toBranch),
        branchManager.analyzeChanges(postIdNum, fromBranch, toBranch)
      ]);
      
      diffData = { diffs, analysis };
      
      // Cache the result
      branchAwareCache.setDiffResult(postIdNum, fromBranch, toBranch, diffData);
    }
    
    return NextResponse.json({
      success: true,
      diffs: diffData.diffs,
      analysis: diffData.analysis
    });
    
  } catch (error) {
    console.error('Error generating diff:', error);
    return NextResponse.json(
      { error: 'Failed to generate diff', details: (error as Error).message },
      { status: 500 }
    );
  }
}
