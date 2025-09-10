import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSecureAuth } from "./useSecureAuth";
import { useToast } from "./use-toast";

export interface SecureClient {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  company_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSecureClients() {
  const { isAdmin, isForeman, user } = useSecureAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for secure client data
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['secure-clients'],
    queryFn: async (): Promise<SecureClient[]> => {
      if (!user || (!isAdmin && !isForeman)) {
        throw new Error('Недостаточно прав доступа');
      }

      // Use direct table access instead of RPC to avoid INSERT during reads
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching secure clients:', error);
        throw error;
      }

      // Log access separately (async, don't block on errors)
      setTimeout(() => {
        supabase.rpc('check_and_log_client_access', {
          _action: 'VIEW_LIST',
          _client_id: null
        });
      }, 0);

      return data as SecureClient[];
    },
    enabled: !!(user && (isAdmin || isForeman)),
  });

  // Show error via toast if query fails
  if (error) {
    toast({
      title: "Ошибка загрузки",
      description: error.message || "Не удалось загрузить данные клиентов",
      variant: "destructive",
    });
  }

  // Mutation for creating clients (admin only)
  const createClientMutation = useMutation({
    mutationFn: async (clientData: Omit<SecureClient, 'id' | 'created_at' | 'updated_at'>) => {
      if (!isAdmin) {
        throw new Error('Только администраторы могут создавать клиентов');
      }

      // Log the access attempt (async, don't block)
      setTimeout(() => {
        supabase.rpc('check_and_log_client_access', {
          _action: 'CREATE',
          _client_id: null
        });
      }, 0);

      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...clientData, status: clientData.status || 'active' }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure-clients'] });
      toast({
        title: "Успешно",
        description: "Клиент создан",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать клиента",
        variant: "destructive",
      });
    }
  });

  // Mutation for updating clients (admin only)
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SecureClient> & { id: string }) => {
      if (!isAdmin) {
        throw new Error('Только администраторы могут изменять данные клиентов');
      }

      // Log the access attempt (async, don't block)
      setTimeout(() => {
        supabase.rpc('check_and_log_client_access', {
          _action: 'UPDATE',
          _client_id: id
        });
      }, 0);

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure-clients'] });
      toast({
        title: "Успешно",
        description: "Данные клиента обновлены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить данные клиента",
        variant: "destructive",
      });
    }
  });

  // Function to get masked client info for non-admins
  const getMaskedClientInfo = async (clientId: string) => {
    if (isAdmin) {
      // Admin gets full data directly from table
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      return data;
    } else {
      // Non-admin gets masked data
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, contact_person, email, phone, company_type, status, created_at, updated_at')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      // Return masked version for non-admins
      return {
        ...data,
        email: data.email ? '***@***' : null,
        phone: data.phone ? '+7***' : null,
        address: 'Адрес скрыт для безопасности',
        notes: 'Заметки скрыты для безопасности'
      };
    }
  };

  // Function to check if user can access specific client
  const canAccessClient = (clientId: string): boolean => {
    if (isAdmin) return true;
    
    // For foremen, check if they have projects with this client
    // This would be handled by the RLS policies
    return isForeman;
  };

  // Function to log sensitive data access
  const logSensitiveAccess = async (action: string, clientId?: string) => {
    // Async logging that doesn't block UI
    setTimeout(() => {
      supabase.rpc('check_and_log_client_access', {
        _action: action,
        _client_id: clientId || null
      });
    }, 0);
  };

  return {
    clients,
    isLoading,
    error,
    createClient: createClientMutation.mutate,
    updateClient: updateClientMutation.mutate,
    isCreating: createClientMutation.isPending,
    isUpdating: updateClientMutation.isPending,
    getMaskedClientInfo,
    canAccessClient,
    logSensitiveAccess,
    // Security status
    hasFullAccess: isAdmin,
    hasLimitedAccess: isForeman,
    canCreateClients: isAdmin,
    canUpdateClients: isAdmin,
  };
}