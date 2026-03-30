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
      aftercare_tips: {
        Row: {
          created_at: string
          day_number: number
          description: string
          icon: string | null
          id: string
          service_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          description: string
          icon?: string | null
          id?: string
          service_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string
          icon?: string | null
          id?: string
          service_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "aftercare_tips_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "appointment_soap_notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
      birthday_gifts: {
        Row: {
          client_id: string
          code: string
          created_at: string
          custom_message: string | null
          discount_percent: number | null
          expiry_date: string
          free_addon_service_id: string | null
          gift_type: string
          id: string
          redeemed: boolean
          redeemed_at: string | null
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          custom_message?: string | null
          discount_percent?: number | null
          expiry_date: string
          free_addon_service_id?: string | null
          gift_type?: string
          id?: string
          redeemed?: boolean
          redeemed_at?: string | null
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          custom_message?: string | null
          discount_percent?: number | null
          expiry_date?: string
          free_addon_service_id?: string | null
          gift_type?: string
          id?: string
          redeemed?: boolean
          redeemed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "birthday_gifts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_gifts_free_addon_service_id_fkey"
            columns: ["free_addon_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
      checkout_rules: {
        Row: {
          created_at: string
          display_text: string
          id: string
          is_active: boolean
          suggested_price: number | null
          suggested_service_id: string
          trigger_service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_text?: string
          id?: string
          is_active?: boolean
          suggested_price?: number | null
          suggested_service_id: string
          trigger_service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_text?: string
          id?: string
          is_active?: boolean
          suggested_price?: number | null
          suggested_service_id?: string
          trigger_service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_rules_suggested_service_id_fkey"
            columns: ["suggested_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_rules_trigger_service_id_fkey"
            columns: ["trigger_service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
            foreignKeyName: "client_forms_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
      client_goals: {
        Row: {
          client_id: string
          created_at: string
          goal: Database["public"]["Enums"]["client_goal"]
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          goal: Database["public"]["Enums"]["client_goal"]
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          goal?: Database["public"]["Enums"]["client_goal"]
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      client_reviews: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          id: string
          is_approved: boolean
          is_public: boolean
          rating: number
          review_text: string | null
          service_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_public?: boolean
          rating?: number
          review_text?: string | null
          service_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_public?: boolean
          rating?: number
          review_text?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_treatment_progress: {
        Row: {
          category: Database["public"]["Enums"]["treatment_category"]
          client_id: string
          created_at: string
          id: string
          last_session_date: string | null
          sessions_completed: number
          sessions_target: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["treatment_category"]
          client_id: string
          created_at?: string
          id?: string
          last_session_date?: string | null
          sessions_completed?: number
          sessions_target?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["treatment_category"]
          client_id?: string
          created_at?: string
          id?: string
          last_session_date?: string | null
          sessions_completed?: number
          sessions_target?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_treatment_progress_client_id_fkey"
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
          allergies: string | null
          avatar_url: string | null
          birthday_gift_sent_year: number | null
          city: string | null
          client_tags: string[] | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          email_notifications: boolean
          email_opt_out: boolean
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          id: string
          is_vip: boolean
          last_name: string
          last_visit_date: string | null
          marketing_opt_in: string | null
          medications: string | null
          notes: string | null
          phone: string | null
          pronouns: string | null
          referral_code: string | null
          referral_source: string | null
          referring_client_id: string | null
          scheduling_alert: string | null
          sms_opt_out: boolean
          state: string | null
          text_notifications: boolean
          total_spent: number
          updated_at: string
          visit_count: number
          zip: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          birthday_gift_sent_year?: number | null
          city?: string | null
          client_tags?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          email_notifications?: boolean
          email_opt_out?: boolean
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          id?: string
          is_vip?: boolean
          last_name: string
          last_visit_date?: string | null
          marketing_opt_in?: string | null
          medications?: string | null
          notes?: string | null
          phone?: string | null
          pronouns?: string | null
          referral_code?: string | null
          referral_source?: string | null
          referring_client_id?: string | null
          scheduling_alert?: string | null
          sms_opt_out?: boolean
          state?: string | null
          text_notifications?: boolean
          total_spent?: number
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          birthday_gift_sent_year?: number | null
          city?: string | null
          client_tags?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          email_notifications?: boolean
          email_opt_out?: boolean
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          id?: string
          is_vip?: boolean
          last_name?: string
          last_visit_date?: string | null
          marketing_opt_in?: string | null
          medications?: string | null
          notes?: string | null
          phone?: string | null
          pronouns?: string | null
          referral_code?: string | null
          referral_source?: string | null
          referring_client_id?: string | null
          scheduling_alert?: string | null
          sms_opt_out?: boolean
          state?: string | null
          text_notifications?: boolean
          total_spent?: number
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_referring_client_id_fkey"
            columns: ["referring_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      exclusive_deals: {
        Row: {
          claims_count: number
          created_at: string
          deal_price: number | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          expires_at: string
          id: string
          image_url: string | null
          is_active: boolean
          max_claims: number | null
          original_price: number | null
          service_id: string | null
          starts_at: string
          title: string
        }
        Insert: {
          claims_count?: number
          created_at?: string
          deal_price?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_claims?: number | null
          original_price?: number | null
          service_id?: string | null
          starts_at?: string
          title: string
        }
        Update: {
          claims_count?: number
          created_at?: string
          deal_price?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_claims?: number | null
          original_price?: number | null
          service_id?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exclusive_deals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          id: string
          linked_client_id: string
          primary_client_id: string
          relationship: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_client_id: string
          primary_client_id: string
          relationship?: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_client_id?: string
          primary_client_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_linked_client_id_fkey"
            columns: ["linked_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
      in_app_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          category: string
          created_at: string
          icon: string | null
          id: string
          is_read: boolean
          recipient_type: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          recipient_type?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          recipient_type?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_batches: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          date_received: string
          expiration_date: string
          id: string
          is_active: boolean
          lot_number: string
          product_id: string
          quantity_received: number
          quantity_remaining: number
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          date_received?: string
          expiration_date: string
          id?: string
          is_active?: boolean
          lot_number: string
          product_id: string
          quantity_received?: number
          quantity_remaining?: number
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          date_received?: string
          expiration_date?: string
          id?: string
          is_active?: boolean
          lot_number?: string
          product_id?: string
          quantity_received?: number
          quantity_remaining?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_deductions: {
        Row: {
          amount_deducted: number
          appointment_id: string | null
          batch_id: string
          client_name: string | null
          created_at: string
          id: string
          lot_number: string | null
          product_id: string
          provider_name: string | null
        }
        Insert: {
          amount_deducted: number
          appointment_id?: string | null
          batch_id: string
          client_name?: string | null
          created_at?: string
          id?: string
          lot_number?: string | null
          product_id: string
          provider_name?: string | null
        }
        Update: {
          amount_deducted?: number
          appointment_id?: string | null
          batch_id?: string
          client_name?: string | null
          created_at?: string
          id?: string
          lot_number?: string | null
          product_id?: string
          provider_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_deductions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_deductions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_deductions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          reorder_threshold: number
          unit_type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          reorder_threshold?: number
          unit_type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          reorder_threshold?: number
          unit_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      journey_stage_configs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          service_ids: string[] | null
          sessions_target: number
          stage: string
          timeline_estimate: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          service_ids?: string[] | null
          sessions_target?: number
          stage: string
          timeline_estimate?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          service_ids?: string[] | null
          sessions_target?: number
          stage?: string
          timeline_estimate?: string | null
          updated_at?: string
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
      loyalty_redemptions: {
        Row: {
          client_id: string
          created_at: string
          id: string
          points_spent: number
          reward_id: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          points_spent: number
          reward_id: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          name: string
          points_cost: number
          redemption_count: number
          reward_type: string
          reward_value: number | null
          service_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          name: string
          points_cost: number
          redemption_count?: number
          reward_type?: string
          reward_value?: number | null
          service_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          name?: string
          points_cost?: number
          redemption_count?: number
          reward_type?: string
          reward_value?: number | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
          {
            foreignKeyName: "messages_sender_staff_id_fkey"
            columns: ["sender_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
      notification_triggers: {
        Row: {
          channels: string[]
          created_at: string
          description: string | null
          email_body: string
          email_subject: string | null
          google_review_url: string | null
          id: string
          is_enabled: boolean
          name: string
          sms_body: string
          timing_description: string | null
          trigger_key: string
          updated_at: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          description?: string | null
          email_body?: string
          email_subject?: string | null
          google_review_url?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          sms_body?: string
          timing_description?: string | null
          trigger_key: string
          updated_at?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          description?: string | null
          email_body?: string
          email_subject?: string | null
          google_review_url?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          sms_body?: string
          timing_description?: string | null
          trigger_key?: string
          updated_at?: string
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
          pricing_tiers: Json
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
          pricing_tiers?: Json
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
          pricing_tiers?: Json
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
          {
            foreignKeyName: "product_recommendations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
      purchase_requests: {
        Row: {
          client_id: string
          created_at: string
          id: string
          membership_id: string | null
          notes: string | null
          package_id: string | null
          request_type: string
          status: string
          tier_sessions: number | null
          tier_total_price: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          membership_id?: string | null
          notes?: string | null
          package_id?: string | null
          request_type: string
          status?: string
          tier_sessions?: number | null
          tier_total_price?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          membership_id?: string | null
          notes?: string | null
          package_id?: string | null
          request_type?: string
          status?: string
          tier_sessions?: number | null
          tier_total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      rebook_reminders: {
        Row: {
          client_id: string
          created_at: string
          dismissed_at: string | null
          id: string
          remind_at: string
          service_id: string
          staff_id: string | null
          status: string
          suggested_date: string
        }
        Insert: {
          client_id: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          remind_at: string
          service_id: string
          staff_id?: string | null
          status?: string
          suggested_date: string
        }
        Update: {
          client_id?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          remind_at?: string
          service_id?: string
          staff_id?: string | null
          status?: string
          suggested_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "rebook_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rebook_reminders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rebook_reminders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rebook_reminders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "receipts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "client_transactions_view"
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
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_client_id: string | null
          referrer_client_id: string
          reward_amount: number
          reward_credited: boolean
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_client_id?: string | null
          referrer_client_id: string
          reward_amount?: number
          reward_credited?: boolean
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_client_id?: string | null
          referrer_client_id?: string
          reward_amount?: number
          reward_credited?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      security_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_form_links: {
        Row: {
          created_at: string
          form_id: string
          id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          service_id: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_form_links_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_form_links_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "service_recommendations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
          rebooking_interval_days: number | null
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
          rebooking_interval_days?: number | null
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
          rebooking_interval_days?: number | null
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
      skin_analyses: {
        Row: {
          client_id: string
          concerns: Json | null
          created_at: string | null
          id: string
          next_steps: string | null
          overall_summary: string | null
          photo_url: string | null
          recommendations: Json | null
          shared_at: string | null
          shared_with_provider: boolean | null
          skin_score: number | null
        }
        Insert: {
          client_id: string
          concerns?: Json | null
          created_at?: string | null
          id?: string
          next_steps?: string | null
          overall_summary?: string | null
          photo_url?: string | null
          recommendations?: Json | null
          shared_at?: string | null
          shared_with_provider?: boolean | null
          skin_score?: number | null
        }
        Update: {
          client_id?: string
          concerns?: Json | null
          created_at?: string | null
          id?: string
          next_steps?: string | null
          overall_summary?: string | null
          photo_url?: string | null
          recommendations?: Json | null
          shared_at?: string | null
          shared_with_provider?: boolean | null
          skin_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skin_analyses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      staff_announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          expires_at: string | null
          id: string
          is_pinned: boolean
          priority: string
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          priority?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "staff_goals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_weekly_goals: {
        Row: {
          appointments_goal: number
          created_at: string
          id: string
          revenue_goal: number
          staff_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          appointments_goal?: number
          created_at?: string
          id?: string
          revenue_goal?: number
          staff_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          appointments_goal?: number
          created_at?: string
          id?: string
          revenue_goal?: number
          staff_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_weekly_goals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_weekly_goals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
          {
            foreignKeyName: "time_clock_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
          {
            foreignKeyName: "transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_chart_notes: {
        Row: {
          adverse_reaction: string
          adverse_reaction_other: string | null
          after_photo_url: string | null
          amount_units: string | null
          appointment_id: string
          before_photo_url: string | null
          client_id: string
          created_at: string
          expiration_date: string | null
          followup_instructions: string | null
          id: string
          is_locked: boolean
          lot_number: string | null
          product_used: string | null
          provider_id: string
          provider_notes: string | null
          provider_signature: string
          service_performed: string
          signed_at: string
          treatment_areas: string | null
          updated_at: string
        }
        Insert: {
          adverse_reaction?: string
          adverse_reaction_other?: string | null
          after_photo_url?: string | null
          amount_units?: string | null
          appointment_id: string
          before_photo_url?: string | null
          client_id: string
          created_at?: string
          expiration_date?: string | null
          followup_instructions?: string | null
          id?: string
          is_locked?: boolean
          lot_number?: string | null
          product_used?: string | null
          provider_id: string
          provider_notes?: string | null
          provider_signature: string
          service_performed: string
          signed_at?: string
          treatment_areas?: string | null
          updated_at?: string
        }
        Update: {
          adverse_reaction?: string
          adverse_reaction_other?: string | null
          after_photo_url?: string | null
          amount_units?: string | null
          appointment_id?: string
          before_photo_url?: string | null
          client_id?: string
          created_at?: string
          expiration_date?: string | null
          followup_instructions?: string | null
          id?: string
          is_locked?: boolean
          lot_number?: string | null
          product_used?: string | null
          provider_id?: string
          provider_notes?: string | null
          provider_signature?: string
          service_performed?: string
          signed_at?: string
          treatment_areas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_chart_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_chart_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_chart_notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_chart_notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_logs: {
        Row: {
          action: string
          client_id: string | null
          created_at: string
          dollar_value: number | null
          id: string
          related_package_id: string | null
          related_service_id: string | null
          rule_type: string
          staff_id: string | null
          suggestion_text: string
        }
        Insert: {
          action?: string
          client_id?: string | null
          created_at?: string
          dollar_value?: number | null
          id?: string
          related_package_id?: string | null
          related_service_id?: string | null
          rule_type: string
          staff_id?: string | null
          suggestion_text: string
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string
          dollar_value?: number | null
          id?: string
          related_package_id?: string | null
          related_service_id?: string | null
          rule_type?: string
          staff_id?: string | null
          suggestion_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "upsell_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_logs_related_package_id_fkey"
            columns: ["related_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_logs_related_service_id_fkey"
            columns: ["related_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
          {
            foreignKeyName: "user_roles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_streaks: {
        Row: {
          bonus_points_awarded: number
          client_id: string
          current_streak: number
          id: string
          last_visit_month: string | null
          longest_streak: number
          updated_at: string
        }
        Insert: {
          bonus_points_awarded?: number
          client_id: string
          current_streak?: number
          id?: string
          last_visit_month?: string | null
          longest_streak?: number
          updated_at?: string
        }
        Update: {
          bonus_points_awarded?: number
          client_id?: string
          current_streak?: number
          id?: string
          last_visit_month?: string | null
          longest_streak?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_streaks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
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
            foreignKeyName: "waitlist_preferred_staff_id_fkey"
            columns: ["preferred_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_public"
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
      client_transactions_view: {
        Row: {
          amount: number | null
          appointment_id: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          transaction_date: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
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
        ]
      }
      products_public: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          price: number | null
          quantity_in_stock: number | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          price?: number | null
          quantity_in_stock?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          price?: number | null
          quantity_in_stock?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_public: {
        Row: {
          avatar_url: string | null
          email: string | null
          first_name: string | null
          hire_date: string | null
          id: string | null
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"] | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string | null
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string | null
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
        }
        Relationships: []
      }
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
      get_staff_public_info: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          first_name: string
          hire_date: string
          id: string
          is_active: boolean
          last_name: string
          phone: string
          role: Database["public"]["Enums"]["staff_role"]
        }[]
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
      is_front_desk: { Args: { _user_id: string }; Returns: boolean }
      is_provider: { Args: { _user_id: string }; Returns: boolean }
      register_client: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_user_id: string
        }
        Returns: string
      }
      register_staff_auth: {
        Args: { p_staff_id: string; p_user_id: string }
        Returns: undefined
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
      client_goal:
        | "fat_loss"
        | "body_sculpting"
        | "skin_tightening"
        | "face_glow"
        | "post_weight_loss"
      employee_type: "front_desk" | "provider"
      form_status: "draft" | "pending" | "completed" | "expired"
      form_type: "intake" | "consent" | "contract" | "custom"
      staff_role: "admin" | "provider" | "front_desk"
      transaction_type: "service" | "retail" | "refund"
      treatment_category: "freeze" | "tone" | "tight" | "glow"
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
      client_goal: [
        "fat_loss",
        "body_sculpting",
        "skin_tightening",
        "face_glow",
        "post_weight_loss",
      ],
      employee_type: ["front_desk", "provider"],
      form_status: ["draft", "pending", "completed", "expired"],
      form_type: ["intake", "consent", "contract", "custom"],
      staff_role: ["admin", "provider", "front_desk"],
      transaction_type: ["service", "retail", "refund"],
      treatment_category: ["freeze", "tone", "tight", "glow"],
    },
  },
} as const
