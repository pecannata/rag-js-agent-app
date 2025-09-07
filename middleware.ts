import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isAdminEmail } from "./lib/admin";

// Define path arrays outside the middleware for better performance
const publicPaths = [
  '/auth/signin',
  '/auth/signup',
  '/api/auth',
  '/blogs',
  '/api/blog'
];


const adminOnlyPaths = [
  '/',
  '/admin',
  '/demo',
  '/verify-email',
  '/api/admin',
  '/api/background-jobs',
  '/api/browse-files',
  '/api/browse-readme-files',
  '/api/cache',
  '/api/chat',
  '/api/chunk-text',
  '/api/create-directory',
  '/api/database',
  '/api/debug',
  '/api/email-logs',
  '/api/image-dimensions',
  '/api/keywords',
  '/api/message-history',
  '/api/notepad',
  '/api/ollama',
  '/api/process-docx',
  '/api/process-pdf',
  '/api/process-pptx',
  '/api/system-specs',
  '/api/test-email',
  '/api/vectorize'
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname.startsWith(path));
}

function isAdminOnlyPath(pathname: string): boolean {
  return adminOnlyPaths.some(path => pathname.startsWith(path)) || pathname === '/';
}

export default withAuth(
  function middleware(req) {
    try {
      const { pathname } = req.nextUrl;
      
      // Check if the current path is public first
      if (isPublicPath(pathname)) {
        return NextResponse.next();
      }

      // Safely access the token - handle cases where it might be undefined
      const token = req.nextauth?.token;
      const userEmail = token?.email || null;
      const isAdmin = isAdminEmail(userEmail);

      // If user is not authenticated, redirect to blogs
      if (!userEmail) {
        return NextResponse.redirect(new URL('/blogs', req.url));
      }

      // For authenticated non-admin users, redirect admin-only paths to blogs
      if (!isAdmin && isAdminOnlyPath(pathname)) {
        return NextResponse.redirect(new URL('/blogs', req.url));
      }
      
      // Admin users or allowed paths can proceed
      return NextResponse.next();
    } catch (error) {
      // If anything goes wrong, redirect to blogs as a safe fallback
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/blogs', req.url));
    }
  },
  {
    callbacks: {
      authorized: () => {
        // Always return true to let our middleware function handle the logic
        // This prevents NextAuth from blocking requests prematurely
        return true;
      },
    },
  }
);

export const config = {
  // Match all paths except static files and API auth routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.ico$).*)',
  ],
};
