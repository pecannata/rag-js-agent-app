import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// Check if Clerk is properly configured
const hasValidClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_') && 
                         !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('YOUR_');

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk', // Clerk webhook endpoint
]);

// Only use Clerk middleware if properly configured
export default function middleware(req: NextRequest) {
  if (!hasValidClerkKeys) {
    // Skip Clerk middleware entirely if not configured
    return;
  }
  
  return clerkMiddleware((auth, req) => {
    if (!isPublicRoute(req)) {
      auth().protect();
    }
  })(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
