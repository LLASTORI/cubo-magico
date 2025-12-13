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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_notification_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          setting_description: string | null
          setting_key: string
          setting_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_description?: string | null
          setting_key: string
          setting_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_description?: string | null
          setting_key?: string
          setting_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          activity_type: string
          contact_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          project_id: string
          transaction_id: string | null
        }
        Insert: {
          activity_type: string
          contact_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          project_id: string
          transaction_id?: string | null
        }
        Update: {
          activity_type?: string
          contact_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          project_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "crm_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities_tasks: {
        Row: {
          activity_type: string
          assigned_to: string | null
          completed_at: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          assigned_to?: string | null
          completed_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cadence_steps: {
        Row: {
          activity_type: string
          cadence_id: string
          created_at: string
          delay_days: number
          delay_hours: number
          description: string | null
          id: string
          priority: string
          step_order: number
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          cadence_id: string
          created_at?: string
          delay_days?: number
          delay_hours?: number
          description?: string | null
          id?: string
          priority?: string
          step_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          cadence_id?: string
          created_at?: string
          delay_days?: number
          delay_hours?: number
          description?: string | null
          id?: string
          priority?: string
          step_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_cadence_steps_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "crm_cadences"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cadences: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          project_id: string
          trigger_on: string
          trigger_stage_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          trigger_on?: string
          trigger_stage_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          trigger_on?: string
          trigger_stage_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_cadences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cadences_trigger_stage_id_fkey"
            columns: ["trigger_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact_cadences: {
        Row: {
          cadence_id: string
          completed_at: string | null
          contact_id: string
          created_at: string
          current_step: number
          id: string
          next_activity_at: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          cadence_id: string
          completed_at?: string | null
          contact_id: string
          created_at?: string
          current_step?: number
          id?: string
          next_activity_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cadence_id?: string
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          current_step?: number
          id?: string
          next_activity_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_cadences_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "crm_cadences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_cadences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          cep: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          document: string | null
          email: string
          first_page_name: string | null
          first_purchase_at: string | null
          first_seen_at: string
          first_utm_ad: string | null
          first_utm_adset: string | null
          first_utm_campaign: string | null
          first_utm_content: string | null
          first_utm_creative: string | null
          first_utm_medium: string | null
          first_utm_placement: string | null
          first_utm_source: string | null
          first_utm_term: string | null
          id: string
          instagram: string | null
          last_activity_at: string
          last_purchase_at: string | null
          name: string | null
          neighborhood: string | null
          notes: string | null
          phone: string | null
          phone_ddd: string | null
          pipeline_stage_id: string | null
          project_id: string
          source: string
          state: string | null
          status: string
          tags: string[] | null
          total_purchases: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          cep?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          document?: string | null
          email: string
          first_page_name?: string | null
          first_purchase_at?: string | null
          first_seen_at?: string
          first_utm_ad?: string | null
          first_utm_adset?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_creative?: string | null
          first_utm_medium?: string | null
          first_utm_placement?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          id?: string
          instagram?: string | null
          last_activity_at?: string
          last_purchase_at?: string | null
          name?: string | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_ddd?: string | null
          pipeline_stage_id?: string | null
          project_id: string
          source?: string
          state?: string | null
          status?: string
          tags?: string[] | null
          total_purchases?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          cep?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          document?: string | null
          email?: string
          first_page_name?: string | null
          first_purchase_at?: string | null
          first_seen_at?: string
          first_utm_ad?: string | null
          first_utm_adset?: string | null
          first_utm_campaign?: string | null
          first_utm_content?: string | null
          first_utm_creative?: string | null
          first_utm_medium?: string | null
          first_utm_placement?: string | null
          first_utm_source?: string | null
          first_utm_term?: string | null
          id?: string
          instagram?: string | null
          last_activity_at?: string
          last_purchase_at?: string | null
          name?: string | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_ddd?: string | null
          pipeline_stage_id?: string | null
          project_id?: string
          source?: string
          state?: string | null
          status?: string
          tags?: string[] | null
          total_purchases?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          is_lost: boolean
          is_won: boolean
          name: string
          position: number
          project_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_lost?: boolean
          is_won?: boolean
          name: string
          position?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_lost?: boolean
          is_won?: boolean
          name?: string
          position?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_transactions: {
        Row: {
          affiliate_code: string | null
          affiliate_name: string | null
          confirmation_date: string | null
          contact_id: string
          coupon: string | null
          created_at: string
          external_id: string | null
          funnel_id: string | null
          id: string
          installment_number: number | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          metadata: Json | null
          net_revenue: number | null
          offer_code: string | null
          offer_name: string | null
          offer_price: number | null
          payment_method: string | null
          payment_type: string | null
          platform: string
          product_code: string | null
          product_name: string
          product_price: number | null
          project_id: string
          status: string
          total_price: number | null
          total_price_brl: number | null
          transaction_date: string | null
          updated_at: string
          utm_ad: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_creative: string | null
          utm_medium: string | null
          utm_placement: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_name?: string | null
          confirmation_date?: string | null
          contact_id: string
          coupon?: string | null
          created_at?: string
          external_id?: string | null
          funnel_id?: string | null
          id?: string
          installment_number?: number | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          metadata?: Json | null
          net_revenue?: number | null
          offer_code?: string | null
          offer_name?: string | null
          offer_price?: number | null
          payment_method?: string | null
          payment_type?: string | null
          platform?: string
          product_code?: string | null
          product_name: string
          product_price?: number | null
          project_id: string
          status: string
          total_price?: number | null
          total_price_brl?: number | null
          transaction_date?: string | null
          updated_at?: string
          utm_ad?: string | null
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_creative?: string | null
          utm_medium?: string | null
          utm_placement?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_name?: string | null
          confirmation_date?: string | null
          contact_id?: string
          coupon?: string | null
          created_at?: string
          external_id?: string | null
          funnel_id?: string | null
          id?: string
          installment_number?: number | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          metadata?: Json | null
          net_revenue?: number | null
          offer_code?: string | null
          offer_name?: string | null
          offer_price?: number | null
          payment_method?: string | null
          payment_type?: string | null
          platform?: string
          product_code?: string | null
          product_name?: string
          product_price?: number | null
          project_id?: string
          status?: string
          total_price?: number | null
          total_price_brl?: number | null
          transaction_date?: string | null
          updated_at?: string
          utm_ad?: string | null
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_creative?: string | null
          utm_medium?: string | null
          utm_placement?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhook_keys: {
        Row: {
          allowed_sources: string[] | null
          api_key: string
          created_at: string
          default_tags: string[] | null
          field_mappings: Json | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          project_id: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          allowed_sources?: string[] | null
          api_key?: string
          created_at?: string
          default_tags?: string[] | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          project_id: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          allowed_sources?: string[] | null
          api_key?: string
          created_at?: string
          default_tags?: string[] | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          project_id?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhook_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_changes: {
        Row: {
          anotacoes: string | null
          codigo_oferta: string | null
          created_at: string
          data_alteracao: string
          descricao: string
          id: string
          id_funil: string
          project_id: string | null
          tipo_alteracao: string
          updated_at: string
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          anotacoes?: string | null
          codigo_oferta?: string | null
          created_at?: string
          data_alteracao?: string
          descricao: string
          id?: string
          id_funil: string
          project_id?: string | null
          tipo_alteracao: string
          updated_at?: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          anotacoes?: string | null
          codigo_oferta?: string | null
          created_at?: string
          data_alteracao?: string
          descricao?: string
          id?: string
          id_funil?: string
          project_id?: string | null
          tipo_alteracao?: string
          updated_at?: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_meta_accounts: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          meta_account_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          meta_account_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          meta_account_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_meta_accounts_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_meta_accounts_meta_account_id_fkey"
            columns: ["meta_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_meta_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_score_history: {
        Row: {
          connect_rate_score: number | null
          created_at: string
          funnel_id: string
          id: string
          positions_score: number | null
          project_id: string
          recorded_date: string
          score: number
          tx_checkout_compra_score: number | null
          tx_pagina_checkout_score: number | null
        }
        Insert: {
          connect_rate_score?: number | null
          created_at?: string
          funnel_id: string
          id?: string
          positions_score?: number | null
          project_id: string
          recorded_date?: string
          score: number
          tx_checkout_compra_score?: number | null
          tx_pagina_checkout_score?: number | null
        }
        Update: {
          connect_rate_score?: number | null
          created_at?: string
          funnel_id?: string
          id?: string
          positions_score?: number | null
          project_id?: string
          recorded_date?: string
          score?: number
          tx_checkout_compra_score?: number | null
          tx_pagina_checkout_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_score_history_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_score_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          campaign_name_pattern: string | null
          created_at: string
          funnel_type: string
          has_fixed_dates: boolean | null
          id: string
          launch_end_date: string | null
          launch_start_date: string | null
          name: string
          project_id: string | null
          roas_target: number | null
          updated_at: string
        }
        Insert: {
          campaign_name_pattern?: string | null
          created_at?: string
          funnel_type?: string
          has_fixed_dates?: boolean | null
          id?: string
          launch_end_date?: string | null
          launch_start_date?: string | null
          name: string
          project_id?: string | null
          roas_target?: number | null
          updated_at?: string
        }
        Update: {
          campaign_name_pattern?: string | null
          created_at?: string
          funnel_type?: string
          has_fixed_dates?: boolean | null
          id?: string
          launch_end_date?: string | null
          launch_start_date?: string | null
          name?: string
          project_id?: string | null
          roas_target?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hotmart_sales: {
        Row: {
          affiliate_code: string | null
          affiliate_name: string | null
          buyer_address: string | null
          buyer_address_complement: string | null
          buyer_address_number: string | null
          buyer_cep: string | null
          buyer_city: string | null
          buyer_country: string | null
          buyer_document: string | null
          buyer_email: string | null
          buyer_instagram: string | null
          buyer_name: string | null
          buyer_neighborhood: string | null
          buyer_phone: string | null
          buyer_phone_ddd: string | null
          buyer_state: string | null
          checkout_origin: string | null
          confirmation_date: string | null
          coupon: string | null
          created_at: string
          due_date: string | null
          exchange_rate: number | null
          exchange_rate_used: number | null
          free_period: string | null
          has_coproduction: boolean | null
          id: string
          installment_number: number | null
          invoice_number: string | null
          is_upgrade: boolean | null
          items_quantity: number | null
          last_synced_at: string | null
          meta_ad_id_extracted: string | null
          meta_adset_id_extracted: string | null
          meta_campaign_id_extracted: string | null
          net_revenue: number | null
          offer_code: string | null
          offer_currency: string | null
          offer_price: number | null
          origin: string | null
          original_price: number | null
          payment_method: string | null
          payment_type: string | null
          producer_document: string | null
          producer_name: string | null
          product_code: string | null
          product_currency: string | null
          product_name: string
          product_price: number | null
          project_id: string | null
          received_value: number | null
          recurrence: number | null
          sale_attribution_type: string | null
          sale_category: string | null
          sale_date: string | null
          sale_origin: string | null
          shipping_value: number | null
          sold_as: string | null
          status: string
          subscriber_code: string | null
          total_price: number | null
          total_price_brl: number | null
          transaction_id: string
          updated_at: string
          utm_adset_name: string | null
          utm_campaign_id: string | null
          utm_creative: string | null
          utm_placement: string | null
          utm_source: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_name?: string | null
          buyer_address?: string | null
          buyer_address_complement?: string | null
          buyer_address_number?: string | null
          buyer_cep?: string | null
          buyer_city?: string | null
          buyer_country?: string | null
          buyer_document?: string | null
          buyer_email?: string | null
          buyer_instagram?: string | null
          buyer_name?: string | null
          buyer_neighborhood?: string | null
          buyer_phone?: string | null
          buyer_phone_ddd?: string | null
          buyer_state?: string | null
          checkout_origin?: string | null
          confirmation_date?: string | null
          coupon?: string | null
          created_at?: string
          due_date?: string | null
          exchange_rate?: number | null
          exchange_rate_used?: number | null
          free_period?: string | null
          has_coproduction?: boolean | null
          id?: string
          installment_number?: number | null
          invoice_number?: string | null
          is_upgrade?: boolean | null
          items_quantity?: number | null
          last_synced_at?: string | null
          meta_ad_id_extracted?: string | null
          meta_adset_id_extracted?: string | null
          meta_campaign_id_extracted?: string | null
          net_revenue?: number | null
          offer_code?: string | null
          offer_currency?: string | null
          offer_price?: number | null
          origin?: string | null
          original_price?: number | null
          payment_method?: string | null
          payment_type?: string | null
          producer_document?: string | null
          producer_name?: string | null
          product_code?: string | null
          product_currency?: string | null
          product_name: string
          product_price?: number | null
          project_id?: string | null
          received_value?: number | null
          recurrence?: number | null
          sale_attribution_type?: string | null
          sale_category?: string | null
          sale_date?: string | null
          sale_origin?: string | null
          shipping_value?: number | null
          sold_as?: string | null
          status: string
          subscriber_code?: string | null
          total_price?: number | null
          total_price_brl?: number | null
          transaction_id: string
          updated_at?: string
          utm_adset_name?: string | null
          utm_campaign_id?: string | null
          utm_creative?: string | null
          utm_placement?: string | null
          utm_source?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_name?: string | null
          buyer_address?: string | null
          buyer_address_complement?: string | null
          buyer_address_number?: string | null
          buyer_cep?: string | null
          buyer_city?: string | null
          buyer_country?: string | null
          buyer_document?: string | null
          buyer_email?: string | null
          buyer_instagram?: string | null
          buyer_name?: string | null
          buyer_neighborhood?: string | null
          buyer_phone?: string | null
          buyer_phone_ddd?: string | null
          buyer_state?: string | null
          checkout_origin?: string | null
          confirmation_date?: string | null
          coupon?: string | null
          created_at?: string
          due_date?: string | null
          exchange_rate?: number | null
          exchange_rate_used?: number | null
          free_period?: string | null
          has_coproduction?: boolean | null
          id?: string
          installment_number?: number | null
          invoice_number?: string | null
          is_upgrade?: boolean | null
          items_quantity?: number | null
          last_synced_at?: string | null
          meta_ad_id_extracted?: string | null
          meta_adset_id_extracted?: string | null
          meta_campaign_id_extracted?: string | null
          net_revenue?: number | null
          offer_code?: string | null
          offer_currency?: string | null
          offer_price?: number | null
          origin?: string | null
          original_price?: number | null
          payment_method?: string | null
          payment_type?: string | null
          producer_document?: string | null
          producer_name?: string | null
          product_code?: string | null
          product_currency?: string | null
          product_name?: string
          product_price?: number | null
          project_id?: string | null
          received_value?: number | null
          recurrence?: number | null
          sale_attribution_type?: string | null
          sale_category?: string | null
          sale_date?: string | null
          sale_origin?: string | null
          shipping_value?: number | null
          sold_as?: string | null
          status?: string
          subscriber_code?: string | null
          total_price?: number | null
          total_price_brl?: number | null
          transaction_id?: string
          updated_at?: string
          utm_adset_name?: string | null
          utm_campaign_id?: string | null
          utm_creative?: string | null
          utm_placement?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotmart_sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_phases: {
        Row: {
          created_at: string
          end_date: string | null
          funnel_id: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phase_order: number
          phase_type: string
          primary_metric: string
          project_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          funnel_id: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phase_order?: number
          phase_type: string
          primary_metric?: string
          project_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          funnel_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phase_order?: number
          phase_type?: string
          primary_metric?: string
          project_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_phases_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_products: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          offer_mapping_id: string
          product_type: string
          project_id: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          offer_mapping_id: string
          product_type?: string
          project_id: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          offer_mapping_id?: string
          product_type?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_products_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_products_offer_mapping_id_fkey"
            columns: ["offer_mapping_id"]
            isOneToOne: false
            referencedRelation: "offer_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_accounts: {
        Row: {
          account_id: string
          account_name: string | null
          created_at: string
          currency: string | null
          id: string
          is_active: boolean | null
          project_id: string
          timezone_name: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          project_id: string
          timezone_name?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string
          timezone_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads: {
        Row: {
          ad_account_id: string
          ad_id: string
          ad_name: string | null
          adset_id: string
          campaign_id: string
          created_at: string
          created_time: string | null
          creative_id: string | null
          id: string
          preview_url: string | null
          project_id: string
          status: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          ad_id: string
          ad_name?: string | null
          adset_id: string
          campaign_id: string
          created_at?: string
          created_time?: string | null
          creative_id?: string | null
          id?: string
          preview_url?: string | null
          project_id: string
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          ad_id?: string
          ad_name?: string | null
          adset_id?: string
          campaign_id?: string
          created_at?: string
          created_time?: string | null
          creative_id?: string | null
          id?: string
          preview_url?: string | null
          project_id?: string
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_adsets: {
        Row: {
          ad_account_id: string
          adset_id: string
          adset_name: string | null
          campaign_id: string
          created_at: string
          created_time: string | null
          daily_budget: number | null
          end_time: string | null
          id: string
          lifetime_budget: number | null
          project_id: string
          start_time: string | null
          status: string | null
          targeting: Json | null
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          adset_id: string
          adset_name?: string | null
          campaign_id: string
          created_at?: string
          created_time?: string | null
          daily_budget?: number | null
          end_time?: string | null
          id?: string
          lifetime_budget?: number | null
          project_id: string
          start_time?: string | null
          status?: string | null
          targeting?: Json | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          adset_id?: string
          adset_name?: string | null
          campaign_id?: string
          created_at?: string
          created_time?: string | null
          daily_budget?: number | null
          end_time?: string | null
          id?: string
          lifetime_budget?: number | null
          project_id?: string
          start_time?: string | null
          status?: string | null
          targeting?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_adsets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          ad_account_id: string
          campaign_id: string
          campaign_name: string | null
          created_at: string
          created_time: string | null
          daily_budget: number | null
          id: string
          lifetime_budget: number | null
          objective: string | null
          project_id: string
          start_time: string | null
          status: string | null
          stop_time: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          campaign_id: string
          campaign_name?: string | null
          created_at?: string
          created_time?: string | null
          daily_budget?: number | null
          id?: string
          lifetime_budget?: number | null
          objective?: string | null
          project_id: string
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          campaign_id?: string
          campaign_name?: string | null
          created_at?: string
          created_time?: string | null
          daily_budget?: number | null
          id?: string
          lifetime_budget?: number | null
          objective?: string | null
          project_id?: string
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_credentials: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          project_id: string
          token_type: string | null
          updated_at: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          project_id: string
          token_type?: string | null
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          project_id?: string
          token_type?: string | null
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_insights: {
        Row: {
          actions: Json | null
          ad_account_id: string
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          clicks: number | null
          cost_per_action_type: Json | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date_start: string
          date_stop: string
          frequency: number | null
          id: string
          impressions: number | null
          project_id: string
          reach: number | null
          spend: number | null
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          ad_account_id: string
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          cost_per_action_type?: Json | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_start: string
          date_stop: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          project_id: string
          reach?: number | null
          spend?: number | null
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          ad_account_id?: string
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          cost_per_action_type?: Json | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_start?: string
          date_stop?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          project_id?: string
          reach?: number | null
          spend?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_mappings: {
        Row: {
          anotacoes: string | null
          codigo_oferta: string | null
          created_at: string
          data_ativacao: string | null
          data_desativacao: string | null
          funnel_id: string | null
          id: string
          id_funil: string
          id_produto: string | null
          id_produto_visual: string | null
          nome_oferta: string | null
          nome_posicao: string | null
          nome_produto: string
          ordem_posicao: number | null
          project_id: string | null
          status: string | null
          tipo_posicao: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          anotacoes?: string | null
          codigo_oferta?: string | null
          created_at?: string
          data_ativacao?: string | null
          data_desativacao?: string | null
          funnel_id?: string | null
          id?: string
          id_funil: string
          id_produto?: string | null
          id_produto_visual?: string | null
          nome_oferta?: string | null
          nome_posicao?: string | null
          nome_produto: string
          ordem_posicao?: number | null
          project_id?: string | null
          status?: string | null
          tipo_posicao?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          anotacoes?: string | null
          codigo_oferta?: string | null
          created_at?: string
          data_ativacao?: string | null
          data_desativacao?: string | null
          funnel_id?: string | null
          id?: string
          id_funil?: string
          id_produto?: string | null
          id_produto_visual?: string | null
          nome_oferta?: string | null
          nome_posicao?: string | null
          nome_produto?: string
          ordem_posicao?: number | null
          project_id?: string | null
          status?: string | null
          tipo_posicao?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_campaigns: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          phase_id: string
          project_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          phase_id: string
          project_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          phase_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_campaigns_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "launch_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_projects: number
          name: string
          price_cents: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_projects?: number
          name: string
          price_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_projects?: number
          name?: string
          price_cents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_create_projects: boolean | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          max_projects: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          can_create_projects?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          max_projects?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          can_create_projects?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          max_projects?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      project_credentials: {
        Row: {
          basic_auth: string | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          id: string
          is_configured: boolean | null
          is_validated: boolean | null
          project_id: string
          provider: string
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          basic_auth?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          is_configured?: boolean | null
          is_validated?: boolean | null
          project_id: string
          provider?: string
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          basic_auth?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          is_configured?: boolean | null
          is_validated?: boolean | null
          project_id?: string
          provider?: string
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          project_id: string
          responded_at: string | null
          role: Database["public"]["Enums"]["project_role"]
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          project_id: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["project_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          project_id?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["project_role"]
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_modules: {
        Row: {
          created_at: string
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean
          module_key: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module_key: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module_key?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_modules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_trial: boolean | null
          notes: string | null
          plan_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_trial?: boolean | null
          notes?: string | null
          plan_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_trial?: boolean | null
          notes?: string | null
          plan_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          sales_alerts: boolean | null
          updated_at: string
          user_id: string
          weekly_report: boolean | null
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          sales_alerts?: boolean | null
          updated_at?: string
          user_id: string
          weekly_report?: boolean | null
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          sales_alerts?: boolean | null
          updated_at?: string
          user_id?: string
          weekly_report?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_invite_to_project: { Args: { _project_id: string }; Returns: boolean }
      can_user_create_project: { Args: { _user_id: string }; Returns: boolean }
      count_project_members: { Args: { _project_id: string }; Returns: number }
      count_user_projects: { Args: { _user_id: string }; Returns: number }
      create_default_pipeline_stages: {
        Args: { _project_id: string }
        Returns: undefined
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_max_projects: { Args: { _user_id: string }; Returns: number }
      get_user_project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["project_role"]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      migrate_hotmart_to_crm: {
        Args: never
        Returns: {
          contacts_created: number
          transactions_created: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      invite_status: "pending" | "accepted" | "rejected" | "expired"
      project_role: "owner" | "manager" | "operator"
      subscription_status:
        | "active"
        | "trial"
        | "expired"
        | "cancelled"
        | "pending"
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
      app_role: ["admin", "user", "super_admin"],
      invite_status: ["pending", "accepted", "rejected", "expired"],
      project_role: ["owner", "manager", "operator"],
      subscription_status: [
        "active",
        "trial",
        "expired",
        "cancelled",
        "pending",
      ],
    },
  },
} as const
