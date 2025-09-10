import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AppRole = 'admin' | 'foreman' | 'worker' | 'guest';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function useUserRole() {
  const { user } = useAuth();

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user roles:', error);
        throw error;
      }

      return data as UserRole[];
    },
    enabled: !!user,
  });

  const hasRole = (role: AppRole): boolean => {
    return userRoles.some(userRole => 
      userRole.role === role && 
      userRole.is_active &&
      (userRole.expires_at === null || new Date(userRole.expires_at) > new Date())
    );
  };

  const isAdmin = hasRole('admin');
  const isForeman = hasRole('foreman');
  const isWorker = hasRole('worker');
  
  const primaryRole = userRoles.find(role => 
    role.is_active && 
    (role.expires_at === null || new Date(role.expires_at) > new Date())
  )?.role || 'guest';

  return {
    userRoles,
    hasRole,
    isAdmin,
    isForeman,
    isWorker,
    primaryRole,
    loading: isLoading,
  };
}