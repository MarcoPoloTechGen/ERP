export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: string
          selected_project_id: number | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: string
          selected_project_id?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: string
          selected_project_id?: number | null
          created_at?: string
        }
      }
      workers: {
        Row: {
          id: number
          name: string
          role: string
          category: string | null
          phone: string | null
          balance: number
          balance_usd: number
          balance_iqd: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          role: string
          category?: string | null
          phone?: string | null
          balance?: number
          balance_usd?: number
          balance_iqd?: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          role?: string
          category?: string | null
          phone?: string | null
          balance?: number
          balance_usd?: number
          balance_iqd?: number
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: number
          name: string
          contact: string | null
          phone: string | null
          email: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          contact?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          contact?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: number
          name: string
          client: string | null
          location: string | null
          status: string
          budget: number | null
          start_date: string | null
          end_date: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          client?: string | null
          location?: string | null
          status?: string
          budget?: number | null
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          client?: string | null
          location?: string | null
          status?: string
          budget?: number | null
          start_date?: string | null
          end_date?: string | null
          created_at?: string
        }
      }
      project_buildings: {
        Row: {
          id: number
          project_id: number
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          project_id: number
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          project_id?: number
          name?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: number
          name: string
          supplier_id: number | null
          project_id: number | null
          building_id: number | null
          unit: string | null
          unit_price: number | null
          currency: string
          unit_price_usd: number
          unit_price_iqd: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          supplier_id?: number | null
          project_id?: number | null
          building_id?: number | null
          unit?: string | null
          unit_price?: number | null
          currency?: string
          unit_price_usd?: number
          unit_price_iqd?: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          supplier_id?: number | null
          project_id?: number | null
          building_id?: number | null
          unit?: string | null
          unit_price?: number | null
          currency?: string
          unit_price_usd?: number
          unit_price_iqd?: number
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: number
          number: string
          supplier_id: number | null
          project_id: number | null
          building_id: number | null
          product_id: number | null
          labor_worker_id: number | null
          labor_person_name: string | null
          expense_type: string
          total_amount: number
          paid_amount: number
          total_amount_usd: number
          paid_amount_usd: number
          total_amount_iqd: number
          paid_amount_iqd: number
          currency: string
          status: string
          record_status: string
          invoice_date: string | null
          due_date: string | null
          notes: string | null
          image_path: string | null
          created_by: string | null
          deleted_by: string | null
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          number: string
          supplier_id?: number | null
          project_id?: number | null
          building_id?: number | null
          product_id?: number | null
          labor_worker_id?: number | null
          labor_person_name?: string | null
          expense_type?: string
          total_amount?: number
          paid_amount?: number
          total_amount_usd?: number
          paid_amount_usd?: number
          total_amount_iqd?: number
          paid_amount_iqd?: number
          currency?: string
          status?: string
          record_status?: string
          invoice_date?: string | null
          due_date?: string | null
          notes?: string | null
          image_path?: string | null
          created_by?: string | null
          deleted_by?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          number?: string
          supplier_id?: number | null
          project_id?: number | null
          building_id?: number | null
          product_id?: number | null
          labor_worker_id?: number | null
          labor_person_name?: string | null
          expense_type?: string
          total_amount?: number
          paid_amount?: number
          total_amount_usd?: number
          paid_amount_usd?: number
          total_amount_iqd?: number
          paid_amount_iqd?: number
          currency?: string
          status?: string
          record_status?: string
          invoice_date?: string | null
          due_date?: string | null
          notes?: string | null
          image_path?: string | null
          created_by?: string | null
          deleted_by?: string | null
          deleted_at?: string | null
          created_at?: string
        }
      }
      invoice_history: {
        Row: {
          id: number
          invoice_id: number
          change_type: string
          number: string
          supplier_id: number | null
          supplier_name: string | null
          project_id: number | null
          project_name: string | null
          building_id: number | null
          building_name: string | null
          product_id: number | null
          product_name: string | null
          total_amount: number
          paid_amount: number
          currency: string
          status: string
          invoice_date: string | null
          due_date: string | null
          notes: string | null
          image_url: string | null
          changed_by: string | null
          changed_by_name: string | null
          changed_at: string
        }
        Insert: {
          id?: number
          invoice_id: number
          change_type: string
          number: string
          supplier_id?: number | null
          supplier_name?: string | null
          project_id?: number | null
          project_name?: string | null
          building_id?: number | null
          building_name?: string | null
          product_id?: number | null
          product_name?: string | null
          total_amount?: number
          paid_amount?: number
          currency?: string
          status?: string
          invoice_date?: string | null
          due_date?: string | null
          notes?: string | null
          image_url?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          changed_at?: string
        }
        Update: {
          id?: number
          invoice_id?: number
          change_type?: string
          number?: string
          supplier_id?: number | null
          supplier_name?: string | null
          project_id?: number | null
          project_name?: string | null
          building_id?: number | null
          building_name?: string | null
          product_id?: number | null
          product_name?: string | null
          total_amount?: number
          paid_amount?: number
          currency?: string
          status?: string
          invoice_date?: string | null
          due_date?: string | null
          notes?: string | null
          image_url?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          changed_at?: string
        }
      }
      party_transactions: {
        Row: {
          id: number
          party_type: string
          worker_id: number | null
          supplier_id: number | null
          project_id: number | null
          type: string
          amount: number
          currency: string
          amount_usd: number
          amount_iqd: number
          description: string | null
          date: string
          source_invoice_id: number | null
          source_kind: string | null
          expense_category: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          party_type: string
          worker_id?: number | null
          supplier_id?: number | null
          project_id?: number | null
          type: string
          amount: number
          currency?: string
          amount_usd?: number
          amount_iqd?: number
          description?: string | null
          date?: string
          source_invoice_id?: number | null
          source_kind?: string | null
          expense_category?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          party_type?: string
          worker_id?: number | null
          supplier_id?: number | null
          project_id?: number | null
          type?: string
          amount?: number
          currency?: string
          amount_usd?: number
          amount_iqd?: number
          description?: string | null
          date?: string
          source_invoice_id?: number | null
          source_kind?: string | null
          expense_category?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      income_transactions: {
        Row: {
          id: number
          project_id: number
          amount: number
          currency: string
          amount_usd: number
          amount_iqd: number
          description: string | null
          date: string
          record_status: string
          created_by: string | null
          deleted_by: string | null
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          project_id: number
          amount: number
          currency?: string
          amount_usd?: number
          amount_iqd?: number
          description?: string | null
          date?: string
          record_status?: string
          created_by?: string | null
          deleted_by?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          project_id?: number
          amount?: number
          currency?: string
          amount_usd?: number
          amount_iqd?: number
          description?: string | null
          date?: string
          record_status?: string
          created_by?: string | null
          deleted_by?: string | null
          deleted_at?: string | null
          created_at?: string
        }
      }
      income_transaction_history: {
        Row: {
          id: number
          income_transaction_id: number
          change_type: string
          project_id: number | null
          project_name: string | null
          amount: number
          currency: string
          description: string | null
          date: string | null
          record_status: string
          changed_by: string | null
          changed_by_name: string | null
          changed_at: string
        }
        Insert: {
          id?: number
          income_transaction_id: number
          change_type: string
          project_id?: number | null
          project_name?: string | null
          amount?: number
          currency?: string
          description?: string | null
          date?: string | null
          record_status?: string
          changed_by?: string | null
          changed_by_name?: string | null
          changed_at?: string
        }
        Update: {
          id?: number
          income_transaction_id?: number
          change_type?: string
          project_id?: number | null
          project_name?: string | null
          amount?: number
          currency?: string
          description?: string | null
          date?: string | null
          record_status?: string
          changed_by?: string | null
          changed_by_name?: string | null
          changed_at?: string
        }
      }
      project_memberships: {
        Row: {
          id: number
          project_id: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: number
          project_id: number
          user_id: string
          created_at?: string
        }
        Update: {
          id?: number
          project_id?: number
          user_id?: string
          created_at?: string
        }
      }
      app_settings: {
        Row: {
          id: string
          company_logo_path: string | null
          exchange_rate_iqd_per_100_usd: number | null
          transaction_amount_min_usd: number | null
          transaction_amount_max_usd: number | null
          transaction_amount_min_iqd: number | null
          transaction_amount_max_iqd: number | null
          updated_by: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          company_logo_path?: string | null
          exchange_rate_iqd_per_100_usd?: number | null
          transaction_amount_min_usd?: number | null
          transaction_amount_max_usd?: number | null
          transaction_amount_min_iqd?: number | null
          transaction_amount_max_iqd?: number | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_logo_path?: string | null
          exchange_rate_iqd_per_100_usd?: number | null
          transaction_amount_min_usd?: number | null
          transaction_amount_max_usd?: number | null
          transaction_amount_min_iqd?: number | null
          transaction_amount_max_iqd?: number | null
          updated_by?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      app_projects: {
        Row: {
          id: number
          name: string
          client: string | null
          location: string | null
          status: string
          budget: number | null
          start_date: string | null
          end_date: string | null
          building_count: number
          created_at: string
        }
      }
      app_products: {
        Row: {
          id: number
          name: string
          supplier_id: number | null
          supplier_name: string | null
          project_id: number | null
          project_name: string | null
          building_id: number | null
          building_name: string | null
          unit: string | null
          unit_price: number | null
          currency: string
          unit_price_usd: number
          unit_price_iqd: number
          created_at: string
        }
      }
      app_invoices: {
        Row: {
          id: number
          number: string
          status: string
          record_status: string
          deleted_at: string | null
          deleted_by: string | null
          supplier_id: number | null
          supplier_name: string | null
          project_id: number | null
          project_name: string | null
          building_id: number | null
          building_name: string | null
          product_id: number | null
          product_name: string | null
          total_amount: number
          paid_amount: number
          remaining_amount: number
          currency: string
          invoice_date: string | null
          due_date: string | null
          notes: string | null
          image_path: string | null
          created_by: string | null
          created_by_name: string | null
          created_at: string
          total_amount_usd: number
          paid_amount_usd: number
          remaining_amount_usd: number
          total_amount_iqd: number
          paid_amount_iqd: number
          remaining_amount_iqd: number
          labor_worker_id: number | null
          labor_worker_name: string | null
          labor_person_name: string | null
          expense_type: string
        }
      }
      app_invoice_history: {
        Row: {
          id: number
          invoice_id: number
          change_type: string
          number: string
          status: string
          supplier_id: number | null
          supplier_name: string | null
          project_id: number | null
          project_name: string | null
          building_id: number | null
          building_name: string | null
          product_id: number | null
          product_name: string | null
          total_amount: number
          paid_amount: number
          remaining_amount: number
          currency: string
          invoice_date: string | null
          due_date: string | null
          notes: string | null
          image_url: string | null
          changed_by: string | null
          changed_by_name: string | null
          changed_at: string
        }
      }
      app_income_transactions: {
        Row: {
          id: number
          project_id: number
          project_name: string | null
          amount: number
          currency: string
          description: string | null
          date: string
          created_by: string | null
          created_by_name: string | null
          created_at: string
          record_status: string
          deleted_at: string | null
          deleted_by: string | null
          amount_usd: number
          amount_iqd: number
        }
      }
      app_income_transaction_history: {
        Row: {
          id: number
          income_transaction_id: number
          change_type: string
          project_id: number | null
          project_name: string | null
          amount: number
          currency: string
          description: string | null
          date: string | null
          record_status: string
          changed_by: string | null
          changed_by_name: string | null
          changed_at: string
        }
      }
      app_party_transactions: {
        Row: {
          id: number
          party_type: string
          party_id: number | null
          party_name: string | null
          worker_id: number | null
          worker_name: string | null
          supplier_id: number | null
          supplier_name: string | null
          project_id: number | null
          project_name: string | null
          type: string
          amount: number
          currency: string
          description: string | null
          date: string
          created_at: string
          amount_usd: number
          amount_iqd: number
          source_invoice_id: number | null
          source_kind: string | null
          expense_category: string | null
          created_by: string | null
          created_by_name: string | null
        }
      }
      app_worker_transactions: {
        Row: {
          id: number
          worker_id: number
          project_id: number | null
          project_name: string | null
          type: string
          amount: number
          currency: string
          description: string | null
          date: string
          created_at: string
          amount_usd: number
          amount_iqd: number
          source_invoice_id: number | null
          source_kind: string | null
          expense_category: string | null
          created_by: string | null
          created_by_name: string | null
        }
      }
      app_supplier_transactions: {
        Row: {
          id: number
          supplier_id: number
          project_id: number | null
          project_name: string | null
          type: string
          amount: number
          currency: string
          description: string | null
          date: string
          created_at: string
          amount_usd: number
          amount_iqd: number
          source_invoice_id: number | null
          source_kind: string | null
          expense_category: string | null
          created_by: string | null
          created_by_name: string | null
        }
      }
      all_expenses: {
        Row: {
          id: number
          created_at: string
          expense_source: string
          reference: string
          category: string
          amount: number
          amount_usd: number | null
          amount_iqd: number | null
          currency: string
          notes: string | null
          date: string | null
          project_id: number | null
          project_name: string | null
          supplier_id: number | null
          supplier_name: string | null
          labor_worker_id: number | null
          labor_worker_name: string | null
          status: string
          party_type: string
          total_amount_text: string | null
          paid_amount_text: string | null
          remaining_amount_text: string | null
          due_date_text: string | null
          image_path: string | null
          created_by: string | null
          created_by_name: string | null
          record_status: string
        }
      }
    }
    Functions: {
      can_access_project: {
        Args: { project_id: number }
        Returns: boolean
      }
      is_admin: {
        Args: {}
        Returns: boolean
      }
      current_user_role: {
        Args: {}
        Returns: string
      }
      get_dashboard_overview: {
        Args: {}
        Returns: Json
      }
      replace_user_project_memberships: {
        Args: { target_user_id: string; project_ids: number[] }
        Returns: void
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
