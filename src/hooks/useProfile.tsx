import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export async function createAdminUser(email: string) {
  // This function should be called manually for the first admin
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}