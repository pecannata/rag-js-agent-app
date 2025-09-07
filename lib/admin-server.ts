import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { isAdminEmail, isAdminSync } from './admin'

// Check if current session user is admin (for server components)
export async function isAdmin(session?: Session | null): Promise<boolean> {
  const currentSession = session || await getServerSession();
  return isAdminEmail(currentSession?.user?.email);
}

// Re-export common functions for convenience
export { ADMIN_EMAILS, isAdminEmail, isAdminSync } from './admin';
