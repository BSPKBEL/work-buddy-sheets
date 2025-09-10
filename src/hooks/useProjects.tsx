import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Хуки для работы с проектами, клиентами и расходами
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          clients (*)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    }
  });
}

export function useProjectExpenses(projectId?: string) {
  return useQuery({
    queryKey: ["project_expenses", projectId],
    queryFn: async () => {
      let query = supabase
        .from("project_expenses")
        .select(`
          *,
          expense_categories (*),
          projects (name)
        `)
        .order("date", { ascending: false });
      
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !projectId || !!projectId
  });
}

export function useWorkerExpenses(workerId?: string) {
  return useQuery({
    queryKey: ["worker_expenses", workerId],
    queryFn: async () => {
      let query = supabase
        .from("worker_expenses")
        .select(`
          *,
          expense_categories (*),
          workers (full_name)
        `)
        .order("date", { ascending: false });
      
      if (workerId) {
        query = query.eq("worker_id", workerId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !workerId || !!workerId
  });
}

export function useProjectTasks(projectId?: string) {
  return useQuery({
    queryKey: ["project_tasks", projectId],
    queryFn: async () => {
      let query = supabase
        .from("project_tasks")
        .select(`
          *,
          workers (full_name),
          projects (name)
        `)
        .order("created_at", { ascending: false });
      
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !projectId || !!projectId
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
}

export function useWorkerSkills(workerId?: string) {
  return useQuery({
    queryKey: ["worker_skills", workerId],
    queryFn: async () => {
      let query = supabase
        .from("worker_skills")
        .select(`
          *,
          skills (*),
          workers (full_name)
        `)
        .order("created_at", { ascending: false });
      
      if (workerId) {
        query = query.eq("worker_id", workerId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !workerId || !!workerId
  });
}

export function useCertifications(workerId?: string) {
  return useQuery({
    queryKey: ["certifications", workerId],
    queryFn: async () => {
      let query = supabase
        .from("certifications")
        .select(`
          *,
          workers (full_name)
        `)
        .order("created_at", { ascending: false });
      
      if (workerId) {
        query = query.eq("worker_id", workerId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !workerId || !!workerId
  });
}

// Мутации для создания и обновления данных
export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientData: any) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(clientData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Успешно",
        description: "Клиент добавлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectData: any) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Успешно",
        description: "Проект создан",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ table, expenseData }: { table: 'project_expenses' | 'worker_expenses', expenseData: any }) => {
      const { data, error } = await supabase
        .from(table)
        .insert(expenseData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.table] });
      queryClient.invalidateQueries({ queryKey: ["projects"] }); // Обновить актуальные расходы проектов
      toast({
        title: "Успешно",
        description: "Расход добавлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateWorkerSkill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (skillData: any) => {
      const { data, error } = await supabase
        .from("worker_skills")
        .insert(skillData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker_skills"] });
      toast({
        title: "Успешно",
        description: "Навык добавлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}