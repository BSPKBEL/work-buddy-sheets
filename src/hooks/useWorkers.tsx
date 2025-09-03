import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Worker {
  id: string;
  full_name: string;
  phone: string | null;
  daily_rate: number;
  created_at: string;
  updated_at: string;
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