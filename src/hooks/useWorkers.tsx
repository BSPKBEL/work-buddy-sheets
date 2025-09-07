import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Worker {
  id: string;
  full_name: string;
  phone: string | null;
  daily_rate: number;
  status: string;
  position: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerAssignment {
  id: string;
  worker_id: string;
  project_id: string;
  foreman_id: string | null;
  role: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  worker?: Worker;
  project?: Project;
  foreman?: Worker;
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  date: string;
  status: 'present' | 'absent' | 'sick' | 'vacation';
  hours_worked: number | null;
  notes: string | null;
  created_at: string;
  worker?: Worker;
}

export interface Payment {
  id: string;
  worker_id: string;
  date: string;
  amount: number;
  payment_date: string;
  description: string | null;
  created_at: string;
  worker?: Worker;
}

export function useWorkers() {
  return useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .order("full_name");
      
      if (error) throw error;
      return data as Worker[];
    },
  });
}

export function useAttendance() {
  return useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          worker:workers(*)
        `)
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          worker:workers(*)
        `)
        .order("payment_date", { ascending: false });
      
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useWorkerAssignments() {
  return useQuery({
    queryKey: ["worker_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_assignments")
        .select(`
          *,
          worker:workers!worker_assignments_worker_id_fkey(*),
          project:projects!worker_assignments_project_id_fkey(*),
          foreman:workers!worker_assignments_foreman_id_fkey(*)
        `)
        .order("start_date", { ascending: false });
      
      if (error) throw error;
      return data as WorkerAssignment[];
    },
  });
}