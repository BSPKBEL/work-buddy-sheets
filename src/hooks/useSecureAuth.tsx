import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { useProfile } from "./useProfile";

/**
 * Secure authentication hook that combines user auth, profile, and role checking
 * Use this hook when you need comprehensive security validation
 */
export function useSecureAuth() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { hasRole, isAdmin, isForeman, isWorker, primaryRole, loading: roleLoading } = useUserRole();

  const loading = authLoading || profileLoading || roleLoading;
  const isAuthenticated = !!(user && session);
  const isFullyLoaded = !loading && isAuthenticated;

  // Security checks
  const canAccessAdmin = isAuthenticated && isAdmin;
  const canAccessForeman = isAuthenticated && (isAdmin || isForeman);
  const canAccessWorker = isAuthenticated && (isAdmin || isForeman || isWorker);

  const requireRole = (requiredRole: 'admin' | 'foreman' | 'worker'): boolean => {
    if (!isAuthenticated) return false;
    return hasRole(requiredRole) || hasRole('admin'); // Admin always has access
  };

  return {
    // Core auth data
    user,
    session,
    profile,
    loading,
    isAuthenticated,
    isFullyLoaded,

    // Role checks
    hasRole,
    isAdmin,
    isForeman, 
    isWorker,
    primaryRole,

    // Permission checks
    canAccessAdmin,
    canAccessForeman,
    canAccessWorker,
    requireRole,

    // Actions
    signOut,
  };
}