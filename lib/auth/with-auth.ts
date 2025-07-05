import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, createUnauthorizedResponse, AuthenticatedUser, logApiActivity } from './api-auth';

type AuthenticatedHandler = (
  request: NextRequest, 
  user: AuthenticatedUser
) => Promise<NextResponse>;

type AuthOptions = {
  logActivity?: string; // Optional activity type to log
  skipAuth?: boolean;   // For rare cases where you want to skip auth
};

export function withAuth(
  handler: AuthenticatedHandler, 
  options: AuthOptions = {}
) {
  return async function(request: NextRequest) {
    // Skip auth if explicitly requested (rare cases like webhooks)
    if (options.skipAuth) {
      return handler(request, null as any);
    }

    const user = await authenticateApiRequest(request);
    if (!user) {
      return createUnauthorizedResponse();
    }
    
    // Auto-log activity if specified
    if (options.logActivity) {
      await logApiActivity(user.clerkUserId, options.logActivity, {}, request);
    }
    
    return handler(request, user);
  };
}

// Convenience wrapper for common patterns
export const withAuthAndLog = (activityType: string) => 
  (handler: AuthenticatedHandler) => 
    withAuth(handler, { logActivity: activityType });

// Usage example:
// export const POST = withAuth(async (request, user) => {
//   // Your API logic here, user is guaranteed to be authenticated
//   console.log(`Processing request for user: ${user.email}`);
//   // ... rest of your API logic
// });
