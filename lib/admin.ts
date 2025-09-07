import type { Session } from 'next-auth'

// Define admin users in one place
export const ADMIN_EMAILS = [
  'phil.cannata@yahoo.com',
  'braden@eocinvesting.com'
];

// Check if an email is an admin
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}

// Check if current session user is admin (synchronous version for client components and middleware)
export function isAdminSync(session: Session | null | undefined): boolean {
  return isAdminEmail(session?.user?.email);
}
