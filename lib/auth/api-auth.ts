import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { UserDatabase } from './user-db-sqlcl';

export interface AuthenticatedUser {
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export async function authenticateApiRequest(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // TODO: Remove this bypass after setting up Clerk keys
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasValidClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_') && 
                             !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('YOUR_');
    
    if (isDevelopment && !hasValidClerkKeys) {
      console.warn('⚠️ Development mode: Bypassing authentication (Clerk not configured)');
      // Return a mock user for development
      return {
        clerkUserId: 'dev-user-123',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User'
      };
    }
    
    const { userId } = auth();
    
    if (!userId) {
      return null;
    }

    // Get user from database or sync from Clerk if needed
    let user;
    try {
      user = await UserDatabase.getUserByClerkId(userId);
    } catch (error) {
      if (error.message?.includes('SQLclScript.sh') || 
          error.message?.includes('../SQLclScript.sh') ||
          error.message?.includes('No such file')) {
        console.warn('⚠️ SQLclScript.sh not found or Oracle not configured, using Clerk user data only');
        // Return basic user info from Clerk without database lookup
        return {
          clerkUserId: userId,
          email: 'user@example.com', // Would need to get from Clerk API in production
          firstName: 'User',
          lastName: ''
        };
      }
      throw error;
    }
    
    if (!user) {
      // User might not be synced yet, this is unusual but we'll handle it
      console.warn(`User ${userId} not found in database, this might indicate a sync issue`);
      return null;
    }

    return {
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
    };
  } catch (error) {
    console.error('Error authenticating API request:', error);
    return null;
  }
}

export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({ 
      error: 'Unauthorized', 
      message: 'Please sign in to access this resource' 
    }),
    { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function logApiActivity(
  clerkUserId: string,
  activityType: string,
  details?: any,
  req?: NextRequest
) {
  try {
    const ipAddress = req?.headers.get('x-forwarded-for') || 
                     req?.headers.get('x-real-ip') || 
                     req?.ip;
    
    const userAgent = req?.headers.get('user-agent');

    await UserDatabase.logUserActivity(clerkUserId, {
      type: activityType,
      details,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });
  } catch (error) {
    if (error.message?.includes('SQLclScript.sh') || 
        error.message?.includes('../SQLclScript.sh') ||
        error.message?.includes('No such file')) {
      console.warn('⚠️ Skipping activity logging: SQLclScript.sh not found or Oracle not configured');
    } else {
      console.error('Error logging API activity:', error);
    }
    // Don't throw here as logging failures shouldn't break the API
  }
}
