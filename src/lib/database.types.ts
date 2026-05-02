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
          exchange_rate_iqd_per_100_usd: number | null
          id: string
          transaction_amount_max_iqd: number | null
          transaction_amount_max_usd: number | null
          transaction_amount_min_iqd: number | null
          transaction_amount_min_usd: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_logo_path?: string | null
          exchange_rate_iqd_per_100_usd?: number | null
          id?: string
          transaction_amount_max_iqd?: number | null
          transaction_amount_max_usd?: number | null
          transaction_amount_min_iqd?: number | null
          transaction_amount_min_usd?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_logo_path?: string | null
          exchange_rate_iqd_per_100_usd?: number | null
          id?: string
          transaction_amount_max_iqd?: number | null
          transaction_amount_max_usd?: number | null
          transaction_amount_min_iqd?: number | null
          transaction_amount_min_usd?: number | null
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
      error_logs: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          page_url: string | null
          stack_trace: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          page_url?: string | null
          stack_trace?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          page_url?: string | null
          stack_trace?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      error_notifications: {
        Row: {
          app_version: string | null
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          url: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      income_transaction_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          id: number
          income_transaction_id: number
          old_amount: number
          old_amount_iqd: number | null
          old_amount_usd: number | null
          old_building_id: number | null
          old_building_name: string | null
          old_currency: string
          old_date: string
          old_description: string | null
          old_project_id: number
          building_id: number | null
          building_name: string | null
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by?: string | null
          id?: number
          income_transaction_id: number
          old_amount: number
          old_amount_iqd?: number | null
          old_amount_usd?: number | null
          old_building_id?: number | null
          old_building_name?: string | null
          old_currency: string
          old_date: string
          old_description?: string | null
          old_project_id: number
          building_id?: number | null
          building_name?: string | null
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          id?: number
          income_transaction_id?: number
          old_amount?: number
          old_amount_iqd?: number | null
          old_amount_usd?: number | null
          old_building_id?: number | null
          old_building_name?: string | null
          old_currency?: string
          old_date?: string
          old_description?: string | null
          old_project_id?: number
          building_id?: number | null
          building_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_transaction_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transaction_history_income_transaction_id_fkey"
            columns: ["income_transaction_id"]
            isOneToOne: false
            referencedRelation: "app_income_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transaction_history_income_transaction_id_fkey"
            columns: ["income_transaction_id"]
            isOneToOne: false
            referencedRelation: "income_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      income_transactions: {
        Row: {
          amount: number
          amount_iqd: number
          amount_usd: number
          building_id: number
          created_at: string
          created_by: string | null
          currency: string
          date: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: number
          project_id: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          amount_iqd?: number
          amount_usd?: number
          building_id: number
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: number
          project_id: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          amount_iqd?: number
          amount_usd?: number
          building_id?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: number
          project_id?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_transactions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_deleted_by_fkey"
            columns: ["deleted_by"]
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "income_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          building_id: number | null
          created_at: string
          currency: string
          id: number
          name: string
          notes: string | null
          project_id: number | null
          supplier_id: number | null
          unit: string | null
          unit_price: number | null
          unit_price_iqd: number
          unit_price_usd: number
        }
        Insert: {
          building_id?: number | null
          created_at?: string
          currency?: string
          id?: number
          name: string
          notes?: string | null
          project_id?: number | null
          supplier_id?: number | null
          unit?: string | null
          unit_price?: number | null
          unit_price_iqd?: number
          unit_price_usd?: number
        }
        Update: {
          building_id?: number | null
          created_at?: string
          currency?: string
          id?: number
          name?: string
          notes?: string | null
          project_id?: number | null
          supplier_id?: number | null
          unit?: string | null
          unit_price?: number | null
          unit_price_iqd?: number
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "app_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          id: string
          notify_on_critical_only: boolean | null
          notify_on_error: boolean | null
          super_admin_email: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notify_on_critical_only?: boolean | null
          notify_on_error?: boolean | null
          super_admin_email?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notify_on_critical_only?: boolean | null
          notify_on_error?: boolean | null
          super_admin_email?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      party_transaction_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          id: number
          old_building_id: number
          old_date: string
          old_description: string
          old_entity_type: string
          old_notes: string | null
          old_paid_amount_iqd: number | null
          old_paid_amount_usd: number | null
          old_supplier_id: number | null
          old_total_amount_iqd: number | null
          old_total_amount_usd: number | null
          old_worker_id: number | null
          transaction_id: number
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by?: string | null
          id?: number
          old_building_id: number
          old_date: string
          old_description: string
          old_entity_type: string
          old_notes?: string | null
          old_paid_amount_iqd?: number | null
          old_paid_amount_usd?: number | null
          old_supplier_id?: number | null
          old_total_amount_iqd?: number | null
          old_total_amount_usd?: number | null
          old_worker_id?: number | null
          transaction_id: number
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          id?: number
          old_building_id?: number
          old_date?: string
          old_description?: string
          old_entity_type?: string
          old_notes?: string | null
          old_paid_amount_iqd?: number | null
          old_paid_amount_usd?: number | null
          old_supplier_id?: number | null
          old_total_amount_iqd?: number | null
          old_total_amount_usd?: number | null
          old_worker_id?: number | null
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "party_transaction_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "all_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "app_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "app_party_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "app_supplier_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "app_worker_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "party_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      party_transactions: {
        Row: {
          building_id: number
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          deleted_by: string | null
          description: string
          entity_type: string
          id: number
          notes: string | null
          paid_amount_iqd: number
          paid_amount_usd: number
          supplier_id: number | null
          total_amount_iqd: number
          total_amount_usd: number
          updated_at: string | null
          updated_by: string | null
          worker_id: number | null
        }
        Insert: {
          building_id: number
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          entity_type: string
          id?: number
          notes?: string | null
          paid_amount_iqd?: number
          paid_amount_usd?: number
          supplier_id?: number | null
          total_amount_iqd?: number
          total_amount_usd?: number
          updated_at?: string | null
          updated_by?: string | null
          worker_id?: number | null
        }
        Update: {
          building_id?: number
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          entity_type?: string
          id?: number
          notes?: string | null
          paid_amount_iqd?: number
          paid_amount_usd?: number
          supplier_id?: number | null
          total_amount_iqd?: number
          total_amount_usd?: number
          updated_at?: string | null
          updated_by?: string | null
          worker_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_transactions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "app_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "app_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
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
          email: string | null
          full_name: string | null
          id: string
          role: string
          selected_project_id: number | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
          selected_project_id?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          selected_project_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_selected_project_id_fkey"
            columns: ["selected_project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_selected_project_id_fkey"
            columns: ["selected_project_id"]
            isOneToOne: false
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "profiles_selected_project_id_fkey"
            columns: ["selected_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_buildings: {
        Row: {
          created_at: string
          id: number
          is_default: boolean
          name: string
          project_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          is_default?: boolean
          name: string
          project_id: number
        }
        Update: {
          created_at?: string
          id?: number
          is_default?: boolean
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
        }
        Relationships: []
      }
      specialities: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      worker_specialities: {
        Row: {
          created_at: string
          speciality_id: number
          worker_id: number
        }
        Insert: {
          created_at?: string
          speciality_id: number
          worker_id: number
        }
        Update: {
          created_at?: string
          speciality_id?: number
          worker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "worker_specialities_speciality_id_fkey"
            columns: ["speciality_id"]
            isOneToOne: false
            referencedRelation: "specialities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_specialities_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          category: string | null
          created_at: string
          id: number
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: number
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: number
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      all_expenses: {
        Row: {
          amount: number | null
          amount_iqd: number | null
          amount_usd: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          date: string | null
          due_date: string | null
          expense_source: string | null
          id: number | null
          image_path: string | null
          labor_worker_id: number | null
          labor_worker_name: string | null
          notes: string | null
          paid_amount: number | null
          party_type: string | null
          project_id: number | null
          project_name: string | null
          record_status: string | null
          reference: string | null
          remaining_amount: number | null
          status: string | null
          supplier_id: number | null
          supplier_name: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "app_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["labor_worker_id"]
            isOneToOne: false
            referencedRelation: "app_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["labor_worker_id"]
            isOneToOne: false
            referencedRelation: "worker_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["labor_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
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
      app_income_transaction_history: {
        Row: {
          amount: number | null
          amount_iqd: number | null
          amount_usd: number | null
          building_id: number | null
          building_name: string | null
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          currency: string | null
          date: string | null
          description: string | null
          id: number | null
          income_transaction_id: number | null
          project_id: number | null
          project_name: string | null
          record_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_transaction_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transaction_history_income_transaction_id_fkey"
            columns: ["income_transaction_id"]
            isOneToOne: false
            referencedRelation: "app_income_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transaction_history_income_transaction_id_fkey"
            columns: ["income_transaction_id"]
            isOneToOne: false
            referencedRelation: "income_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_income_transactions: {
        Row: {
          amount: number | null
          amount_iqd: number | null
          amount_usd: number | null
          building_id: number | null
          building_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          date: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: number | null
          project_id: number | null
          project_name: string | null
          record_status: string | null
          updated_at: string | null
          updated_by: string | null
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
            foreignKeyName: "income_transactions_deleted_by_fkey"
            columns: ["deleted_by"]
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "income_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          expense_type: string | null
          id: number | null
          image_path: string | null
          invoice_date: string | null
          invoice_id: number | null
          labor_person_name: string | null
          labor_worker_id: number | null
          labor_worker_name: string | null
          notes: string | null
          number: string | null
          paid_amount: number | null
          paid_amount_iqd: number | null
          paid_amount_usd: number | null
          product_id: number | null
          product_name: string | null
          project_id: number | null
          project_name: string | null
          remaining_amount: number | null
          remaining_amount_iqd: number | null
          remaining_amount_usd: number | null
          status: string | null
          supplier_id: number | null
          supplier_name: string | null
          total_amount: number | null
          total_amount_iqd: number | null
          total_amount_usd: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_transaction_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "all_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "app_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "app_party_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "app_supplier_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "app_worker_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transaction_history_transaction_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "party_transactions"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
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
      app_invoices: {
        Row: {
          building_id: number | null
          building_name: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          deleted_at: string | null
          deleted_by: string | null
          due_date: string | null
          expense_type: string | null
          id: number | null
          image_path: string | null
          invoice_date: string | null
          labor_person_name: string | null
          labor_worker_id: number | null
          labor_worker_name: string | null
          notes: string | null
          number: string | null
          paid_amount: number | null
          paid_amount_iqd: number | null
          paid_amount_usd: number | null
          product_id: number | null
          product_name: string | null
          project_id: number | null
          project_name: string | null
          record_status: string | null
          remaining_amount: number | null
          remaining_amount_iqd: number | null
          remaining_amount_usd: number | null
          status: string | null
          supplier_id: number | null
          supplier_name: string | null
          total_amount: number | null
          total_amount_iqd: number | null
          total_amount_usd: number | null
        }
        Relationships: [
          {
            foreignKeyName: "party_transactions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "app_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["labor_worker_id"]
            isOneToOne: false
            referencedRelation: "app_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["labor_worker_id"]
            isOneToOne: false
            referencedRelation: "worker_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["labor_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
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
      app_party_transactions: {
        Row: {
          amount: number | null
          amount_iqd: number | null
          amount_usd: number | null
          building_id: number | null
          building_name: string | null
          can_manage: boolean | null
          category_id: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          date: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          expense_category: string | null
          id: number | null
          notes: string | null
          party_type: string | null
          paid_amount_iqd: number | null
          paid_amount_usd: number | null
          project_id: number | null
          project_name: string | null
          source_invoice_id: number | null
          source_kind: string | null
          supplier_id: number | null
          supplier_name: string | null
          total_amount_iqd: number | null
          total_amount_usd: number | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          worker_id: number | null
          worker_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_transactions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "app_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "app_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
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
      app_products: {
        Row: {
          building_id: number | null
          building_name: string | null
          created_at: string | null
          currency: string | null
          id: number | null
          name: string | null
          notes: string | null
          project_id: number | null
          project_name: string | null
          supplier_id: number | null
          supplier_name: string | null
          unit: string | null
          unit_price: number | null
          unit_price_iqd: number | null
          unit_price_usd: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "app_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "app_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "materials_supplier_id_fkey"
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
          updated_at: string | null
        }
        Relationships: []
      }
      app_supplier_transactions: {
        Row: {
          amount: number | null
          amount_iqd: number | null
          amount_usd: number | null
          building_id: number | null
          building_name: string | null
          can_manage: boolean | null
          category_id: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          date: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          expense_category: string | null
          id: number | null
          notes: string | null
          party_type: string | null
          paid_amount_iqd: number | null
          paid_amount_usd: number | null
          project_id: number | null
          project_name: string | null
          source_invoice_id: number | null
          source_kind: string | null
          supplier_id: number | null
          supplier_name: string | null
          total_amount_iqd: number | null
          total_amount_usd: number | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          worker_id: number | null
          worker_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_transactions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "app_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "app_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
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
      app_suppliers: {
        Row: {
          address: string | null
          balance_iqd: number | null
          balance_usd: number | null
          contact: string | null
          created_at: string | null
          email: string | null
          id: number | null
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      app_worker_transactions: {
        Row: {
          amount: number | null
          amount_iqd: number | null
          amount_usd: number | null
          building_id: number | null
          building_name: string | null
          can_manage: boolean | null
          category_id: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          date: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          expense_category: string | null
          id: number | null
          notes: string | null
          party_type: string | null
          paid_amount_iqd: number | null
          paid_amount_usd: number | null
          project_id: number | null
          project_name: string | null
          source_invoice_id: number | null
          source_kind: string | null
          supplier_id: number | null
          supplier_name: string | null
          total_amount_iqd: number | null
          total_amount_usd: number | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
          worker_id: number | null
          worker_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_transactions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "project_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "app_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "party_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "app_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "party_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "project_summary"
            referencedColumns: ["project_id"]
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
      app_workers: {
        Row: {
          balance: number | null
          balance_iqd: number | null
          balance_usd: number | null
          category: string | null
          created_at: string | null
          id: number | null
          name: string | null
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      project_summary: {
        Row: {
          expenses_iqd: number | null
          expenses_usd: number | null
          income_iqd: number | null
          income_usd: number | null
          payments_out_iqd: number | null
          payments_out_usd: number | null
          project_id: number | null
          project_name: string | null
        }
        Relationships: []
      }
      schema_info: {
        Row: {
          description: string | null
          notes: string | null
          table_name: string | null
        }
        Relationships: []
      }
      supplier_balances: {
        Row: {
          balance_iqd: number | null
          balance_usd: number | null
          supplier_id: number | null
          supplier_name: string | null
        }
        Relationships: []
      }
      worker_balances: {
        Row: {
          balance_iqd: number | null
          balance_usd: number | null
          worker_id: number | null
          worker_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_invoice_object: {
        Args: { object_name: string }
        Returns: boolean
      }
      can_access_party_transaction: { Args: never; Returns: boolean }
      can_access_project: {
        Args: { target_project_id: number }
        Returns: boolean
      }
      current_user_role: { Args: never; Returns: string }
      fn_get_role: { Args: never; Returns: string }
      fn_is_project_member: { Args: { p_project_id: number }; Returns: boolean }
      fn_log_error: {
        Args: {
          p_error_details?: Json
          p_error_message: string
          p_error_type: string
        }
        Returns: undefined
      }
      get_dashboard_overview: { Args: never; Returns: Json }
      get_invoices: {
        Args: never
        Returns: {
          amount: string
          amount_iqd: string
          amount_usd: string
          category: string
          created_at: string
          created_by: string
          created_by_name: string
          currency: string
          date: string
          due_date: string
          expense_source: string
          id: string
          image_path: string
          labor_worker_id: string
          labor_worker_name: string
          notes: string
          paid_amount: string
          party_type: string
          project_id: string
          project_name: string
          record_status: string
          reference: string
          remaining_amount: string
          status: string
          supplier_id: string
          supplier_name: string
          total_amount: string
        }[]
      }
      get_party_transactions: {
        Args: never
        Returns: {
          amount: string
          amount_iqd: string
          amount_usd: string
          category: string
          created_at: string
          created_by: string
          created_by_name: string
          currency: string
          date: string
          due_date: string
          expense_source: string
          id: string
          image_path: string
          labor_worker_id: string
          labor_worker_name: string
          notes: string
          paid_amount: string
          party_type: string
          project_id: string
          project_name: string
          record_status: string
          reference: string
          remaining_amount: string
          status: string
          supplier_id: string
          supplier_name: string
          total_amount: string
        }[]
      }
      get_super_admin_email: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      recalculate_worker_balance: {
        Args: { target_worker_id: number }
        Returns: undefined
      }
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
      set_super_admin_email: { Args: { email: string }; Returns: undefined }
      standardize_user_name: { Args: { user_id: string }; Returns: string }
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
