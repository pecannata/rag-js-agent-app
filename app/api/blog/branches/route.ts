import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyUser } from '../../../../lib/users'
import { BlogBranchManager } from '../../../../lib/BlogBranchManager';
import { executeOracleQuery } from '../../../../lib/database-utils';
import { branchAwareCache } from '../../../../lib/branch-aware-cache';

// Auth configuration (matching the main auth config)
const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await verifyUser(credentials.email, credentials.password)
        
        if (user) {
          if (!user.emailVerified) {
            throw new Error('Please verify your email before signing in. Check your inbox for the verification link.')
          }
          
          if (!user.approved && user.email !== 'phil.cannata@yahoo.com') {
            throw new Error('Your account is pending admin approval. You will receive an email once approved.')
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0] ?? 'User'
          }
        }

        return null
      }
    })
  ],
  pages: {
    signIn: '/auth/signin'
  },
  session: {
    strategy: 'jwt' as const
  },
  callbacks: {
    async jwt({ token, user }: { token: any, user?: any }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }: { session: any, token: any }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'development-secret-change-in-production'
};

// Initialize BlogBranchManager with database query executor
const branchManager = new BlogBranchManager(executeOracleQuery);

/**
 * GET /api/blog/branches?postId=123
 * List all branches for a blog post
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json(
        { error: 'postId parameter is required' },
        { status: 400 }
      );
    }

    const postIdNum = parseInt(postId);
    
    // Try to get from cache first
    let branches = branchAwareCache.getBranchList(postIdNum);
    
    if (!branches) {
      // Cache miss - fetch from database
      branches = await branchManager.listBranches(postIdNum);
      // Cache the results
      branchAwareCache.setBranchList(postIdNum, branches);
    }
    
    return NextResponse.json({
      success: true,
      branches
    });
    
  } catch (error) {
    console.error('Error listing branches:', error);
    return NextResponse.json(
      { error: 'Failed to list branches', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blog/branches
 * Create a new branch
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🌿 Branch creation request received');
    const session = await getServerSession(authOptions);
    console.log('🔐 Session data:', session ? {
      userEmail: session.user?.email,
      userId: session.user?.id
    } : 'No session');
    
    if (!session?.user?.email) {
      console.log('❌ No authenticated session found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('📋 Request body:', JSON.stringify(body, null, 2));
    
    const {
      postId,
      branchName,
      parentBranchId,
      branchType = 'feature',
      initialChanges
    } = body;

    if (!postId || !branchName) {
      console.log('❌ Missing required fields - postId:', postId, 'branchName:', branchName);
      return NextResponse.json(
        { error: 'postId and branchName are required' },
        { status: 400 }
      );
    }

    const postIdNum = parseInt(postId);
    console.log('🚀 Creating branch with data:', {
      postId: postIdNum,
      branchName,
      parentBranchId,
      branchType,
      createdBy: session.user.email
    });
    
    try {
      const branch = await branchManager.createBranch({
        postId: postIdNum,
        branchName,
        parentBranchId,
        branchType,
        createdBy: session.user.email,
        initialChanges
      });
      
      console.log('✅ Branch created successfully:', branch?.branchId);
      
      // Invalidate cache after creating branch
      branchAwareCache.invalidatePost(postIdNum);

      return NextResponse.json({
        success: true,
        branch
      });
    } catch (branchError) {
      console.error('❌ Branch creation failed:', branchError);
      console.error('❌ Branch error stack:', branchError instanceof Error ? branchError.stack : 'No stack trace');
      throw branchError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: 'Failed to create branch', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/blog/branches
 * Update a branch
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      postId,
      branchId,
      changes
    } = body;

    if (!postId || !branchId || !changes) {
      return NextResponse.json(
        { error: 'postId, branchId, and changes are required' },
        { status: 400 }
      );
    }

    const postIdNum = parseInt(postId);
    
    const branch = await branchManager.updateBranch(
      postIdNum,
      branchId,
      changes,
      session.user.email
    );
    
    // Invalidate cache after updating branch
    branchAwareCache.invalidateBranch(postIdNum, branchId);

    return NextResponse.json({
      success: true,
      branch
    });

  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { error: 'Failed to update branch', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blog/branches?postId=123&branchId=abc
 * Delete a branch
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const branchId = searchParams.get('branchId');
    
    if (!postId || !branchId) {
      return NextResponse.json(
        { error: 'postId and branchId parameters are required' },
        { status: 400 }
      );
    }

    const postIdNum = parseInt(postId);
    
    const success = await branchManager.deleteBranch(
      postIdNum,
      branchId,
      session.user.email
    );
    
    // Invalidate cache after deleting branch
    branchAwareCache.invalidatePost(postIdNum);

    return NextResponse.json({
      success
    });

  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { error: 'Failed to delete branch', details: (error as Error).message },
      { status: 500 }
    );
  }
}
