export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string
          date: string
          hours_worked: number | null
          id: string
          notes: string | null
          status: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          status: string
          worker_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          certificate_url: string | null
          created_at: string
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          name: string
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          name: string
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          name?: string
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_type: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_type?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_type?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          id: string
          payment_date: string | null
          worker_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description?: string | null
          id?: string
          payment_date?: string | null
          worker_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          payment_date?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          project_id: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          project_id: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          project_id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_hours: number | null
          assigned_worker_id: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string
          project_id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_worker_id?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_worker_id?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_cost: number | null
          address: string | null
          budget: number | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          priority: string | null
          progress_percentage: number | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          address?: string | null
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          address?: string | null
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      worker_assignments: {
        Row: {
          created_at: string
          end_date: string | null
          foreman_id: string | null
          id: string
          project_id: string
          role: string
          start_date: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          foreman_id?: string | null
          id?: string
          project_id: string
          role?: string
          start_date?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          foreman_id?: string | null
          id?: string
          project_id?: string
          role?: string
          start_date?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_assignments_foreman_id_fkey"
            columns: ["foreman_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          receipt_url: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_expenses_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_skills: {
        Row: {
          certified: boolean | null
          created_at: string
          id: string
          level: number
          notes: string | null
          skill_id: string
          updated_at: string
          worker_id: string
          years_experience: number | null
        }
        Insert: {
          certified?: boolean | null
          created_at?: string
          id?: string
          level?: number
          notes?: string | null
          skill_id: string
          updated_at?: string
          worker_id: string
          years_experience?: number | null
        }
        Update: {
          certified?: boolean | null
          created_at?: string
          id?: string
          level?: number
          notes?: string | null
          skill_id?: string
          updated_at?: string
          worker_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_skills_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          created_at: string
          daily_rate: number
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          position: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_rate?: number
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_rate?: number
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_security_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          details: string
          security_check: string
          status: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      promote_user_to_admin: {
        Args: { user_email: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
