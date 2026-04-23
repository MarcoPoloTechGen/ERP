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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          company_logo_path: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_logo_path?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_logo_path?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      income_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          date: string
          description: string | null
          id: number
          project_id: number
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          description?: string | null
          id?: number
          project_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          description?: string | null
          id?: number
          project_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "income_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_history: {
        Row: {
          building_id: number | null
          building_name: string | null
          change_type: string
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          currency: string
          due_date: string | null
          id: number
          image_url: string | null
          invoice_date: string | null
          invoice_id: number
          notes: string | null
          number: string
          paid_amount: number
          product_id: number | null
          product_name: string | null
          project_id: number | null
          project_name: string | null
          status: string
          supplier_id: number | null
          supplier_name: string | null
          total_amount: number
        }
        Insert: {
          building_id?: number | null
          building_name?: string | null
          change_type: string
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          currency?: string
          due_date?: string | null
          id?: number
          image_url?: string | null
          invoice_date?: string | null
          invoice_id: number
          notes?: string | null
          number: string
          paid_amount?: number
          product_id?: number | null
          product_name?: string | null
          project_id?: number | null
          project_name?: string | null
          status?: string
          supplier_id?: number | null
          supplier_name?: string | null
          total_amount?: number
        }
        Update: {
          building_id?: number | null
          building_name?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          currency?: string
          due_date?: string | null
          id?: number
          image_url?: string | null
          invoice_date?: string | null
          invoice_id?: number
          notes?: string | null
          number?: string
          paid_amount?: number
          product_id?: number | null
          product_name?: string | null
          project_id?: number | null
          project_name?: string | null
          status?: string
          supplier_id?: number | null
          supplier_name?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_history_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "app_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "app_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          building_id: number | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: number
          image_url: string | null
          invoice_date: string
          notes: string | null
          number: string
          paid_amount: number
          product_id: number | null
          project_id: number | null
          status: string
          supplier_id: number | null
          total_amount: number
        }
        Insert: {
          building_id?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: number
          image_url?: string | null
          invoice_date: string
          notes?: string | null
          number: string
          paid_amount?: number
          product_id?: number | null
          project_id?: number | null
          status?: string
          supplier_id?: number | null
          total_amount: number
        }
        Update: {
          building_id?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: number
          image_url?: string | null
          invoice_date?: string
          notes?: string | null
          number?: string
          paid_amount?: number
          product_id?: number | null
          project_id?: number | null
          status?: string
          supplier_id?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          building_id: number | null
          created_at: string
          currency: string
          id: number
          name: string
          project_id: number | null
          supplier_id: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          building_id?: number | null
          created_at?: string
          currency?: string
          id?: number
          name: string
          project_id?: number | null
          supplier_id?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          building_id?: number | null
          created_at?: string
          currency?: string
          id?: number
          name?: string
          project_id?: number | null
          supplier_id?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      project_buildings: {
        Row: {
          created_at: string
          id: number
          name: string
          project_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          project_id: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          project_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_memberships: {
        Row: {
          created_at: string
          id: number
          project_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          project_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          project_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client: string | null
          created_at: string
          end_date: string | null
          id: number
          location: string | null
          name: string
          start_date: string | null
          status: string
        }
        Insert: {
          budget?: number | null
          client?: string | null
          created_at?: string
          end_date?: string | null
          id?: number
          location?: string | null
          name: string
          start_date?: string | null
          status?: string
        }
        Update: {
          budget?: number | null
          client?: string | null
          created_at?: string
          end_date?: string | null
          id?: number
          location?: string | null
          name?: string
          start_date?: string | null
          status?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: number
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: number
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: number
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      worker_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          date: string
          description: string | null
          id: number
          project_id: number | null
          type: string
          worker_id: number
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          date: string
          description?: string | null
          id?: number
          project_id?: number | null
          type: string
          worker_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          id?: number
          project_id?: number | null
          type?: string
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "worker_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          balance: number
          category: string | null
          created_at: string
          id: number
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          balance?: number
          category?: string | null
          created_at?: string
          id?: number
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          balance?: number
          category?: string | null
          created_at?: string
          id?: number
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_income_transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          date: string | null
          description: string | null
          id: number | null
          project_id: number | null
          project_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_invoice_history: {
        Row: {
          building_id: number | null
          building_name: string | null
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          currency: string | null
          due_date: string | null
          id: number | null
          image_url: string | null
          invoice_date: string | null
          invoice_id: number | null
          notes: string | null
          number: string | null
          paid_amount: number | null
          product_id: number | null
          product_name: string | null
          project_id: number | null
          project_name: string | null
          remaining_amount: number | null
          status: string | null
          supplier_id: number | null
          supplier_name: string | null
          total_amount: number | null
        }
        Insert: {
          building_id?: number | null
          building_name?: string | null
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          currency?: string | null
          due_date?: string | null
          id?: number | null
          image_url?: string | null
          invoice_date?: string | null
          invoice_id?: number | null
          notes?: string | null
          number?: string | null
          paid_amount?: number | null
          product_id?: number | null
          product_name?: string | null
          project_id?: number | null
          project_name?: string | null
          remaining_amount?: never
          status?: string | null
          supplier_id?: number | null
          supplier_name?: string | null
          total_amount?: number | null
        }
        Update: {
          building_id?: number | null
          building_name?: string | null
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          currency?: string | null
          due_date?: string | null
          id?: number | null
          image_url?: string | null
          invoice_date?: string | null
          invoice_id?: number | null
          notes?: string | null
          number?: string | null
          paid_amount?: number | null
          product_id?: number | null
          product_name?: string | null
          project_id?: number | null
          project_name?: string | null
          remaining_amount?: never
          status?: string | null
          supplier_id?: number | null
          supplier_name?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_history_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "app_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "app_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      app_invoices: {
        Row: {
          building_id: number | null
          building_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          due_date: string | null
          id: number | null
          image_url: string | null
          invoice_date: string | null
          notes: string | null
          number: string | null
          paid_amount: number | null
          product_id: number | null
          product_name: string | null
          project_id: number | null
          project_name: string | null
          remaining_amount: number | null
          status: string | null
          supplier_id: number | null
          supplier_name: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      app_products: {
        Row: {
          building_id: number | null
          building_name: string | null
          created_at: string | null
          currency: string | null
          id: number | null
          name: string | null
          project_id: number | null
          project_name: string | null
          supplier_id: number | null
          supplier_name: string | null
          unit: string | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      app_projects: {
        Row: {
          budget: number | null
          building_count: number | null
          client: string | null
          created_at: string | null
          end_date: string | null
          id: number | null
          location: string | null
          name: string | null
          start_date: string | null
          status: string | null
        }
        Relationships: []
      }
      app_worker_transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          date: string | null
          description: string | null
          id: number | null
          project_id: number | null
          project_name: string | null
          type: string | null
          worker_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_invoice_object: {
        Args: { object_name: string }
        Returns: boolean
      }
      can_access_project: {
        Args: { target_project_id: number }
        Returns: boolean
      }
      current_user_role: { Args: never; Returns: string }
      get_dashboard_overview: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      replace_project_buildings: {
        Args: { p_building_names: string[]; p_project_id: number }
        Returns: undefined
      }
      replace_user_project_memberships: {
        Args: { p_project_ids: number[]; p_user_id: string }
        Returns: undefined
      }
      save_project_with_buildings: {
        Args: {
          p_budget: number
          p_building_names: string[]
          p_client: string
          p_end_date: string
          p_id: number
          p_location: string
          p_name: string
          p_start_date: string
          p_status: string
        }
        Returns: number
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
