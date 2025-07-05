'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function AuthHeader() {
  // Development mode detection
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasValidClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_') && 
                           !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('YOUR_');
  const isDevMode = isDevelopment && !hasValidClerkKeys;
  
  // Only call useUser if Clerk is configured
  let isSignedIn = false;
  let user = null;
  
  if (hasValidClerkKeys) {
    try {
      const userData = useUser();
      isSignedIn = userData.isSignedIn;
      user = userData.user;
    } catch (error) {
      console.warn('Clerk hooks not available');
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Agentic RAG Chat
          </h1>
          {isDevMode ? (
            <p className="text-sm text-orange-600 font-medium">
              🚧 Development Mode - Authentication Disabled
            </p>
          ) : isSignedIn && (
            <p className="text-sm text-gray-500">
              Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {isDevMode ? (
            <div className="text-sm text-orange-600">
              <span className="bg-orange-100 px-2 py-1 rounded text-xs">
                Setup Clerk to enable authentication
              </span>
            </div>
          ) : isSignedIn ? (
            <>
              <Link
                href="/profile"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Profile
              </Link>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
                afterSignOutUrl="/"
              />
            </>
          ) : (
            <div className="space-x-2">
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
