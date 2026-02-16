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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointment_soap_notes: {
        Row: {
          appointment_id: string
          assessment: string | null
          created_at: string
          id: string
          objective: string | null
          plan: string | null
          provider_id: string | null
          subjective: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          assessment?: string | null
          created_at?: string
          id?: string
          objective?: string | null
          plan?: string | null
          provider_id?: string | null
          subjective?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          assessment?: string | null
          created_at?: string
          id?: string
          objective?: string | null
          plan?: string | null
          provider_id?: string | null
          subjective?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_soap_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_soap_notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          aftercare_sent_at: string | null
          checked_in_at: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          machine_id: string | null
          notes: string | null
          rebooked_from_id: string | null
          rebooked_to_id: string | null
          review_requested_at: string | null
          room_id: string | null
          scheduled_at: string
          service_id: string | null
          staff_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          aftercare_sent_at?: string | null
          checked_in_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          machine_id?: string | null
          notes?: string | null
          rebooked_from_id?: string | null
          rebooked_to_id?: string | null
          review_requested_at?: string | null
          room_id?: string | null
          scheduled_at: string
          service_id?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          aftercare_sent_at?: string | null
          checked_in_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          machine_id?: string | null
          notes?: string | null
          rebooked_from_id?: string | null
          rebooked_to_id?: string | null
          review_requested_at?: string | null
          room_id?: string | null
          scheduled_at?: string
          service_id?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rebooked_from_id_fkey"
            columns: ["rebooked_from_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rebooked_to_id_fkey"
            columns: ["rebooked_to_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      before_after_photos: {
        Row: {
          after_photo_url: string | null
          appointment_id: string | null
          before_photo_url: string | null
          client_id: string
          created_at: string
          id: string
          is_visible_to_client: boolean
          notes: string | null
          service_id: string | null
          taken_date: string
        }
        Insert: {
          after_photo_url?: string | null
          appointment_id?: string | null
          before_photo_url?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_visible_to_client?: boolean
          notes?: string | null
          service_id?: string | null
          taken_date?: string
        }
        Update: {
          after_photo_url?: string | null
          appointment_id?: string | null
          before_photo_url?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_visible_to_client?: boolean
          notes?: string | null
          service_id?: string | null
          taken_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "before_after_photos_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "before_after_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "before_after_photos_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync: {
        Row: {
          appointment_id: string
          created_at: string
          google_calendar_id: string
          google_event_id: string
          id: string
          last_synced_at: string
          sync_error: string | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          google_calendar_id?: string
          google_event_id: string
          id?: string
          last_synced_at?: string
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          google_calendar_id?: string
          google_event_id?: string
          id?: string
          last_synced_at?: string
          sync_error?: string | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_forms: {
        Row: {
          appointment_id: string | null
          assigned_by: string | null
          client_id: string
          created_at: string
          form_id: string
          id: string
          responses: Json
          signature_data: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["form_status"]
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          assigned_by?: string | null
          client_id: string
          created_at?: string
          form_id: string
          id?: string
          responses?: Json
          signature_data?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          assigned_by?: string | null
          client_id?: string
          created_at?: string
          form_id?: string
          id?: string
          responses?: Json
          signature_data?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_forms_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_forms_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      client_memberships: {
        Row: {
          cancelled_at: string | null
          client_id: string
          created_at: string
          id: string
          membership_id: string
          next_billing_date: string | null
          remaining_credits: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          id?: string
          membership_id: string
          next_billing_date?: string | null
          remaining_credits?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          next_billing_date?: string | null
          remaining_credits?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_memberships_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          client_id: string
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          package_id: string | null
          purchase_date: string
          sessions_total: number
          sessions_used: number
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          purchase_date?: string
          sessions_total: number
          sessions_used?: number
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          purchase_date?: string
          sessions_total?: number
          sessions_used?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          is_vip: boolean
          last_name: string
          last_visit_date: string | null
          notes: string | null
          phone: string | null
          state: string | null
          total_spent: number
          updated_at: string
          visit_count: number
          zip: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_vip?: boolean
          last_name: string
          last_visit_date?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          total_spent?: number
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_vip?: boolean
          last_name?: string
          last_visit_date?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          total_spent?: number
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Relationships: []
      }
      forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          form_type: Database["public"]["Enums"]["form_type"]
          id: string
          is_active: boolean
          name: string
          requires_signature: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          form_type?: Database["public"]["Enums"]["form_type"]
          id?: string
          is_active?: boolean
          name: string
          requires_signature?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          form_type?: Database["public"]["Enums"]["form_type"]
          id?: string
          is_active?: boolean
          name?: string
          requires_signature?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          initial_amount: number
          is_active: boolean
          message: string | null
          purchased_at: string
          purchaser_email: string | null
          purchaser_name: string | null
          recipient_email: string | null
          recipient_name: string | null
          remaining_amount: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          initial_amount: number
          is_active?: boolean
          message?: string | null
          purchased_at?: string
          purchaser_email?: string | null
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          remaining_amount: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          initial_amount?: number
          is_active?: boolean
          message?: string | null
          purchased_at?: string
          purchaser_email?: string | null
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          remaining_amount?: number
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          points: number
          related_appointment_id: string | null
          transaction_type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          related_appointment_id?: string | null
          transaction_type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          related_appointment_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_related_appointment_id_fkey"
            columns: ["related_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          created_at: string
          id: string
          machine_type: string
          name: string
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          machine_type: string
          name: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          machine_type?: string
          name?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      membership_benefits_ledger: {
        Row: {
          balance_after: number
          client_membership_id: string
          created_at: string
          credits: number
          description: string | null
          id: string
          performed_by: string | null
          related_appointment_id: string | null
          related_service_id: string | null
          transaction_type: string
        }
        Insert: {
          balance_after: number
          client_membership_id: string
          created_at?: string
          credits: number
          description?: string | null
          id?: string
          performed_by?: string | null
          related_appointment_id?: string | null
          related_service_id?: string | null
          transaction_type: string
        }
        Update: {
          balance_after?: number
          client_membership_id?: string
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          performed_by?: string | null
          related_appointment_id?: string | null
          related_service_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_benefits_ledger_client_membership_id_fkey"
            columns: ["client_membership_id"]
            isOneToOne: false
            referencedRelation: "client_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_benefits_ledger_related_appointment_id_fkey"
            columns: ["related_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_benefits_ledger_related_service_id_fkey"
            columns: ["related_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          benefits: Json
          billing_period: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          monthly_service_credits: number
          name: string
          price: number
          priority_booking: boolean | null
          retail_discount_percent: number | null
          updated_at: string
        }
        Insert: {
          benefits?: Json
          billing_period?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_service_credits?: number
          name: string
          price: number
          priority_booking?: boolean | null
          retail_discount_percent?: number | null
          updated_at?: string
        }
        Update: {
          benefits?: Json
          billing_period?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_service_credits?: number
          name?: string
          price?: number
          priority_booking?: boolean | null
          retail_discount_percent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_staff_id: string | null
          sender_type: string
          subject: string | null
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_staff_id?: string | null
          sender_type: string
          subject?: string | null
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_staff_id?: string | null
          sender_type?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_staff_id_fkey"
            columns: ["sender_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          category: string
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          type: string
        }
        Insert: {
          body: string
          category: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          type: string
        }
        Update: {
          body?: string
          category?: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          services: Json
          total_sessions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          services?: Json
          total_sessions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          services?: Json
          total_sessions?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_recommendations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_purchased: boolean
          price: number | null
          priority: string | null
          product_description: string | null
          product_name: string
          product_url: string | null
          recommended_date: string
          staff_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_purchased?: boolean
          price?: number | null
          priority?: string | null
          product_description?: string | null
          product_name: string
          product_url?: string | null
          recommended_date?: string
          staff_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_purchased?: boolean
          price?: number | null
          priority?: string | null
          product_description?: string | null
          product_name?: string
          product_url?: string | null
          recommended_date?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_recommendations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recommendations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          quantity_in_stock: number
          reorder_level: number
          sku: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          quantity_in_stock?: number
          reorder_level?: number
          sku?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          quantity_in_stock?: number
          reorder_level?: number
          sku?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          created_at: string
          discount_amount: number
          google_review_url: string | null
          id: string
          machine_used: string | null
          notes: string | null
          payment_method: string | null
          receipt_format: string
          receipt_number: string
          retail_items: Json | null
          retail_total: number
          service_name: string | null
          service_price: number
          staff_id: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          tip_amount: number
          total_amount: number
          transaction_id: string | null
          treatment_summary: Json | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          discount_amount?: number
          google_review_url?: string | null
          id?: string
          machine_used?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_format?: string
          receipt_number: string
          retail_items?: Json | null
          retail_total?: number
          service_name?: string | null
          service_price?: number
          staff_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tip_amount?: number
          total_amount?: number
          transaction_id?: string | null
          treatment_summary?: Json | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          discount_amount?: number
          google_review_url?: string | null
          id?: string
          machine_used?: string | null
          notes?: string | null
          payment_method?: string | null
          receipt_format?: string
          receipt_number?: string
          retail_items?: Json | null
          retail_total?: number
          service_name?: string | null
          service_price?: number
          staff_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tip_amount?: number
          total_amount?: number
          transaction_id?: string | null
          treatment_summary?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      service_recommendations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_booked: boolean
          priority: string | null
          reason: string | null
          recommended_date: string
          service_id: string
          staff_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_booked?: boolean
          priority?: string | null
          reason?: string | null
          recommended_date?: string
          service_id: string
          staff_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_booked?: boolean
          priority?: string | null
          reason?: string | null
          recommended_date?: string
          service_id?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_recommendations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recommendations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recommendations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          aftercare_template_id: string | null
          category: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          machine_type_id: string | null
          name: string
          price: number
          recovery_buffer_minutes: number
          required_room_type: string | null
          requires_consent: boolean
          updated_at: string
        }
        Insert: {
          aftercare_template_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          machine_type_id?: string | null
          name: string
          price: number
          recovery_buffer_minutes?: number
          required_room_type?: string | null
          requires_consent?: boolean
          updated_at?: string
        }
        Update: {
          aftercare_template_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          machine_type_id?: string | null
          name?: string
          price?: number
          recovery_buffer_minutes?: number
          required_room_type?: string | null
          requires_consent?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_aftercare_template_id_fkey"
            columns: ["aftercare_template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_machine_type_id_fkey"
            columns: ["machine_type_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string
          hire_date: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          last_name: string
          phone: string | null
          pin: string
          retail_commission_rate: number | null
          role: Database["public"]["Enums"]["staff_role"]
          service_commission_tier1: number | null
          service_commission_tier2: number | null
          service_commission_tier3: number | null
          service_tier1_threshold: number | null
          service_tier2_threshold: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          hire_date?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name: string
          phone?: string | null
          pin: string
          retail_commission_rate?: number | null
          role?: Database["public"]["Enums"]["staff_role"]
          service_commission_tier1?: number | null
          service_commission_tier2?: number | null
          service_commission_tier3?: number | null
          service_tier1_threshold?: number | null
          service_tier2_threshold?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          hire_date?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string | null
          pin?: string
          retail_commission_rate?: number | null
          role?: Database["public"]["Enums"]["staff_role"]
          service_commission_tier1?: number | null
          service_commission_tier2?: number | null
          service_commission_tier3?: number | null
          service_tier1_threshold?: number | null
          service_tier2_threshold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_goals: {
        Row: {
          achieved_at: string | null
          bonus_commission_rate: number | null
          created_at: string
          daily_sales_goal: number
          goal_achieved: boolean
          goal_date: string
          id: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          bonus_commission_rate?: number | null
          created_at?: string
          daily_sales_goal?: number
          goal_achieved?: boolean
          goal_date?: string
          id?: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          bonus_commission_rate?: number | null
          created_at?: string
          daily_sales_goal?: number
          goal_achieved?: boolean
          goal_date?: string
          id?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_goals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock: {
        Row: {
          break_minutes: number
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          staff_id: string
        }
        Insert: {
          break_minutes?: number
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          staff_id: string
        }
        Update: {
          break_minutes?: number
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          description: string | null
          id: string
          staff_id: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          staff_id?: string | null
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          staff_id?: string | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          created_at: string
          employee_type: Database["public"]["Enums"]["employee_type"] | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          staff_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          employee_type?: Database["public"]["Enums"]["employee_type"] | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          staff_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          employee_type?: Database["public"]["Enums"]["employee_type"] | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          staff_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          client_id: string
          contacted_at: string | null
          created_at: string
          id: string
          notes: string | null
          preferred_date: string | null
          preferred_staff_id: string | null
          preferred_time_range: string | null
          service_id: string | null
          status: string
        }
        Insert: {
          client_id: string
          contacted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_staff_id?: string | null
          preferred_time_range?: string | null
          service_id?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          contacted_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_staff_id?: string | null
          preferred_time_range?: string | null
          service_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_preferred_staff_id_fkey"
            columns: ["preferred_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_commission: {
        Args: {
          p_amount: number
          p_period_start?: string
          p_staff_id: string
          p_transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: number
      }
      get_client_loyalty_balance: {
        Args: { p_client_id: string }
        Returns: number
      }
      get_employee_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["employee_type"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_staff_pin: {
        Args: { p_pin: string }
        Returns: {
          avatar_url: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string
          role: Database["public"]["Enums"]["staff_role"]
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "employee" | "client"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "checked_in"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      employee_type: "front_desk" | "provider"
      form_status: "draft" | "pending" | "completed" | "expired"
      form_type: "intake" | "consent" | "contract" | "custom"
      staff_role: "admin" | "provider" | "front_desk"
      transaction_type: "service" | "retail" | "refund"
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
    Enums: {
      app_role: ["owner", "employee", "client"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "checked_in",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      employee_type: ["front_desk", "provider"],
      form_status: ["draft", "pending", "completed", "expired"],
      form_type: ["intake", "consent", "contract", "custom"],
      staff_role: ["admin", "provider", "front_desk"],
      transaction_type: ["service", "retail", "refund"],
    },
  },
} as const
