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
      ai_knowledge_base: {
        Row: {
          auto_classify_new_comments: boolean | null
          business_description: string | null
          business_name: string | null
          commercial_keywords: string[] | null
          created_at: string
          custom_categories: Json | null
          faqs: Json | null
          id: string
          min_intent_score_for_crm: number | null
          products_services: string | null
          project_id: string
          spam_keywords: string[] | null
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string
        }
        Insert: {
          auto_classify_new_comments?: boolean | null
          business_description?: string | null
          business_name?: string | null
          commercial_keywords?: string[] | null
          created_at?: string
          custom_categories?: Json | null
          faqs?: Json | null
          id?: string
          min_intent_score_for_crm?: number | null
          products_services?: string | null
          project_id: string
          spam_keywords?: string[] | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
        }
        Update: {
          auto_classify_new_comments?: boolean | null
          business_description?: string | null
          business_name?: string | null
          commercial_keywords?: string[] | null
          created_at?: string
          custom_categories?: Json | null
          faqs?: Json | null
          id?: string
          min_intent_score_for_crm?: number | null
          products_services?: string | null
          project_id?: string
          spam_keywords?: string[] | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          completed_at: string | null
          contact_id: string
          conversation_id: string | null
          created_at: string
          current_node_id: string | null
          error_message: string | null
          execution_log: Json
          flow_id: string
          id: string
          next_execution_at: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          conversation_id?: string | null
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          execution_log?: Json
          flow_id: string
          id?: string
          next_execution_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          conversation_id?: string | null
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          execution_log?: Json
          flow_id?: string
          id?: string
          next_execution_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "automation_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "automation_flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flow_edges: {
        Row: {
          created_at: string
          flow_id: string
          id: string
          label: string | null
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
        }
        Insert: {
          created_at?: string
          flow_id: string
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
        }
        Update: {
          created_at?: string
          flow_id?: string
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_flow_edges_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_flow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "automation_flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_flow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "automation_flow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flow_nodes: {
        Row: {
          config: Json
          created_at: string
          flow_id: string
          id: string
          node_type: string
          position_x: number
          position_y: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          flow_id: string
          id?: string
          node_type: string
          position_x?: number
          position_y?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          flow_id?: string
          id?: string
          node_type?: string
          position_x?: number
          position_y?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          folder_id: string | null
          id: string
          is_active: boolean
          name: string
          project_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          viewport: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          viewport?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          viewport?: Json
        }
        Relationships: [
          {
            foreignKeyName: "automation_flows_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "automation_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_flows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "automation_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_media: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          project_id: string
          public_url: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          project_id: string
          public_url: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          project_id?: string
          public_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_message_templates: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          media_url: string | null
          name: string
          project_id: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          content?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_url?: string | null
          name: string
          project_id: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_url?: string | null
          name?: string
          project_id?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "automation_message_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_metrics_daily: {
        Row: {
          avg_intent_score: number | null
          avg_sentiment_score: number | null
          commercial_interest_count: number | null
          complaints_count: number | null
          created_at: string
          id: string
          metric_date: string
          negative_count: number | null
          neutral_count: number | null
          new_comments: number | null
          positive_count: number | null
          post_id: string
          praise_count: number | null
          project_id: string
          questions_count: number | null
          total_comments: number | null
          total_replies: number | null
          updated_at: string
        }
        Insert: {
          avg_intent_score?: number | null
          avg_sentiment_score?: number | null
          commercial_interest_count?: number | null
          complaints_count?: number | null
          created_at?: string
          id?: string
          metric_date: string
          negative_count?: number | null
          neutral_count?: number | null
          new_comments?: number | null
          positive_count?: number | null
          post_id: string
          praise_count?: number | null
          project_id: string
          questions_count?: number | null
          total_comments?: number | null
          total_replies?: number | null
          updated_at?: string
        }
        Update: {
          avg_intent_score?: number | null
          avg_sentiment_score?: number | null
          commercial_interest_count?: number | null
          complaints_count?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          negative_count?: number | null
          neutral_count?: number | null
          new_comments?: number | null
          positive_count?: number | null
          post_id?: string
          praise_count?: number | null
          project_id?: string
          questions_count?: number | null
          total_comments?: number | null
          total_replies?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_metrics_daily_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_metrics_daily_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
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
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
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
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
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
      crm_contact_interactions: {
        Row: {
          contact_id: string
          created_at: string
          external_id: string | null
          funnel_id: string | null
          id: string
          interacted_at: string
          interaction_type: string
          launch_tag: string | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          metadata: Json | null
          page_name: string | null
          page_url: string | null
          project_id: string
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
          contact_id: string
          created_at?: string
          external_id?: string | null
          funnel_id?: string | null
          id?: string
          interacted_at?: string
          interaction_type?: string
          launch_tag?: string | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          metadata?: Json | null
          page_name?: string | null
          page_url?: string | null
          project_id: string
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
          contact_id?: string
          created_at?: string
          external_id?: string | null
          funnel_id?: string | null
          id?: string
          interacted_at?: string
          interaction_type?: string
          launch_tag?: string | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          metadata?: Json | null
          page_name?: string | null
          page_url?: string | null
          project_id?: string
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
            foreignKeyName: "crm_contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_interactions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_interactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          avatar_url: string | null
          cep: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          document: string | null
          document_encrypted: string | null
          email: string
          first_meta_ad_id: string | null
          first_meta_adset_id: string | null
          first_meta_campaign_id: string | null
          first_name: string | null
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
          has_pending_payment: boolean | null
          id: string
          instagram: string | null
          last_activity_at: string
          last_name: string | null
          last_offer_code: string | null
          last_offer_name: string | null
          last_product_code: string | null
          last_product_name: string | null
          last_purchase_at: string | null
          last_transaction_status: string | null
          name: string | null
          neighborhood: string | null
          notes: string | null
          phone: string | null
          phone_country_code: string | null
          phone_ddd: string | null
          pipeline_stage_id: string | null
          products_purchased: string[] | null
          project_id: string
          recovery_stage_id: string | null
          recovery_started_at: string | null
          recovery_updated_at: string | null
          source: string
          state: string | null
          status: string
          subscription_status: string | null
          tags: string[] | null
          total_purchases: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          document?: string | null
          document_encrypted?: string | null
          email: string
          first_meta_ad_id?: string | null
          first_meta_adset_id?: string | null
          first_meta_campaign_id?: string | null
          first_name?: string | null
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
          has_pending_payment?: boolean | null
          id?: string
          instagram?: string | null
          last_activity_at?: string
          last_name?: string | null
          last_offer_code?: string | null
          last_offer_name?: string | null
          last_product_code?: string | null
          last_product_name?: string | null
          last_purchase_at?: string | null
          last_transaction_status?: string | null
          name?: string | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_country_code?: string | null
          phone_ddd?: string | null
          pipeline_stage_id?: string | null
          products_purchased?: string[] | null
          project_id: string
          recovery_stage_id?: string | null
          recovery_started_at?: string | null
          recovery_updated_at?: string | null
          source?: string
          state?: string | null
          status?: string
          subscription_status?: string | null
          tags?: string[] | null
          total_purchases?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          document?: string | null
          document_encrypted?: string | null
          email?: string
          first_meta_ad_id?: string | null
          first_meta_adset_id?: string | null
          first_meta_campaign_id?: string | null
          first_name?: string | null
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
          has_pending_payment?: boolean | null
          id?: string
          instagram?: string | null
          last_activity_at?: string
          last_name?: string | null
          last_offer_code?: string | null
          last_offer_name?: string | null
          last_product_code?: string | null
          last_product_name?: string | null
          last_purchase_at?: string | null
          last_transaction_status?: string | null
          name?: string | null
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          phone_country_code?: string | null
          phone_ddd?: string | null
          pipeline_stage_id?: string | null
          products_purchased?: string[] | null
          project_id?: string
          recovery_stage_id?: string | null
          recovery_started_at?: string | null
          recovery_updated_at?: string | null
          source?: string
          state?: string | null
          status?: string
          subscription_status?: string | null
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
          {
            foreignKeyName: "crm_contacts_recovery_stage_id_fkey"
            columns: ["recovery_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_recovery_stages"
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
      crm_recovery_activities: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          created_by: string | null
          delivered_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          project_id: string
          read_at: string | null
          replied_at: string | null
          sent_at: string | null
          stage_id: string | null
          status: string
        }
        Insert: {
          channel?: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          project_id: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          stage_id?: string | null
          status?: string
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          project_id?: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          stage_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_recovery_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_recovery_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_recovery_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_recovery_activities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_recovery_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_recovery_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_initial: boolean
          is_lost: boolean
          is_recovered: boolean
          name: string
          position: number
          project_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_initial?: boolean
          is_lost?: boolean
          is_recovered?: boolean
          name: string
          position?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_initial?: boolean
          is_lost?: boolean
          is_recovered?: boolean
          name?: string
          position?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_recovery_stages_project_id_fkey"
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
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
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
          default_funnel_id: string | null
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
          default_funnel_id?: string | null
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
          default_funnel_id?: string | null
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
            foreignKeyName: "crm_webhook_keys_default_funnel_id_fkey"
            columns: ["default_funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhook_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      encryption_keys: {
        Row: {
          created_at: string
          id: string
          key_name: string
          key_value: string
          rotated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key_name: string
          key_value: string
          rotated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_name?: string
          key_value?: string
          rotated_at?: string | null
        }
        Relationships: []
      }
      feature_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          expires_at: string | null
          feature_id: string
          id: string
          target_id: string
          target_type: Database["public"]["Enums"]["override_target_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          feature_id: string
          id?: string
          target_id: string
          target_type: Database["public"]["Enums"]["override_target_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          feature_id?: string
          id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["override_target_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_overrides_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_active: boolean
          module_key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_active?: boolean
          module_key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_active?: boolean
          module_key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          launch_tag: string | null
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
          launch_tag?: string | null
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
          launch_tag?: string | null
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
      hotmart_product_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          offer_code: string | null
          plan_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          offer_code?: string | null
          plan_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          offer_code?: string | null
          plan_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotmart_product_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
          buyer_phone_country_code: string | null
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
          project_id: string
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
          buyer_phone_country_code?: string | null
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
          project_id: string
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
          buyer_phone_country_code?: string | null
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
          project_id?: string
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
          campaign_name_pattern: string | null
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
          campaign_name_pattern?: string | null
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
          campaign_name_pattern?: string | null
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
          lot_name: string | null
          offer_mapping_id: string
          product_type: string
          project_id: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          lot_name?: string | null
          offer_mapping_id: string
          product_type?: string
          project_id: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          lot_name?: string | null
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
      meta_ad_audiences: {
        Row: {
          ad_account_id: string
          created_at: string
          error_message: string | null
          estimated_size: number | null
          id: string
          last_sync_at: string | null
          meta_audience_id: string | null
          name: string
          project_id: string
          segment_config: Json
          segment_type: string
          status: string
          sync_frequency: string
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          created_at?: string
          error_message?: string | null
          estimated_size?: number | null
          id?: string
          last_sync_at?: string | null
          meta_audience_id?: string | null
          name: string
          project_id: string
          segment_config?: Json
          segment_type?: string
          status?: string
          sync_frequency?: string
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          created_at?: string
          error_message?: string | null
          estimated_size?: number | null
          id?: string
          last_sync_at?: string | null
          meta_audience_id?: string | null
          name?: string
          project_id?: string
          segment_config?: Json
          segment_type?: string
          status?: string
          sync_frequency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_audiences_project_id_fkey"
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
      meta_audience_contacts: {
        Row: {
          audience_id: string
          contact_id: string
          email_hash: string | null
          first_name_hash: string | null
          id: string
          last_name_hash: string | null
          phone_hash: string | null
          removed_at: string | null
          synced_at: string
        }
        Insert: {
          audience_id: string
          contact_id: string
          email_hash?: string | null
          first_name_hash?: string | null
          id?: string
          last_name_hash?: string | null
          phone_hash?: string | null
          removed_at?: string | null
          synced_at?: string
        }
        Update: {
          audience_id?: string
          contact_id?: string
          email_hash?: string | null
          first_name_hash?: string | null
          id?: string
          last_name_hash?: string | null
          phone_hash?: string | null
          removed_at?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_audience_contacts_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_audience_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "meta_audience_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_audience_sync_logs: {
        Row: {
          audience_id: string
          contacts_added: number
          contacts_removed: number
          contacts_total: number
          duration_ms: number | null
          errors: Json | null
          executed_at: string
          id: string
          status: string
        }
        Insert: {
          audience_id: string
          contacts_added?: number
          contacts_removed?: number
          contacts_total?: number
          duration_ms?: number | null
          errors?: Json | null
          executed_at?: string
          id?: string
          status?: string
        }
        Update: {
          audience_id?: string
          contacts_added?: number
          contacts_removed?: number
          contacts_total?: number
          duration_ms?: number | null
          errors?: Json | null
          executed_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_audience_sync_logs_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_audiences"
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
      meta_lookalike_audiences: {
        Row: {
          country: string
          created_at: string
          error_message: string | null
          id: string
          meta_lookalike_id: string | null
          name: string
          percentage: number
          source_audience_id: string
          status: string
        }
        Insert: {
          country?: string
          created_at?: string
          error_message?: string | null
          id?: string
          meta_lookalike_id?: string | null
          name: string
          percentage?: number
          source_audience_id: string
          status?: string
        }
        Update: {
          country?: string
          created_at?: string
          error_message?: string | null
          id?: string
          meta_lookalike_id?: string | null
          name?: string
          percentage?: number
          source_audience_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_lookalike_audiences_source_audience_id_fkey"
            columns: ["source_audience_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_audiences"
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
          moeda: string | null
          nome_oferta: string | null
          nome_posicao: string | null
          nome_produto: string
          ordem_posicao: number | null
          project_id: string | null
          status: string | null
          tipo_posicao: string | null
          updated_at: string
          valor: number | null
          valor_original: number | null
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
          moeda?: string | null
          nome_oferta?: string | null
          nome_posicao?: string | null
          nome_produto: string
          ordem_posicao?: number | null
          project_id?: string | null
          status?: string | null
          tipo_posicao?: string | null
          updated_at?: string
          valor?: number | null
          valor_original?: number | null
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
          moeda?: string | null
          nome_oferta?: string | null
          nome_posicao?: string | null
          nome_produto?: string
          ordem_posicao?: number | null
          project_id?: string | null
          status?: string | null
          tipo_posicao?: string | null
          updated_at?: string
          valor?: number | null
          valor_original?: number | null
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
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_id: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_id: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_id?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
          is_public: boolean
          is_trial_available: boolean | null
          max_projects: number
          max_users_per_project: number
          name: string
          price_cents: number | null
          trial_days: number | null
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          is_trial_available?: boolean | null
          max_projects?: number
          max_users_per_project?: number
          name: string
          price_cents?: number | null
          trial_days?: number | null
          type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          is_trial_available?: boolean | null
          max_projects?: number
          max_users_per_project?: number
          name?: string
          price_cents?: number | null
          trial_days?: number | null
          type?: Database["public"]["Enums"]["plan_type"]
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
          last_login_at: string | null
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
          last_login_at?: string | null
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
          last_login_at?: string | null
          max_projects?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      project_credentials: {
        Row: {
          basic_auth: string | null
          basic_auth_encrypted: string | null
          client_id: string | null
          client_secret: string | null
          client_secret_encrypted: string | null
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
          basic_auth_encrypted?: string | null
          client_id?: string | null
          client_secret?: string | null
          client_secret_encrypted?: string | null
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
          basic_auth_encrypted?: string | null
          client_id?: string | null
          client_secret?: string | null
          client_secret_encrypted?: string | null
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
          permissions_analise:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_automacoes:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_chat_ao_vivo:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_configuracoes:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_crm:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_dashboard:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_lancamentos:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_meta_ads:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_ofertas:
            | Database["public"]["Enums"]["permission_level"]
            | null
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
          permissions_analise?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_automacoes?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_chat_ao_vivo?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_configuracoes?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_crm?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_dashboard?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_lancamentos?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_meta_ads?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_ofertas?:
            | Database["public"]["Enums"]["permission_level"]
            | null
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
          permissions_analise?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_automacoes?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_chat_ao_vivo?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_configuracoes?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_crm?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_dashboard?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_lancamentos?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_meta_ads?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_ofertas?:
            | Database["public"]["Enums"]["permission_level"]
            | null
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
      project_member_permissions: {
        Row: {
          analise: Database["public"]["Enums"]["permission_level"]
          automacoes: Database["public"]["Enums"]["permission_level"]
          chat_ao_vivo: Database["public"]["Enums"]["permission_level"]
          configuracoes: Database["public"]["Enums"]["permission_level"]
          created_at: string
          crm: Database["public"]["Enums"]["permission_level"]
          dashboard: Database["public"]["Enums"]["permission_level"]
          id: string
          lancamentos: Database["public"]["Enums"]["permission_level"]
          meta_ads: Database["public"]["Enums"]["permission_level"]
          ofertas: Database["public"]["Enums"]["permission_level"]
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analise?: Database["public"]["Enums"]["permission_level"]
          automacoes?: Database["public"]["Enums"]["permission_level"]
          chat_ao_vivo?: Database["public"]["Enums"]["permission_level"]
          configuracoes?: Database["public"]["Enums"]["permission_level"]
          created_at?: string
          crm?: Database["public"]["Enums"]["permission_level"]
          dashboard?: Database["public"]["Enums"]["permission_level"]
          id?: string
          lancamentos?: Database["public"]["Enums"]["permission_level"]
          meta_ads?: Database["public"]["Enums"]["permission_level"]
          ofertas?: Database["public"]["Enums"]["permission_level"]
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analise?: Database["public"]["Enums"]["permission_level"]
          automacoes?: Database["public"]["Enums"]["permission_level"]
          chat_ao_vivo?: Database["public"]["Enums"]["permission_level"]
          configuracoes?: Database["public"]["Enums"]["permission_level"]
          created_at?: string
          crm?: Database["public"]["Enums"]["permission_level"]
          dashboard?: Database["public"]["Enums"]["permission_level"]
          id?: string
          lancamentos?: Database["public"]["Enums"]["permission_level"]
          meta_ads?: Database["public"]["Enums"]["permission_level"]
          ofertas?: Database["public"]["Enums"]["permission_level"]
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_member_permissions_project_id_fkey"
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
      social_comments: {
        Row: {
          ai_error: string | null
          ai_processed_at: string | null
          ai_processing_status:
            | Database["public"]["Enums"]["ai_processing_status"]
            | null
          ai_summary: string | null
          author_id: string | null
          author_name: string | null
          author_profile_picture: string | null
          author_username: string | null
          classification:
            | Database["public"]["Enums"]["comment_classification"]
            | null
          classification_key: string | null
          comment_id_meta: string
          comment_timestamp: string
          created_at: string
          crm_contact_id: string | null
          id: string
          intent_score: number | null
          is_deleted: boolean | null
          is_hidden: boolean | null
          is_replied: boolean | null
          like_count: number | null
          parent_comment_id: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          project_id: string
          replied_at: string | null
          replied_by: string | null
          reply_count: number | null
          sentiment: Database["public"]["Enums"]["comment_sentiment"] | null
          text: string
          updated_at: string
        }
        Insert: {
          ai_error?: string | null
          ai_processed_at?: string | null
          ai_processing_status?:
            | Database["public"]["Enums"]["ai_processing_status"]
            | null
          ai_summary?: string | null
          author_id?: string | null
          author_name?: string | null
          author_profile_picture?: string | null
          author_username?: string | null
          classification?:
            | Database["public"]["Enums"]["comment_classification"]
            | null
          classification_key?: string | null
          comment_id_meta: string
          comment_timestamp: string
          created_at?: string
          crm_contact_id?: string | null
          id?: string
          intent_score?: number | null
          is_deleted?: boolean | null
          is_hidden?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          project_id: string
          replied_at?: string | null
          replied_by?: string | null
          reply_count?: number | null
          sentiment?: Database["public"]["Enums"]["comment_sentiment"] | null
          text: string
          updated_at?: string
        }
        Update: {
          ai_error?: string | null
          ai_processed_at?: string | null
          ai_processing_status?:
            | Database["public"]["Enums"]["ai_processing_status"]
            | null
          ai_summary?: string | null
          author_id?: string | null
          author_name?: string | null
          author_profile_picture?: string | null
          author_username?: string | null
          classification?:
            | Database["public"]["Enums"]["comment_classification"]
            | null
          classification_key?: string | null
          comment_id_meta?: string
          comment_timestamp?: string
          created_at?: string
          crm_contact_id?: string | null
          id?: string
          intent_score?: number | null
          is_deleted?: boolean | null
          is_hidden?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_id?: string
          project_id?: string
          replied_at?: string | null
          replied_by?: string | null
          reply_count?: number | null
          sentiment?: Database["public"]["Enums"]["comment_sentiment"] | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "social_comments_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_parent_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "social_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_listening_pages: {
        Row: {
          created_at: string
          id: string
          instagram_account_id: string | null
          instagram_username: string | null
          is_active: boolean
          last_synced_at: string | null
          page_access_token: string | null
          page_id: string
          page_name: string
          platform: Database["public"]["Enums"]["social_platform"]
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_account_id?: string | null
          instagram_username?: string | null
          is_active?: boolean
          last_synced_at?: string | null
          page_access_token?: string | null
          page_id: string
          page_name: string
          platform: Database["public"]["Enums"]["social_platform"]
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_account_id?: string | null
          instagram_username?: string | null
          is_active?: boolean
          last_synced_at?: string | null
          page_access_token?: string | null
          page_id?: string
          page_name?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_listening_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_listening_sync_logs: {
        Row: {
          comments_processed: number | null
          comments_synced: number | null
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          errors: Json | null
          id: string
          posts_synced: number | null
          project_id: string
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          comments_processed?: number | null
          comments_synced?: number | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          posts_synced?: number | null
          project_id: string
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          comments_processed?: number | null
          comments_synced?: number | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          posts_synced?: number | null
          project_id?: string
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_listening_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          adset_id: string | null
          adset_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          impressions: number | null
          is_ad: boolean | null
          last_synced_at: string | null
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          message: string | null
          meta_ad_id: string | null
          meta_campaign_id: string | null
          page_id: string | null
          page_name: string | null
          permalink: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id_meta: string
          post_type: Database["public"]["Enums"]["social_post_type"]
          project_id: string
          published_at: string | null
          reach: number | null
          shares_count: number | null
          updated_at: string
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          is_ad?: boolean | null
          last_synced_at?: string | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          meta_ad_id?: string | null
          meta_campaign_id?: string | null
          page_id?: string | null
          page_name?: string | null
          permalink?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id_meta: string
          post_type?: Database["public"]["Enums"]["social_post_type"]
          project_id: string
          published_at?: string | null
          reach?: number | null
          shares_count?: number | null
          updated_at?: string
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          is_ad?: boolean | null
          last_synced_at?: string | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          meta_ad_id?: string | null
          meta_campaign_id?: string | null
          page_id?: string | null
          page_name?: string | null
          permalink?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_id_meta?: string
          post_type?: Database["public"]["Enums"]["social_post_type"]
          project_id?: string
          published_at?: string | null
          reach?: number | null
          shares_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          is_trial: boolean | null
          notes: string | null
          origin: Database["public"]["Enums"]["subscription_origin"]
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
          external_id?: string | null
          id?: string
          is_trial?: boolean | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["subscription_origin"]
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
          external_id?: string | null
          id?: string
          is_trial?: boolean | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["subscription_origin"]
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
      terms_acceptances: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          ip_address: string | null
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          project_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          project_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          project_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      webhook_metrics: {
        Row: {
          error_message: string | null
          id: string
          payload_size: number | null
          processed_at: string
          processing_time_ms: number | null
          project_id: string
          success: boolean
          webhook_type: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          payload_size?: number | null
          processed_at?: string
          processing_time_ms?: number | null
          project_id: string
          success?: boolean
          webhook_type: string
        }
        Update: {
          error_message?: string | null
          id?: string
          payload_size?: number | null
          processed_at?: string
          processing_time_ms?: number | null
          project_id?: string
          success?: boolean
          webhook_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agent_departments: {
        Row: {
          agent_id: string
          created_at: string
          department_id: string
          id: string
          is_primary: boolean
        }
        Insert: {
          agent_id: string
          created_at?: string
          department_id: string
          id?: string
          is_primary?: boolean
        }
        Update: {
          agent_id?: string
          created_at?: string
          department_id?: string
          id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agent_departments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agent_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agents: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          is_supervisor: boolean
          last_activity_at: string | null
          max_concurrent_chats: number
          project_id: string
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string
          user_id: string
          work_hours: Json | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_supervisor?: boolean
          last_activity_at?: string | null
          max_concurrent_chats?: number
          project_id: string
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id: string
          work_hours?: Json | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_supervisor?: boolean
          last_activity_at?: string | null
          max_concurrent_chats?: number
          project_id?: string
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id?: string
          work_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          contact_id: string
          created_at: string
          department_id: string | null
          first_response_at: string | null
          id: string
          last_message_at: string | null
          project_id: string
          queue_position: number | null
          queued_at: string | null
          remote_jid: string
          status: string
          unread_count: number | null
          updated_at: string
          whatsapp_number_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_id: string
          created_at?: string
          department_id?: string | null
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          project_id: string
          queue_position?: number | null
          queued_at?: string | null
          remote_jid: string
          status?: string
          unread_count?: number | null
          updated_at?: string
          whatsapp_number_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string
          created_at?: string
          department_id?: string | null
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          project_id?: string
          queue_position?: number | null
          queued_at?: string | null
          remote_jid?: string
          status?: string
          unread_count?: number | null
          updated_at?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_departments: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_departments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_url: string | null
          created_at: string
          error_count: number | null
          id: string
          instance_key: string | null
          instance_name: string
          last_error: string | null
          last_heartbeat: string | null
          qr_code: string | null
          qr_expires_at: string | null
          status: string
          updated_at: string
          whatsapp_number_id: string
        }
        Insert: {
          api_url?: string | null
          created_at?: string
          error_count?: number | null
          id?: string
          instance_key?: string | null
          instance_name: string
          last_error?: string | null
          last_heartbeat?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_number_id: string
        }
        Update: {
          api_url?: string | null
          created_at?: string
          error_count?: number | null
          id?: string
          instance_key?: string | null
          instance_name?: string
          last_error?: string | null
          last_heartbeat?: string | null
          qr_code?: string | null
          qr_expires_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          content_type: string
          conversation_id: string
          created_at: string
          direction: string
          error_message: string | null
          external_id: string | null
          id: string
          media_mime_type: string | null
          media_url: string | null
          metadata: Json | null
          sent_by: string | null
          status: string
          updated_at: string
          whatsapp_number_id: string | null
        }
        Insert: {
          content?: string | null
          content_type?: string
          conversation_id: string
          created_at?: string
          direction: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          sent_by?: string | null
          status?: string
          updated_at?: string
          whatsapp_number_id?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          sent_by?: string | null
          status?: string
          updated_at?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_numbers: {
        Row: {
          created_at: string
          id: string
          label: string
          phone_number: string
          priority: number
          project_id: string
          provider: string
          status: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          phone_number: string
          priority?: number
          project_id: string
          provider?: string
          status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          phone_number?: string
          priority?: number
          project_id?: string
          provider?: string
          status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_numbers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contact_social_insights: {
        Row: {
          avg_intent_score: number | null
          commercial_interest_count: number | null
          contact_id: string | null
          contact_name: string | null
          email: string | null
          instagram: string | null
          last_comment_at: string | null
          negative_comments: number | null
          neutral_comments: number | null
          positive_comments: number | null
          project_id: string | null
          questions_count: number | null
          total_comments: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_comment_metrics_daily: {
        Args: { p_date: string; p_project_id: string }
        Returns: undefined
      }
      can_invite_to_project: { Args: { _project_id: string }; Returns: boolean }
      can_use_feature: {
        Args: { _feature_key: string; _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_create_project: { Args: { _user_id: string }; Returns: boolean }
      cleanup_old_webhook_metrics: { Args: never; Returns: undefined }
      count_project_members: { Args: { _project_id: string }; Returns: number }
      count_user_projects: { Args: { _user_id: string }; Returns: number }
      create_default_pipeline_stages: {
        Args: { _project_id: string }
        Returns: undefined
      }
      create_default_recovery_stages: {
        Args: { _project_id: string }
        Returns: undefined
      }
      decrypt_sensitive: { Args: { p_encrypted_data: string }; Returns: string }
      encrypt_sensitive: { Args: { p_data: string }; Returns: string }
      get_contact_document: {
        Args: { p_contact_id: string; p_project_id: string }
        Returns: string
      }
      get_encryption_key: { Args: { p_key_name?: string }; Returns: string }
      get_next_available_agent: {
        Args: { p_department_id?: string; p_project_id: string }
        Returns: string
      }
      get_project_credentials_secure: {
        Args: { p_project_id: string }
        Returns: {
          basic_auth: string
          client_id: string
          client_secret: string
          created_at: string
          id: string
          is_configured: boolean
          is_validated: boolean
          project_id: string
          provider: string
          updated_at: string
          validated_at: string
        }[]
      }
      get_queue_position: {
        Args: { p_department_id?: string; p_project_id: string }
        Returns: number
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_max_projects: { Args: { _user_id: string }; Returns: number }
      get_user_project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["project_role"]
      }
      get_webhook_stats: {
        Args: { p_hours?: number; p_project_id: string }
        Returns: {
          avg_processing_time_ms: number
          error_count: number
          requests_per_minute: number
          success_count: number
          total_count: number
          webhook_type: string
        }[]
      }
      has_accepted_terms: {
        Args: { _user_id: string; _version?: string }
        Returns: boolean
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_area_permission: {
        Args: {
          _area: string
          _min_level?: Database["public"]["Enums"]["permission_level"]
          _project_id: string
          _user_id: string
        }
        Returns: boolean
      }
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
      log_user_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_name?: string
          p_entity_type: string
          p_project_id?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      migrate_auto_recoveries: {
        Args: never
        Returns: {
          contacts_recovered: number
        }[]
      }
      migrate_contact_product_data: {
        Args: never
        Returns: {
          contacts_updated: number
        }[]
      }
      migrate_generic_tags: {
        Args: never
        Returns: {
          contacts_updated: number
        }[]
      }
      migrate_hotmart_to_crm: {
        Args: never
        Returns: {
          contacts_created: number
          transactions_created: number
        }[]
      }
      migrate_hotmart_to_interactions: {
        Args: never
        Returns: {
          interactions_created: number
        }[]
      }
      migrate_hotmart_to_interactions_batch: {
        Args: { p_batch_size?: number; p_project_id?: string }
        Returns: {
          interactions_created: number
        }[]
      }
      migrate_tags_to_contextual: {
        Args: never
        Returns: {
          contacts_updated: number
        }[]
      }
      normalize_phone_number: { Args: { phone: string }; Returns: string }
      populate_contact_utms_from_transactions: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
      update_last_login: { Args: never; Returns: undefined }
    }
    Enums: {
      agent_status: "online" | "away" | "offline" | "busy"
      ai_processing_status: "pending" | "processing" | "completed" | "failed"
      app_role: "admin" | "user" | "super_admin"
      comment_classification:
        | "question"
        | "commercial_interest"
        | "complaint"
        | "praise"
        | "negative_feedback"
        | "spam"
        | "other"
      comment_sentiment: "positive" | "neutral" | "negative"
      invite_status: "pending" | "accepted" | "rejected" | "expired"
      override_target_type: "user" | "project"
      permission_level: "none" | "view" | "edit" | "admin"
      plan_type: "trial" | "monthly" | "yearly" | "lifetime"
      project_role: "owner" | "manager" | "operator"
      social_platform: "instagram" | "facebook"
      social_post_type: "organic" | "ad"
      subscription_origin: "hotmart" | "manual" | "stripe" | "other"
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
      agent_status: ["online", "away", "offline", "busy"],
      ai_processing_status: ["pending", "processing", "completed", "failed"],
      app_role: ["admin", "user", "super_admin"],
      comment_classification: [
        "question",
        "commercial_interest",
        "complaint",
        "praise",
        "negative_feedback",
        "spam",
        "other",
      ],
      comment_sentiment: ["positive", "neutral", "negative"],
      invite_status: ["pending", "accepted", "rejected", "expired"],
      override_target_type: ["user", "project"],
      permission_level: ["none", "view", "edit", "admin"],
      plan_type: ["trial", "monthly", "yearly", "lifetime"],
      project_role: ["owner", "manager", "operator"],
      social_platform: ["instagram", "facebook"],
      social_post_type: ["organic", "ad"],
      subscription_origin: ["hotmart", "manual", "stripe", "other"],
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
