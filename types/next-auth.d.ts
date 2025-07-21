import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }

  interface User {
    id: string;
    role?: string;
  }
}

// Global cache invalidation functions
declare global {
  var invalidateCategorizedCache: (() => void) | undefined;
  var invalidateAndReprimeCategorizedCache: (() => Promise<{success: boolean, message: string, error?: string}>) | undefined;
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
  }
}
