import { useSession } from 'next-auth/react';
import { isAdminEmail } from '../../lib/admin';

export function useAdmin() {
  const { data: session, status } = useSession();
  
  const isAdmin = isAdminEmail(session?.user?.email);
  const isLoading = status === 'loading';
  const isAuthenticated = !!session;
  
  return {
    isAdmin,
    isLoading,
    isAuthenticated,
    session,
    userEmail: session?.user?.email || null
  };
}
