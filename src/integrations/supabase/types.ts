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
          is_enabled: boolean | null
          setting_description: string | null
          setting_key: string
          setting_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          setting_description?: string | null
          setting_key: string
          setting_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          setting_description?: string | null
          setting_key?: string
          setting_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_decisions_log: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          confidence: number | null
          contact_id: string | null
          created_at: string
          decision_data: Json | null
          decision_type: string
          executed_at: string | null
          explanation: Json | null
          id: string
          outcome: string | null
          outcome_data: Json | null
          prediction_id: string | null
          project_id: string
          rejected_reason: string | null
          reward_score: number | null
          risk_score: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          decision_data?: Json | null
          decision_type: string
          executed_at?: string | null
          explanation?: Json | null
          id?: string
          outcome?: string | null
          outcome_data?: Json | null
          prediction_id?: string | null
          project_id: string
          rejected_reason?: string | null
          reward_score?: number | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          decision_data?: Json | null
          decision_type?: string
          executed_at?: string | null
          explanation?: Json | null
          id?: string
          outcome?: string | null
          outcome_data?: Json | null
          prediction_id?: string | null
          project_id?: string
          rejected_reason?: string | null
          reward_score?: number | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_decisions_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "agent_decisions_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "agent_decisions_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "agent_decisions_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "agent_decisions_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "agent_decisions_log_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "contact_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          allowed_actions: Json | null
          boundaries: Json | null
          confidence_threshold: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_actions_per_day: number | null
          name: string
          objective: string
          project_id: string
          require_human_approval: boolean | null
          trigger_on: Json | null
          updated_at: string
        }
        Insert: {
          allowed_actions?: Json | null
          boundaries?: Json | null
          confidence_threshold?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_actions_per_day?: number | null
          name: string
          objective: string
          project_id: string
          require_human_approval?: boolean | null
          trigger_on?: Json | null
          updated_at?: string
        }
        Update: {
          allowed_actions?: Json | null
          boundaries?: Json | null
          confidence_threshold?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_actions_per_day?: number | null
          name?: string
          objective?: string
          project_id?: string
          require_human_approval?: boolean | null
          trigger_on?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          praise_keywords: string[] | null
          products_services: string | null
          project_id: string
          spam_keywords: string[] | null
          ignore_keywords: string[] | null
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
          praise_keywords?: string[] | null
          products_services?: string | null
          project_id: string
          spam_keywords?: string[] | null
          ignore_keywords?: string[] | null
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
          praise_keywords?: string[] | null
          products_services?: string | null
          project_id?: string
          spam_keywords?: string[] | null
          ignore_keywords?: string[] | null
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
      ai_project_quotas: {
        Row: {
          created_at: string
          current_daily_usage: number | null
          current_monthly_usage: number | null
          daily_limit: number | null
          id: string
          is_unlimited: boolean | null
          last_daily_reset: string | null
          last_monthly_reset: string | null
          lovable_credits_limit: number | null
          lovable_credits_used: number | null
          monthly_limit: number | null
          openai_credits_used: number | null
          project_id: string
          provider_preference: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_daily_usage?: number | null
          current_monthly_usage?: number | null
          daily_limit?: number | null
          id?: string
          is_unlimited?: boolean | null
          last_daily_reset?: string | null
          last_monthly_reset?: string | null
          lovable_credits_limit?: number | null
          lovable_credits_used?: number | null
          monthly_limit?: number | null
          openai_credits_used?: number | null
          project_id: string
          provider_preference?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_daily_usage?: number | null
          current_monthly_usage?: number | null
          daily_limit?: number | null
          id?: string
          is_unlimited?: boolean | null
          last_daily_reset?: string | null
          last_monthly_reset?: string | null
          lovable_credits_limit?: number | null
          lovable_credits_used?: number | null
          monthly_limit?: number | null
          openai_credits_used?: number | null
          project_id?: string
          provider_preference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_project_quotas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_tracking: {
        Row: {
          action: string
          cost_estimate: number | null
          created_at: string
          error_message: string | null
          feature: string
          id: string
          input_tokens: number | null
          items_processed: number | null
          metadata: Json | null
          model: string | null
          output_tokens: number | null
          project_id: string
          provider: string
          success: boolean | null
        }
        Insert: {
          action: string
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          feature: string
          id?: string
          input_tokens?: number | null
          items_processed?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          project_id: string
          provider: string
          success?: boolean | null
        }
        Update: {
          action?: string
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          feature?: string
          id?: string
          input_tokens?: number | null
          items_processed?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          project_id?: string
          provider?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tracking_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
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
          execution_log: Json | null
          flow_id: string
          id: string
          next_execution_at: string | null
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          conversation_id?: string | null
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          execution_log?: Json | null
          flow_id: string
          id?: string
          next_execution_at?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          conversation_id?: string | null
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          execution_log?: Json | null
          flow_id?: string
          id?: string
          next_execution_at?: string | null
          started_at?: string | null
          status?: string | null
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "automation_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
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
            foreignKeyName: "automation_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "automation_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
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
          config: Json | null
          created_at: string
          flow_id: string
          id: string
          node_type: string
          position_x: number | null
          position_y: number | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          flow_id: string
          id?: string
          node_type: string
          position_x?: number | null
          position_y?: number | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          flow_id?: string
          id?: string
          node_type?: string
          position_x?: number | null
          position_y?: number | null
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
          is_active: boolean | null
          name: string
          project_id: string
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string
          viewport: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
          viewport?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
          viewport?: Json | null
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
          content_type: string | null
          created_at: string
          created_by: string | null
          id: string
          media_url: string | null
          name: string
          project_id: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_url?: string | null
          name: string
          project_id: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_url?: string | null
          name?: string
          project_id?: string
          updated_at?: string
          variables?: string[] | null
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
      contact_identity_events: {
        Row: {
          confidence_score: number | null
          contact_id: string
          field_name: string
          field_value: string
          id: string
          is_declared: boolean | null
          metadata: Json | null
          previous_value: string | null
          project_id: string
          recorded_at: string | null
          source_id: string | null
          source_name: string | null
          source_type: string
        }
        Insert: {
          confidence_score?: number | null
          contact_id: string
          field_name: string
          field_value: string
          id?: string
          is_declared?: boolean | null
          metadata?: Json | null
          previous_value?: string | null
          project_id: string
          recorded_at?: string | null
          source_id?: string | null
          source_name?: string | null
          source_type: string
        }
        Update: {
          confidence_score?: number | null
          contact_id?: string
          field_name?: string
          field_value?: string
          id?: string
          is_declared?: boolean | null
          metadata?: Json | null
          previous_value?: string | null
          project_id?: string
          recorded_at?: string | null
          source_id?: string | null
          source_name?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_identity_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_identity_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_identity_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_identity_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_identity_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_identity_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_identity_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_memory: {
        Row: {
          confidence: number | null
          contact_id: string
          content: Json | null
          contradicted_by: string | null
          created_at: string
          id: string
          is_contradicted: boolean | null
          is_locked: boolean | null
          last_reinforced_at: string | null
          memory_type: string
          project_id: string
          reinforcement_count: number | null
          source: string
          source_id: string | null
          source_name: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          contact_id: string
          content?: Json | null
          contradicted_by?: string | null
          created_at?: string
          id?: string
          is_contradicted?: boolean | null
          is_locked?: boolean | null
          last_reinforced_at?: string | null
          memory_type: string
          project_id: string
          reinforcement_count?: number | null
          source: string
          source_id?: string | null
          source_name?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          contact_id?: string
          content?: Json | null
          contradicted_by?: string | null
          created_at?: string
          id?: string
          is_contradicted?: boolean | null
          is_locked?: boolean | null
          last_reinforced_at?: string | null
          memory_type?: string
          project_id?: string
          reinforcement_count?: number | null
          source?: string
          source_id?: string | null
          source_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_memory_contradicted_by_fkey"
            columns: ["contradicted_by"]
            isOneToOne: false
            referencedRelation: "contact_memory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_predictions: {
        Row: {
          confidence: number | null
          contact_id: string
          created_at: string
          expires_at: string | null
          explanation: Json | null
          id: string
          is_active: boolean | null
          prediction_type: string
          project_id: string
          recommended_actions: Json | null
          risk_level: string | null
          updated_at: string
          urgency_score: number | null
        }
        Insert: {
          confidence?: number | null
          contact_id: string
          created_at?: string
          expires_at?: string | null
          explanation?: Json | null
          id?: string
          is_active?: boolean | null
          prediction_type: string
          project_id: string
          recommended_actions?: Json | null
          risk_level?: string | null
          updated_at?: string
          urgency_score?: number | null
        }
        Update: {
          confidence?: number | null
          contact_id?: string
          created_at?: string
          expires_at?: string | null
          explanation?: Json | null
          id?: string
          is_active?: boolean | null
          prediction_type?: string
          project_id?: string
          recommended_actions?: Json | null
          risk_level?: string | null
          updated_at?: string
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_predictions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_predictions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_predictions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_predictions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_predictions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_predictions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_profile_history: {
        Row: {
          confidence_delta: number | null
          contact_profile_id: string
          created_at: string
          delta_intent_vector: Json | null
          delta_trait_vector: Json | null
          entropy_delta: number | null
          id: string
          metadata: Json | null
          profile_snapshot: Json | null
          project_id: string
          source: string
          source_id: string | null
          source_name: string | null
        }
        Insert: {
          confidence_delta?: number | null
          contact_profile_id: string
          created_at?: string
          delta_intent_vector?: Json | null
          delta_trait_vector?: Json | null
          entropy_delta?: number | null
          id?: string
          metadata?: Json | null
          profile_snapshot?: Json | null
          project_id: string
          source: string
          source_id?: string | null
          source_name?: string | null
        }
        Update: {
          confidence_delta?: number | null
          contact_profile_id?: string
          created_at?: string
          delta_intent_vector?: Json | null
          delta_trait_vector?: Json | null
          entropy_delta?: number | null
          id?: string
          metadata?: Json | null
          profile_snapshot?: Json | null
          project_id?: string
          source?: string
          source_id?: string | null
          source_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_profile_history_contact_profile_id_fkey"
            columns: ["contact_profile_id"]
            isOneToOne: false
            referencedRelation: "contact_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_profile_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_profiles: {
        Row: {
          confidence_score: number | null
          contact_id: string
          created_at: string
          entropy_score: number | null
          id: string
          intent_vector: Json | null
          last_updated_at: string | null
          project_id: string
          signal_sources: Json | null
          total_signals: number | null
          trait_vector: Json | null
          volatility_score: number | null
        }
        Insert: {
          confidence_score?: number | null
          contact_id: string
          created_at?: string
          entropy_score?: number | null
          id?: string
          intent_vector?: Json | null
          last_updated_at?: string | null
          project_id: string
          signal_sources?: Json | null
          total_signals?: number | null
          trait_vector?: Json | null
          volatility_score?: number | null
        }
        Update: {
          confidence_score?: number | null
          contact_id?: string
          created_at?: string
          entropy_score?: number | null
          id?: string
          intent_vector?: Json | null
          last_updated_at?: string | null
          project_id?: string
          signal_sources?: Json | null
          total_signals?: number | null
          trait_vector?: Json | null
          volatility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_profiles_project_id_fkey"
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
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
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
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
          activity_type: string | null
          assigned_to: string | null
          completed_at: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          status?: string | null
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_activities_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
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
            foreignKeyName: "crm_activities_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_activities_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
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
          activity_type: string | null
          cadence_id: string
          created_at: string
          delay_days: number | null
          delay_hours: number | null
          description: string | null
          id: string
          priority: string | null
          step_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: string | null
          cadence_id: string
          created_at?: string
          delay_days?: number | null
          delay_hours?: number | null
          description?: string | null
          id?: string
          priority?: string | null
          step_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string | null
          cadence_id?: string
          created_at?: string
          delay_days?: number | null
          delay_hours?: number | null
          description?: string | null
          id?: string
          priority?: string | null
          step_order?: number | null
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
          is_active: boolean | null
          name: string
          project_id: string
          trigger_on: string | null
          trigger_stage_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          trigger_on?: string | null
          trigger_stage_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          trigger_on?: string | null
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
          current_step: number | null
          id: string
          next_activity_at: string | null
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cadence_id: string
          completed_at?: string | null
          contact_id: string
          created_at?: string
          current_step?: number | null
          id?: string
          next_activity_at?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cadence_id?: string
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          current_step?: number | null
          id?: string
          next_activity_at?: string | null
          started_at?: string | null
          status?: string | null
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_contact_cadences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_contact_cadences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_cadences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_contact_cadences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
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
          interacted_at: string | null
          interaction_type: string | null
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
          interacted_at?: string | null
          interaction_type?: string | null
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
          interacted_at?: string | null
          interaction_type?: string | null
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
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
            foreignKeyName: "crm_contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
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
          assigned_to: string | null
          avatar_url: string | null
          cep: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          document: string | null
          document_encrypted: string | null
          email: string | null
          first_meta_ad_id: string | null
          first_meta_adset_id: string | null
          first_meta_campaign_id: string | null
          first_name: string | null
          first_page_name: string | null
          first_purchase_at: string | null
          first_seen_at: string | null
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
          is_team_member: boolean | null
          last_activity_at: string | null
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
          score: number | null
          source: string | null
          state: string | null
          status: string | null
          subscription_status: string | null
          tags: string[] | null
          total_purchases: number | null
          total_revenue: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          document?: string | null
          document_encrypted?: string | null
          email?: string | null
          first_meta_ad_id?: string | null
          first_meta_adset_id?: string | null
          first_meta_campaign_id?: string | null
          first_name?: string | null
          first_page_name?: string | null
          first_purchase_at?: string | null
          first_seen_at?: string | null
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
          is_team_member?: boolean | null
          last_activity_at?: string | null
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
          score?: number | null
          source?: string | null
          state?: string | null
          status?: string | null
          subscription_status?: string | null
          tags?: string[] | null
          total_purchases?: number | null
          total_revenue?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          document?: string | null
          document_encrypted?: string | null
          email?: string | null
          first_meta_ad_id?: string | null
          first_meta_adset_id?: string | null
          first_meta_campaign_id?: string | null
          first_name?: string | null
          first_page_name?: string | null
          first_purchase_at?: string | null
          first_seen_at?: string | null
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
          is_team_member?: boolean | null
          last_activity_at?: string | null
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
          score?: number | null
          source?: string | null
          state?: string | null
          status?: string | null
          subscription_status?: string | null
          tags?: string[] | null
          total_purchases?: number | null
          total_revenue?: number | null
          updated_at?: string
          user_id?: string | null
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
          activity_type: string
          channel: string
          contact_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          project_id: string
          result: string | null
          stage_id: string | null
        }
        Insert: {
          activity_type?: string
          channel?: string
          contact_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          project_id: string
          result?: string | null
          stage_id?: string | null
        }
        Update: {
          activity_type?: string
          channel?: string
          contact_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          project_id?: string
          result?: string | null
          stage_id?: string | null
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_recovery_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
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
            foreignKeyName: "crm_recovery_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_recovery_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
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
          product_name: string | null
          product_price: number | null
          project_id: string
          status: string
          total_price: number | null
          total_price_brl: number | null
          transaction_date: string | null
          updated_at: string
          utm_adset: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_creative: string | null
          utm_medium: string | null
          utm_placement: string | null
          utm_source: string | null
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
          product_name?: string | null
          product_price?: number | null
          project_id: string
          status?: string
          total_price?: number | null
          total_price_brl?: number | null
          transaction_date?: string | null
          updated_at?: string
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_creative?: string | null
          utm_medium?: string | null
          utm_placement?: string | null
          utm_source?: string | null
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
          product_name?: string | null
          product_price?: number | null
          project_id?: string
          status?: string
          total_price?: number | null
          total_price_brl?: number | null
          transaction_date?: string | null
          updated_at?: string
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_creative?: string | null
          utm_medium?: string | null
          utm_placement?: string | null
          utm_source?: string | null
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
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
            foreignKeyName: "crm_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
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
          created_at: string
          id: string
          is_active: boolean | null
          project_id: string
          provider: string
          updated_at: string
          webhook_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          project_id: string
          provider: string
          updated_at?: string
          webhook_key: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          project_id?: string
          provider?: string
          updated_at?: string
          webhook_key?: string
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
      csv_import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          project_id: string
          reverted_at: string | null
          status: string
          total_complemented: number
          total_created: number
          total_errors: number
          total_revenue_brl: number
          total_skipped: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          project_id: string
          reverted_at?: string | null
          status?: string
          total_complemented?: number
          total_created?: number
          total_errors?: number
          total_revenue_brl?: number
          total_skipped?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          project_id?: string
          reverted_at?: string | null
          status?: string
          total_complemented?: number
          total_created?: number
          total_errors?: number
          total_revenue_brl?: number
          total_skipped?: number
        }
        Relationships: [
          {
            foreignKeyName: "csv_import_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_days: {
        Row: {
          closed_at: string | null
          created_at: string
          date: string
          id: string
          is_closed: boolean
          project_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          date: string
          id?: string
          is_closed?: boolean
          project_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          is_closed?: boolean
          project_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "economic_days_project_id_fkey"
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
        }
        Insert: {
          created_at?: string
          id?: string
          key_name: string
          key_value: string
        }
        Update: {
          created_at?: string
          id?: string
          key_name?: string
          key_value?: string
        }
        Relationships: []
      }
      event_dispatch_rules: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_active: boolean | null
          project_id: string
          target_config: Json | null
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean | null
          project_id: string
          target_config?: Json | null
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean | null
          project_id?: string
          target_config?: Json | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_dispatch_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_templates: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          preview_image_url: string | null
          project_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          preview_image_url?: string | null
          project_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          preview_image_url?: string | null
          project_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_themes: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_themes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          target_type: Database["public"]["Enums"]["feature_target_type"]
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
          target_type: Database["public"]["Enums"]["feature_target_type"]
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
          target_type?: Database["public"]["Enums"]["feature_target_type"]
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
      finance_ledger: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          amount: number | null
          attribution: Json
          created_at: string
          currency: string | null
          event_type: string | null
          hotmart_sale_id: string | null
          id: string
          occurred_at: string | null
          project_id: string | null
          provider: string | null
          raw_payload: Json | null
          recorded_at: string | null
          source_api: string | null
          transaction_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          amount?: number | null
          attribution?: Json
          created_at?: string
          currency?: string | null
          event_type?: string | null
          hotmart_sale_id?: string | null
          id?: string
          occurred_at?: string | null
          project_id?: string | null
          provider?: string | null
          raw_payload?: Json | null
          recorded_at?: string | null
          source_api?: string | null
          transaction_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          amount?: number | null
          attribution?: Json
          created_at?: string
          currency?: string | null
          event_type?: string | null
          hotmart_sale_id?: string | null
          id?: string
          occurred_at?: string | null
          project_id?: string | null
          provider?: string | null
          raw_payload?: Json | null
          recorded_at?: string | null
          source_api?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          project_id: string | null
          provider: string | null
          records_processed: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          project_id?: string | null
          provider?: string | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          project_id?: string | null
          provider?: string | null
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_sync_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_changes: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          created_at: string
          description: string | null
          funnel_id: string
          id: string
          metadata: Json | null
          project_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          description?: string | null
          funnel_id: string
          id?: string
          metadata?: Json | null
          project_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          description?: string | null
          funnel_id?: string
          id?: string
          metadata?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_changes_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "funnel_changes_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_changes_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "funnel_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_experiments: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          funnel_id: string
          hypothesis: string | null
          id: string
          name: string
          project_id: string
          results: Json | null
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          funnel_id: string
          hypothesis?: string | null
          id?: string
          name: string
          project_id: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          funnel_id?: string
          hypothesis?: string | null
          id?: string
          name?: string
          project_id?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_experiments_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "funnel_experiments_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_experiments_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "funnel_experiments_project_id_fkey"
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
          meta_account_id: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          meta_account_id?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          meta_account_id?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_meta_accounts_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "funnel_meta_accounts_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_meta_accounts_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
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
      funnel_offers: {
        Row: {
          created_at: string | null
          funnel_id: string
          id: string
          offer_code: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          funnel_id: string
          id?: string
          offer_code: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          funnel_id?: string
          id?: string
          offer_code?: string
          project_id?: string
        }
        Relationships: []
      }
      funnel_score_history: {
        Row: {
          calculated_at: string
          components: Json | null
          created_at: string
          funnel_id: string
          id: string
          project_id: string
          score: number
        }
        Insert: {
          calculated_at?: string
          components?: Json | null
          created_at?: string
          funnel_id: string
          id?: string
          project_id: string
          score?: number
        }
        Update: {
          calculated_at?: string
          components?: Json | null
          created_at?: string
          funnel_id?: string
          id?: string
          project_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_score_history_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "funnel_score_history_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_score_history_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
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
      funnel_thresholds: {
        Row: {
          created_at: string
          critical_value: number | null
          direction: string | null
          id: string
          metric_key: string
          project_id: string
          updated_at: string
          warning_value: number | null
        }
        Insert: {
          created_at?: string
          critical_value?: number | null
          direction?: string | null
          id?: string
          metric_key: string
          project_id: string
          updated_at?: string
          warning_value?: number | null
        }
        Update: {
          created_at?: string
          critical_value?: number | null
          direction?: string | null
          id?: string
          metric_key?: string
          project_id?: string
          updated_at?: string
          warning_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_thresholds_project_id_fkey"
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
          funnel_model: string | null
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
          funnel_model?: string | null
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
          funnel_model?: string | null
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
      hotmart_backfill_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          project_id: string
          records_processed: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          records_processed?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotmart_backfill_runs_project_id_fkey"
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
          currency: string | null
          id: string
          is_active: boolean | null
          offer_code: string | null
          plan_id: string | null
          plan_name: string | null
          price: number | null
          product_id: string
          project_id: string | null
          recurrence: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          offer_code?: string | null
          plan_id?: string | null
          plan_name?: string | null
          price?: number | null
          product_id: string
          project_id?: string | null
          recurrence?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          offer_code?: string | null
          plan_id?: string | null
          plan_name?: string | null
          price?: number | null
          product_id?: string
          project_id?: string | null
          recurrence?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotmart_product_plans_project_id_fkey"
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
          affiliate_cost: number | null
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
          coproducer_cost: number | null
          coupon: string | null
          created_at: string
          exchange_rate_used: number | null
          gross_amount: number | null
          id: string
          installment_number: number | null
          is_upgrade: boolean | null
          last_synced_at: string | null
          meta_ad_id_extracted: string | null
          meta_adset_id_extracted: string | null
          meta_campaign_id_extracted: string | null
          net_amount: number | null
          net_revenue: number | null
          offer_code: string | null
          offer_currency: string | null
          offer_price: number | null
          payment_method: string | null
          payment_type: string | null
          platform_fee: number | null
          product_code: string | null
          product_name: string | null
          product_price: number | null
          project_id: string | null
          raw_checkout_origin: string | null
          recurrence: string | null
          sale_category: string | null
          sale_date: string | null
          sale_origin: string | null
          sold_as: string | null
          status: string | null
          subscriber_code: string | null
          total_price: number | null
          total_price_brl: number | null
          transaction_id: string | null
          updated_at: string
          utm_adset_name: string | null
          utm_campaign_id: string | null
          utm_content: string | null
          utm_creative: string | null
          utm_medium: string | null
          utm_placement: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_cost?: number | null
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
          coproducer_cost?: number | null
          coupon?: string | null
          created_at?: string
          exchange_rate_used?: number | null
          gross_amount?: number | null
          id?: string
          installment_number?: number | null
          is_upgrade?: boolean | null
          last_synced_at?: string | null
          meta_ad_id_extracted?: string | null
          meta_adset_id_extracted?: string | null
          meta_campaign_id_extracted?: string | null
          net_amount?: number | null
          net_revenue?: number | null
          offer_code?: string | null
          offer_currency?: string | null
          offer_price?: number | null
          payment_method?: string | null
          payment_type?: string | null
          platform_fee?: number | null
          product_code?: string | null
          product_name?: string | null
          product_price?: number | null
          project_id?: string | null
          raw_checkout_origin?: string | null
          recurrence?: string | null
          sale_category?: string | null
          sale_date?: string | null
          sale_origin?: string | null
          sold_as?: string | null
          status?: string | null
          subscriber_code?: string | null
          total_price?: number | null
          total_price_brl?: number | null
          transaction_id?: string | null
          updated_at?: string
          utm_adset_name?: string | null
          utm_campaign_id?: string | null
          utm_content?: string | null
          utm_creative?: string | null
          utm_medium?: string | null
          utm_placement?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_cost?: number | null
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
          coproducer_cost?: number | null
          coupon?: string | null
          created_at?: string
          exchange_rate_used?: number | null
          gross_amount?: number | null
          id?: string
          installment_number?: number | null
          is_upgrade?: boolean | null
          last_synced_at?: string | null
          meta_ad_id_extracted?: string | null
          meta_adset_id_extracted?: string | null
          meta_campaign_id_extracted?: string | null
          net_amount?: number | null
          net_revenue?: number | null
          offer_code?: string | null
          offer_currency?: string | null
          offer_price?: number | null
          payment_method?: string | null
          payment_type?: string | null
          platform_fee?: number | null
          product_code?: string | null
          product_name?: string | null
          product_price?: number | null
          project_id?: string | null
          raw_checkout_origin?: string | null
          recurrence?: string | null
          sale_category?: string | null
          sale_date?: string | null
          sale_origin?: string | null
          sold_as?: string | null
          status?: string | null
          subscriber_code?: string | null
          total_price?: number | null
          total_price_brl?: number | null
          transaction_id?: string | null
          updated_at?: string
          utm_adset_name?: string | null
          utm_campaign_id?: string | null
          utm_content?: string | null
          utm_creative?: string | null
          utm_medium?: string | null
          utm_placement?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
      integration_connections: {
        Row: {
          auth_type: Database["public"]["Enums"]["integration_auth_type"]
          config_data: Json
          created_at: string
          created_by: string | null
          credentials_encrypted: Json | null
          display_name: string | null
          external_account_id: string | null
          external_account_name: string | null
          id: string
          is_primary: boolean
          last_error_at: string | null
          last_error_message: string | null
          last_sync_at: string | null
          project_id: string
          provider_slug: string
          status: Database["public"]["Enums"]["connection_status"]
          updated_at: string
        }
        Insert: {
          auth_type: Database["public"]["Enums"]["integration_auth_type"]
          config_data?: Json
          created_at?: string
          created_by?: string | null
          credentials_encrypted?: Json | null
          display_name?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          is_primary?: boolean
          last_error_at?: string | null
          last_error_message?: string | null
          last_sync_at?: string | null
          project_id: string
          provider_slug: string
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Update: {
          auth_type?: Database["public"]["Enums"]["integration_auth_type"]
          config_data?: Json
          created_at?: string
          created_by?: string | null
          credentials_encrypted?: Json | null
          display_name?: string | null
          external_account_id?: string | null
          external_account_name?: string | null
          id?: string
          is_primary?: boolean
          last_error_at?: string | null
          last_error_message?: string | null
          last_sync_at?: string | null
          project_id?: string
          provider_slug?: string
          status?: Database["public"]["Enums"]["connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_provider_slug_fkey"
            columns: ["provider_slug"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["slug"]
          },
        ]
      }
      integration_oauth_tokens: {
        Row: {
          access_token_encrypted: string
          connection_id: string
          created_at: string
          expires_at: string | null
          external_user_id: string | null
          external_user_name: string | null
          id: string
          is_current: boolean
          issued_at: string | null
          project_id: string
          refresh_expires_at: string | null
          refresh_token_encrypted: string | null
          revoked_at: string | null
          scopes: string[] | null
          token_type: string
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          connection_id: string
          created_at?: string
          expires_at?: string | null
          external_user_id?: string | null
          external_user_name?: string | null
          id?: string
          is_current?: boolean
          issued_at?: string | null
          project_id: string
          refresh_expires_at?: string | null
          refresh_token_encrypted?: string | null
          revoked_at?: string | null
          scopes?: string[] | null
          token_type?: string
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          connection_id?: string
          created_at?: string
          expires_at?: string | null
          external_user_id?: string | null
          external_user_name?: string | null
          id?: string
          is_current?: boolean
          issued_at?: string | null
          project_id?: string
          refresh_expires_at?: string | null
          refresh_token_encrypted?: string | null
          revoked_at?: string | null
          scopes?: string[] | null
          token_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_oauth_tokens_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_oauth_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          auth_types: Database["public"]["Enums"]["integration_auth_type"][]
          capabilities: Json
          category: Database["public"]["Enums"]["integration_category"]
          config_schema: Json | null
          created_at: string
          description: string | null
          display_order: number
          docs_url: string | null
          icon_url: string | null
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          auth_types?: Database["public"]["Enums"]["integration_auth_type"][]
          capabilities?: Json
          category: Database["public"]["Enums"]["integration_category"]
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          docs_url?: string | null
          icon_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          auth_types?: Database["public"]["Enums"]["integration_auth_type"][]
          capabilities?: Json
          category?: Database["public"]["Enums"]["integration_category"]
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          docs_url?: string | null
          icon_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          metadata: Json | null
          project_id: string
          records_created: number
          records_failed: number
          records_processed: number
          records_skipped: number
          records_updated: number
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
          sync_type: Database["public"]["Enums"]["sync_type"]
          triggered_by: Database["public"]["Enums"]["sync_trigger"]
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          records_created?: number
          records_failed?: number
          records_processed?: number
          records_skipped?: number
          records_updated?: number
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          sync_type: Database["public"]["Enums"]["sync_type"]
          triggered_by?: Database["public"]["Enums"]["sync_trigger"]
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          records_created?: number
          records_failed?: number
          records_processed?: number
          records_skipped?: number
          records_updated?: number
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          sync_type?: Database["public"]["Enums"]["sync_type"]
          triggered_by?: Database["public"]["Enums"]["sync_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_phases: {
        Row: {
          config: Json | null
          created_at: string
          end_date: string | null
          funnel_id: string
          id: string
          name: string
          phase_type: string
          project_id: string
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          end_date?: string | null
          funnel_id: string
          id?: string
          name: string
          phase_type: string
          project_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          end_date?: string | null
          funnel_id?: string
          id?: string
          name?: string
          phase_type?: string
          project_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_phases_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "launch_phases_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_phases_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
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
          currency: string | null
          funnel_id: string
          id: string
          position_type: string | null
          price: number | null
          product_code: string | null
          product_name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          funnel_id: string
          id?: string
          position_type?: string | null
          price?: number | null
          product_code?: string | null
          product_name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          funnel_id?: string
          id?: string
          position_type?: string | null
          price?: number | null
          product_code?: string | null
          product_name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_products_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "launch_products_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_products_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
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
      ledger_events: {
        Row: {
          actor: string | null
          actor_name: string | null
          amount: number
          amount_accounting: number | null
          amount_brl: number | null
          confidence_level: string | null
          conversion_rate: number | null
          created_at: string
          currency: string | null
          currency_accounting: string | null
          description: string | null
          event_date: string | null
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          order_id: string
          project_id: string
          provider: string | null
          provider_event_id: string | null
          raw_payload: Json | null
          reference_period: string | null
          source_origin: string | null
          source_type: string | null
        }
        Insert: {
          actor?: string | null
          actor_name?: string | null
          amount?: number
          amount_accounting?: number | null
          amount_brl?: number | null
          confidence_level?: string | null
          conversion_rate?: number | null
          created_at?: string
          currency?: string | null
          currency_accounting?: string | null
          description?: string | null
          event_date?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          order_id: string
          project_id: string
          provider?: string | null
          provider_event_id?: string | null
          raw_payload?: Json | null
          reference_period?: string | null
          source_origin?: string | null
          source_type?: string | null
        }
        Update: {
          actor?: string | null
          actor_name?: string | null
          amount?: number
          amount_accounting?: number | null
          amount_brl?: number | null
          confidence_level?: string | null
          conversion_rate?: number | null
          created_at?: string
          currency?: string | null
          currency_accounting?: string | null
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          order_id?: string
          project_id?: string
          provider?: string | null
          provider_event_id?: string | null
          raw_payload?: Json | null
          reference_period?: string | null
          source_origin?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_recovery_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "finance_tracking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_by_offer"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_view_shadow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_core_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_without_ledger"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "ledger_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          errors: Json | null
          file_name: string | null
          id: string
          imported_by: string | null
          project_id: string
          records_imported: number | null
          records_skipped: number | null
          records_total: number | null
          source: string
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          file_name?: string | null
          id?: string
          imported_by?: string | null
          project_id: string
          records_imported?: number | null
          records_skipped?: number | null
          records_total?: number | null
          source: string
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          file_name?: string | null
          id?: string
          imported_by?: string | null
          project_id?: string
          records_imported?: number | null
          records_skipped?: number | null
          records_total?: number | null
          source?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_import_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_official: {
        Row: {
          amount: number
          batch_id: string | null
          created_at: string
          currency: string | null
          event_type: string
          id: string
          occurred_at: string | null
          project_id: string
          provider: string | null
          reference_period: string | null
          source_type: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          created_at?: string
          currency?: string | null
          event_type: string
          id?: string
          occurred_at?: string | null
          project_id: string
          provider?: string | null
          reference_period?: string | null
          source_type?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          created_at?: string
          currency?: string | null
          event_type?: string
          id?: string
          occurred_at?: string | null
          project_id?: string
          provider?: string | null
          reference_period?: string | null
          source_type?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_official_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ledger_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_official_project_id_fkey"
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
          project_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string | null
          timezone?: string | null
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
          ad_account_id: string | null
          approximate_count: number | null
          audience_id: string | null
          audience_type: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          status: string | null
          subtype: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          approximate_count?: number | null
          audience_id?: string | null
          audience_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          status?: string | null
          subtype?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          approximate_count?: number | null
          audience_id?: string | null
          audience_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string | null
          subtype?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_audiences_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
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
          adset_id: string | null
          campaign_id: string | null
          created_at: string
          creative_id: string | null
          id: string
          name: string | null
          preview_url: string | null
          project_id: string | null
          status: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string
          ad_id: string
          ad_name?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
          id?: string
          name?: string | null
          preview_url?: string | null
          project_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          ad_id?: string
          ad_name?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          created_at?: string
          creative_id?: string | null
          id?: string
          name?: string | null
          preview_url?: string | null
          project_id?: string | null
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
          campaign_id: string | null
          created_at: string
          daily_budget: number | null
          end_time: string | null
          id: string
          name: string | null
          project_id: string | null
          start_time: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string
          adset_id: string
          adset_name?: string | null
          campaign_id?: string | null
          created_at?: string
          daily_budget?: number | null
          end_time?: string | null
          id?: string
          name?: string | null
          project_id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          adset_id?: string
          adset_name?: string | null
          campaign_id?: string | null
          created_at?: string
          daily_budget?: number | null
          end_time?: string | null
          id?: string
          name?: string | null
          project_id?: string | null
          start_time?: string | null
          status?: string | null
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
          added_at: string | null
          audience_id: string
          contact_id: string
          created_at: string
          id: string
          status: string | null
        }
        Insert: {
          added_at?: string | null
          audience_id: string
          contact_id: string
          created_at?: string
          id?: string
          status?: string | null
        }
        Update: {
          added_at?: string | null
          audience_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          status?: string | null
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "meta_audience_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "meta_audience_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_audience_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "meta_audience_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      meta_audience_sync_logs: {
        Row: {
          action: string
          audience_id: string
          completed_at: string | null
          contacts_count: number | null
          created_at: string
          error_message: string | null
          id: string
          project_id: string
          status: string | null
        }
        Insert: {
          action: string
          audience_id: string
          completed_at?: string | null
          contacts_count?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          project_id: string
          status?: string | null
        }
        Update: {
          action?: string
          audience_id?: string
          completed_at?: string | null
          contacts_count?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          project_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_audience_sync_logs_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_audience_sync_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaign_links: {
        Row: {
          campaign_id: string
          created_at: string | null
          funnel_id: string
          id: string
          project_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          funnel_id: string
          id?: string
          project_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          funnel_id?: string
          id?: string
          project_id?: string
        }
        Relationships: []
      }
      meta_campaigns: {
        Row: {
          ad_account_id: string | null
          campaign_id: string
          campaign_name: string | null
          created_at: string
          created_time: string | null
          id: string
          name: string | null
          objective: string | null
          project_id: string | null
          start_time: string | null
          status: string | null
          stop_time: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id?: string | null
          campaign_id: string
          campaign_name?: string | null
          created_at?: string
          created_time?: string | null
          id?: string
          name?: string | null
          objective?: string | null
          project_id?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string | null
          campaign_id?: string
          campaign_name?: string | null
          created_at?: string
          created_time?: string | null
          id?: string
          name?: string | null
          objective?: string | null
          project_id?: string | null
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
          ad_account_id: string | null
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          clicks: number | null
          cost_per_action_type: Json | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date_start: string | null
          date_stop: string | null
          frequency: number | null
          id: string
          impressions: number | null
          project_id: string | null
          reach: number | null
          spend: number | null
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          ad_account_id?: string | null
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          cost_per_action_type?: Json | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_start?: string | null
          date_stop?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          project_id?: string | null
          reach?: number | null
          spend?: number | null
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          ad_account_id?: string | null
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          cost_per_action_type?: Json | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_start?: string | null
          date_stop?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          project_id?: string | null
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
          country: string | null
          created_at: string
          id: string
          lookalike_audience_id: string | null
          name: string | null
          project_id: string
          ratio: number | null
          source_audience_id: string | null
          status: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          lookalike_audience_id?: string | null
          name?: string | null
          project_id: string
          ratio?: number | null
          source_audience_id?: string | null
          status?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          lookalike_audience_id?: string | null
          name?: string | null
          project_id?: string
          ratio?: number | null
          source_audience_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_lookalike_audiences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_lookalike_audiences_source_audience_id_fkey"
            columns: ["source_audience_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_audiences"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_definitions: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          formula: string | null
          id: string
          key: string
          name: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          formula?: string | null
          id?: string
          key: string
          name: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          formula?: string | null
          id?: string
          key?: string
          name?: string
          unit?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          project_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          project_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          project_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          origem: string | null
          project_id: string | null
          provider: string
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
          origem?: string | null
          project_id?: string | null
          provider?: string
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
          origem?: string | null
          project_id?: string | null
          provider?: string
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
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
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
      order_items: {
        Row: {
          base_price: number | null
          created_at: string
          funnel_id: string | null
          funnel_position: string | null
          id: string
          item_type: string | null
          metadata: Json | null
          offer_code: string | null
          offer_mapping_id: string | null
          offer_name: string | null
          order_id: string
          product_code: string | null
          product_name: string | null
          project_id: string
          provider_offer_id: string | null
          provider_product_id: string | null
          quantity: number | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          funnel_id?: string | null
          funnel_position?: string | null
          id?: string
          item_type?: string | null
          metadata?: Json | null
          offer_code?: string | null
          offer_mapping_id?: string | null
          offer_name?: string | null
          order_id: string
          product_code?: string | null
          product_name?: string | null
          project_id: string
          provider_offer_id?: string | null
          provider_product_id?: string | null
          quantity?: number | null
        }
        Update: {
          base_price?: number | null
          created_at?: string
          funnel_id?: string | null
          funnel_position?: string | null
          id?: string
          item_type?: string | null
          metadata?: Json | null
          offer_code?: string | null
          offer_mapping_id?: string | null
          offer_name?: string | null
          order_id?: string
          product_code?: string | null
          product_name?: string | null
          project_id?: string
          provider_offer_id?: string | null
          provider_product_id?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_recovery_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "finance_tracking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_by_offer"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_view_shadow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_core_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_without_ledger"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items_backup_20260312: {
        Row: {
          base_price: number | null
          created_at: string | null
          funnel_id: string | null
          funnel_position: string | null
          id: string | null
          item_type: string | null
          metadata: Json | null
          offer_code: string | null
          offer_mapping_id: string | null
          offer_name: string | null
          order_id: string | null
          product_code: string | null
          product_name: string | null
          project_id: string | null
          provider_offer_id: string | null
          provider_product_id: string | null
          quantity: number | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          funnel_id?: string | null
          funnel_position?: string | null
          id?: string | null
          item_type?: string | null
          metadata?: Json | null
          offer_code?: string | null
          offer_mapping_id?: string | null
          offer_name?: string | null
          order_id?: string | null
          product_code?: string | null
          product_name?: string | null
          project_id?: string | null
          provider_offer_id?: string | null
          provider_product_id?: string | null
          quantity?: number | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          funnel_id?: string | null
          funnel_position?: string | null
          id?: string | null
          item_type?: string | null
          metadata?: Json | null
          offer_code?: string | null
          offer_mapping_id?: string | null
          offer_name?: string | null
          order_id?: string | null
          product_code?: string | null
          product_name?: string | null
          project_id?: string | null
          provider_offer_id?: string | null
          provider_product_id?: string | null
          quantity?: number | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          affiliate_brl: number | null
          approved_at: string | null
          buyer_email: string | null
          buyer_name: string | null
          cancelled_at: string | null
          completed_at: string | null
          contact_id: string | null
          coproducer_brl: number | null
          coupon: string | null
          created_at: string
          currency: string | null
          customer_paid: number | null
          customer_paid_brl: number | null
          gross_base: number | null
          id: string
          installments: number | null
          ledger_status: string | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          metadata: Json | null
          net_revenue: number | null
          order_date: string | null
          ordered_at: string | null
          payment_method: string | null
          payment_type: string | null
          platform: string | null
          platform_fee_brl: number | null
          producer_net: number | null
          producer_net_brl: number | null
          project_id: string
          provider: string | null
          provider_order_id: string | null
          raw_payload: Json | null
          raw_sck: string | null
          refunded_at: string | null
          src: string | null
          status: string
          tax_brl: number | null
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
          affiliate_brl?: number | null
          approved_at?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          contact_id?: string | null
          coproducer_brl?: number | null
          coupon?: string | null
          created_at?: string
          currency?: string | null
          customer_paid?: number | null
          customer_paid_brl?: number | null
          gross_base?: number | null
          id?: string
          installments?: number | null
          ledger_status?: string | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          metadata?: Json | null
          net_revenue?: number | null
          order_date?: string | null
          ordered_at?: string | null
          payment_method?: string | null
          payment_type?: string | null
          platform?: string | null
          platform_fee_brl?: number | null
          producer_net?: number | null
          producer_net_brl?: number | null
          project_id: string
          provider?: string | null
          provider_order_id?: string | null
          raw_payload?: Json | null
          raw_sck?: string | null
          refunded_at?: string | null
          src?: string | null
          status?: string
          tax_brl?: number | null
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
          affiliate_brl?: number | null
          approved_at?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          contact_id?: string | null
          coproducer_brl?: number | null
          coupon?: string | null
          created_at?: string
          currency?: string | null
          customer_paid?: number | null
          customer_paid_brl?: number | null
          gross_base?: number | null
          id?: string
          installments?: number | null
          ledger_status?: string | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          metadata?: Json | null
          net_revenue?: number | null
          order_date?: string | null
          ordered_at?: string | null
          payment_method?: string | null
          payment_type?: string | null
          platform?: string | null
          platform_fee_brl?: number | null
          producer_net?: number | null
          producer_net_brl?: number | null
          project_id?: string
          provider?: string | null
          provider_order_id?: string | null
          raw_payload?: Json | null
          raw_sck?: string | null
          refunded_at?: string | null
          src?: string | null
          status?: string
          tax_brl?: number | null
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
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      path_events: {
        Row: {
          contact_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page_name: string | null
          page_url: string | null
          project_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          page_name?: string | null
          page_url?: string | null
          project_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_name?: string | null
          page_url?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "path_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "path_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "path_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "path_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "path_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "path_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      personalization_contexts: {
        Row: {
          contact_id: string | null
          context_data: Json | null
          context_type: string
          created_at: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          context_data?: Json | null
          context_type: string
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          context_data?: Json | null
          context_type?: string
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalization_contexts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_contexts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_contexts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_contexts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalization_contexts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_contexts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_contexts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      personalization_logs: {
        Row: {
          action_data: Json | null
          action_type: string
          contact_id: string | null
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          contact_id?: string | null
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personalization_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalization_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "personalization_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_campaigns: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          phase_id: string
          project_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          phase_id: string
          project_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          phase_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
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
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_id: string
          id?: string
          plan_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_id?: string
          id?: string
          plan_id?: string
          updated_at?: string | null
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
          created_at: string
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          interval: string | null
          is_active: boolean | null
          is_public: boolean | null
          is_trial_available: boolean | null
          max_members: number | null
          max_projects: number | null
          max_users_per_project: number | null
          name: string
          price: number | null
          price_cents: number | null
          slug: string | null
          sort_order: number | null
          trial_days: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          is_trial_available?: boolean | null
          max_members?: number | null
          max_projects?: number | null
          max_users_per_project?: number | null
          name: string
          price?: number | null
          price_cents?: number | null
          slug?: string | null
          sort_order?: number | null
          trial_days?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          is_trial_available?: boolean | null
          max_members?: number | null
          max_projects?: number | null
          max_users_per_project?: number | null
          name?: string
          price?: number | null
          price_cents?: number | null
          slug?: string | null
          sort_order?: number | null
          trial_days?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_revenue_splits: {
        Row: {
          created_at: string
          description: string | null
          financial_core_start_date: string | null
          id: string
          is_active: boolean | null
          offer_code: string | null
          partner_name: string | null
          partner_type: string | null
          percentage: number | null
          product_code: string
          product_id: string | null
          product_name: string | null
          project_id: string
          split_type: string | null
          split_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          financial_core_start_date?: string | null
          id?: string
          is_active?: boolean | null
          offer_code?: string | null
          partner_name?: string | null
          partner_type?: string | null
          percentage?: number | null
          product_code: string
          product_id?: string | null
          product_name?: string | null
          project_id: string
          split_type?: string | null
          split_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          financial_core_start_date?: string | null
          id?: string
          is_active?: boolean | null
          offer_code?: string | null
          partner_name?: string | null
          partner_type?: string | null
          percentage?: number | null
          product_code?: string
          product_id?: string | null
          product_name?: string | null
          project_id?: string
          split_type?: string | null
          split_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_revenue_splits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_activated: boolean
          avatar_url: string | null
          can_create_projects: boolean
          company_name: string | null
          company_role: string | null
          created_at: string
          crm_contact_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          max_projects: number
          onboarding_completed: boolean
          phone: string | null
          phone_country_code: string | null
          phone_ddd: string | null
          signup_source: string | null
          timezone: string | null
          updated_at: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          account_activated?: boolean
          avatar_url?: string | null
          can_create_projects?: boolean
          company_name?: string | null
          company_role?: string | null
          created_at?: string
          crm_contact_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          max_projects?: number
          onboarding_completed?: boolean
          phone?: string | null
          phone_country_code?: string | null
          phone_ddd?: string | null
          signup_source?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          account_activated?: boolean
          avatar_url?: string | null
          can_create_projects?: boolean
          company_name?: string | null
          company_role?: string | null
          created_at?: string
          crm_contact_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          max_projects?: number
          onboarding_completed?: boolean
          phone?: string | null
          phone_country_code?: string | null
          phone_ddd?: string | null
          signup_source?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean
        }
        Relationships: []
      }
      project_credentials: {
        Row: {
          basic_auth: string | null
          basic_auth_encrypted: string | null
          client_id: string | null
          client_id_encrypted: string | null
          client_secret: string | null
          client_secret_encrypted: string | null
          created_at: string
          id: string
          is_configured: boolean | null
          is_validated: boolean | null
          offers_synced_at: string | null
          project_id: string
          provider: string
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          basic_auth?: string | null
          basic_auth_encrypted?: string | null
          client_id?: string | null
          client_id_encrypted?: string | null
          client_secret?: string | null
          client_secret_encrypted?: string | null
          created_at?: string
          id?: string
          is_configured?: boolean | null
          is_validated?: boolean | null
          offers_synced_at?: string | null
          project_id: string
          provider?: string
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          basic_auth?: string | null
          basic_auth_encrypted?: string | null
          client_id?: string | null
          client_id_encrypted?: string | null
          client_secret?: string | null
          client_secret_encrypted?: string | null
          created_at?: string
          id?: string
          is_configured?: boolean | null
          is_validated?: boolean | null
          offers_synced_at?: string | null
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
          role_template_id: string | null
          status: string
          updated_at: string
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
          role_template_id?: string | null
          status?: string
          updated_at?: string
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
          role_template_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_member_feature_permissions: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          member_id: string
          permission_level: string | null
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          member_id: string
          permission_level?: string | null
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          member_id?: string
          permission_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_member_feature_permissions_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_member_feature_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "project_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_member_permissions: {
        Row: {
          automations: Database["public"]["Enums"]["permission_level"]
          created_at: string
          crm: Database["public"]["Enums"]["permission_level"]
          financeiro: Database["public"]["Enums"]["permission_level"]
          id: string
          meta_ads: Database["public"]["Enums"]["permission_level"]
          project_id: string
          settings: Database["public"]["Enums"]["permission_level"]
          social_listening: Database["public"]["Enums"]["permission_level"]
          updated_at: string
          user_id: string
          whatsapp: Database["public"]["Enums"]["permission_level"]
        }
        Insert: {
          automations?: Database["public"]["Enums"]["permission_level"]
          created_at?: string
          crm?: Database["public"]["Enums"]["permission_level"]
          financeiro?: Database["public"]["Enums"]["permission_level"]
          id?: string
          meta_ads?: Database["public"]["Enums"]["permission_level"]
          project_id: string
          settings?: Database["public"]["Enums"]["permission_level"]
          social_listening?: Database["public"]["Enums"]["permission_level"]
          updated_at?: string
          user_id: string
          whatsapp?: Database["public"]["Enums"]["permission_level"]
        }
        Update: {
          automations?: Database["public"]["Enums"]["permission_level"]
          created_at?: string
          crm?: Database["public"]["Enums"]["permission_level"]
          financeiro?: Database["public"]["Enums"]["permission_level"]
          id?: string
          meta_ads?: Database["public"]["Enums"]["permission_level"]
          project_id?: string
          settings?: Database["public"]["Enums"]["permission_level"]
          social_listening?: Database["public"]["Enums"]["permission_level"]
          updated_at?: string
          user_id?: string
          whatsapp?: Database["public"]["Enums"]["permission_level"]
        }
        Relationships: [
          {
            foreignKeyName: "project_member_permissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_member_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string | null
          role: Database["public"]["Enums"]["project_role"] | null
          user_id: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["project_role"] | null
          user_id?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["project_role"] | null
          user_id?: string | null
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
          is_enabled: boolean | null
          module_key: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          module_key: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
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
      project_settings: {
        Row: {
          created_at: string
          financial_core_start_date: string | null
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          financial_core_start_date?: string | null
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          financial_core_start_date?: string | null
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tracking_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          project_id: string
          tracking_key: string
          tracking_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          project_id: string
          tracking_key: string
          tracking_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          project_id?: string
          tracking_key?: string
          tracking_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tracking_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_members: number | null
          name: string
          public_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_members?: number | null
          name: string
          public_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_members?: number | null
          name?: string
          public_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      provider_event_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          error_stack: string | null
          id: string
          processed_at: string | null
          project_id: string
          provider: string
          provider_event_id: string | null
          raw_payload: Json | null
          received_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          processed_at?: string | null
          project_id: string
          provider: string
          provider_event_id?: string | null
          raw_payload?: Json | null
          received_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          error_stack?: string | null
          id?: string
          processed_at?: string | null
          project_id?: string
          provider?: string
          provider_event_id?: string | null
          raw_payload?: Json | null
          received_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      provider_order_map: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          project_id: string
          provider: string
          provider_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          project_id: string
          provider: string
          provider_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          project_id?: string
          provider?: string
          provider_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_recovery_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "finance_tracking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_by_offer"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_view_shadow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_core_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_order_map_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_without_ledger"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "provider_order_map_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          created_at: string
          id: string
          option_id: string | null
          question_id: string
          session_id: string
          text_answer: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          option_id?: string | null
          question_id: string
          session_id: string
          text_answer?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string | null
          question_id?: string
          session_id?: string
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          project_id: string
          quiz_id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          project_id: string
          quiz_id: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          project_id?: string
          quiz_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_events_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          intent_tags: Json | null
          option_order: number | null
          option_text: string
          question_id: string
          score_value: number | null
          trait_tags: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          intent_tags?: Json | null
          option_order?: number | null
          option_text: string
          question_id: string
          score_value?: number | null
          trait_tags?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          intent_tags?: Json | null
          option_order?: number | null
          option_text?: string
          question_id?: string
          score_value?: number | null
          trait_tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_outcome_logs: {
        Row: {
          action_data: Json | null
          action_type: string | null
          created_at: string
          executed_at: string | null
          id: string
          outcome_id: string
          result_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          outcome_id: string
          result_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          outcome_id?: string
          result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_outcome_logs_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "quiz_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_outcome_logs_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "contact_quiz_latest_results"
            referencedColumns: ["result_id"]
          },
          {
            foreignKeyName: "quiz_outcome_logs_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "quiz_results"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_outcomes: {
        Row: {
          created_at: string
          cta_text: string | null
          cta_url: string | null
          description: string | null
          id: string
          image_url: string | null
          max_score: number | null
          min_score: number | null
          name: string
          outcome_order: number | null
          quiz_id: string
          redirect_url: string | null
          trait_match: Json | null
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          max_score?: number | null
          min_score?: number | null
          name: string
          outcome_order?: number | null
          quiz_id: string
          redirect_url?: string | null
          trait_match?: Json | null
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          max_score?: number | null
          min_score?: number | null
          name?: string
          outcome_order?: number | null
          quiz_id?: string
          redirect_url?: string | null
          trait_match?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_outcomes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_question_conditions: {
        Row: {
          condition_type: string | null
          created_at: string
          depends_on_option_id: string | null
          depends_on_question_id: string | null
          id: string
          question_id: string
        }
        Insert: {
          condition_type?: string | null
          created_at?: string
          depends_on_option_id?: string | null
          depends_on_question_id?: string | null
          id?: string
          question_id: string
        }
        Update: {
          condition_type?: string | null
          created_at?: string
          depends_on_option_id?: string | null
          depends_on_question_id?: string | null
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_conditions_depends_on_option_id_fkey"
            columns: ["depends_on_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_question_conditions_depends_on_question_id_fkey"
            columns: ["depends_on_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_question_conditions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_required: boolean | null
          question_order: number | null
          question_text: string
          question_type: string | null
          quiz_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          question_order?: number | null
          question_text: string
          question_type?: string | null
          quiz_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_required?: boolean | null
          question_order?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          intent_vector: Json | null
          normalized_score: Json | null
          outcome_id: string | null
          project_id: string
          quiz_id: string
          raw_score: Json | null
          session_id: string
          summary: string | null
          traits_vector: Json | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          intent_vector?: Json | null
          normalized_score?: Json | null
          outcome_id?: string | null
          project_id: string
          quiz_id: string
          raw_score?: Json | null
          session_id: string
          summary?: string | null
          traits_vector?: Json | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          intent_vector?: Json | null
          normalized_score?: Json | null
          outcome_id?: string | null
          project_id?: string
          quiz_id?: string
          raw_score?: Json | null
          session_id?: string
          summary?: string | null
          traits_vector?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_results_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_results_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_results_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_results_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_results_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "quiz_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          project_id: string
          quiz_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id: string
          quiz_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          quiz_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          config: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          quiz_type: Database["public"]["Enums"]["quiz_type"] | null
          slug: string | null
          status: Database["public"]["Enums"]["quiz_status"] | null
          template_id: string | null
          theme_id: string | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          quiz_type?: Database["public"]["Enums"]["quiz_type"] | null
          slug?: string | null
          status?: Database["public"]["Enums"]["quiz_status"] | null
          template_id?: string | null
          theme_id?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          quiz_type?: Database["public"]["Enums"]["quiz_type"] | null
          slug?: string | null
          status?: Database["public"]["Enums"]["quiz_status"] | null
          template_id?: string | null
          theme_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_logs: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          project_id: string
          recommendation_data: Json | null
          recommendation_type: string
          status: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          project_id: string
          recommendation_data?: Json | null
          recommendation_type: string
          status?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          project_id?: string
          recommendation_data?: Json | null
          recommendation_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "recommendation_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "recommendation_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "recommendation_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "recommendation_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "recommendation_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          base_role: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_custom: boolean | null
          is_system: boolean | null
          is_system_default: boolean | null
          name: string
          perm_analise: string | null
          perm_automacoes: string | null
          perm_chat_ao_vivo: string | null
          perm_configuracoes: string | null
          perm_crm: string | null
          perm_dashboard: string | null
          perm_insights: string | null
          perm_lancamentos: string | null
          perm_meta_ads: string | null
          perm_ofertas: string | null
          perm_pesquisas: string | null
          perm_social_listening: string | null
          permissions: Json
          project_id: string | null
          updated_at: string | null
          whatsapp_auto_create_agent: boolean | null
          whatsapp_is_supervisor: boolean | null
          whatsapp_max_chats: number | null
          whatsapp_visibility_mode: string | null
        }
        Insert: {
          base_role?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_custom?: boolean | null
          is_system?: boolean | null
          is_system_default?: boolean | null
          name: string
          perm_analise?: string | null
          perm_automacoes?: string | null
          perm_chat_ao_vivo?: string | null
          perm_configuracoes?: string | null
          perm_crm?: string | null
          perm_dashboard?: string | null
          perm_insights?: string | null
          perm_lancamentos?: string | null
          perm_meta_ads?: string | null
          perm_ofertas?: string | null
          perm_pesquisas?: string | null
          perm_social_listening?: string | null
          permissions?: Json
          project_id?: string | null
          updated_at?: string | null
          whatsapp_auto_create_agent?: boolean | null
          whatsapp_is_supervisor?: boolean | null
          whatsapp_max_chats?: number | null
          whatsapp_visibility_mode?: string | null
        }
        Update: {
          base_role?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_custom?: boolean | null
          is_system?: boolean | null
          is_system_default?: boolean | null
          name?: string
          perm_analise?: string | null
          perm_automacoes?: string | null
          perm_chat_ao_vivo?: string | null
          perm_configuracoes?: string | null
          perm_crm?: string | null
          perm_dashboard?: string | null
          perm_insights?: string | null
          perm_lancamentos?: string | null
          perm_meta_ads?: string | null
          perm_ofertas?: string | null
          perm_pesquisas?: string | null
          perm_social_listening?: string | null
          permissions?: Json
          project_id?: string | null
          updated_at?: string | null
          whatsapp_auto_create_agent?: boolean | null
          whatsapp_is_supervisor?: boolean | null
          whatsapp_max_chats?: number | null
          whatsapp_visibility_mode?: string | null
        }
        Relationships: []
      }
      sales_history_orders: {
        Row: {
          created_at: string
          id: string
          imported_at: string | null
          project_id: string
          raw_data: Json | null
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          imported_at?: string | null
          project_id: string
          raw_data?: Json | null
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          imported_at?: string | null
          project_id?: string
          raw_data?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_history_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comments: {
        Row: {
          ai_analysis: Json | null
          author_name: string | null
          author_platform_id: string | null
          author_profile_pic: string | null
          author_username: string | null
          classification: string | null
          comment_timestamp: string | null
          contact_id: string | null
          created_at: string
          crm_contact_id: string | null
          id: string
          intent_score: number | null
          is_automation: boolean
          is_deleted: boolean | null
          is_hidden: boolean | null
          is_replied: boolean | null
          like_count: number | null
          parent_comment_id: string | null
          platform_comment_id: string | null
          post_id: string
          project_id: string
          replied_at: string | null
          reply_text: string | null
          sentiment: Database["public"]["Enums"]["comment_sentiment"] | null
          sentiment_score: number | null
          text: string | null
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          author_name?: string | null
          author_platform_id?: string | null
          author_profile_pic?: string | null
          author_username?: string | null
          classification?: string | null
          comment_timestamp?: string | null
          contact_id?: string | null
          created_at?: string
          crm_contact_id?: string | null
          id?: string
          intent_score?: number | null
          is_automation?: boolean
          is_deleted?: boolean | null
          is_hidden?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          platform_comment_id?: string | null
          post_id: string
          project_id: string
          replied_at?: string | null
          reply_text?: string | null
          sentiment?: Database["public"]["Enums"]["comment_sentiment"] | null
          sentiment_score?: number | null
          text?: string | null
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          author_name?: string | null
          author_platform_id?: string | null
          author_profile_pic?: string | null
          author_username?: string | null
          classification?: string | null
          comment_timestamp?: string | null
          contact_id?: string | null
          created_at?: string
          crm_contact_id?: string | null
          id?: string
          intent_score?: number | null
          is_automation?: boolean
          is_deleted?: boolean | null
          is_hidden?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          platform_comment_id?: string | null
          post_id?: string
          project_id?: string
          replied_at?: string | null
          reply_text?: string | null
          sentiment?: Database["public"]["Enums"]["comment_sentiment"] | null
          sentiment_score?: number | null
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "social_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "social_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "social_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "social_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "social_comments_parent_comment_id_fkey"
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
          access_token: string | null
          created_at: string
          id: string
          instagram_username: string | null
          is_active: boolean | null
          page_id: string
          page_name: string | null
          platform: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          instagram_username?: string | null
          is_active?: boolean | null
          page_id: string
          page_name?: string | null
          platform?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          instagram_username?: string | null
          is_active?: boolean | null
          page_id?: string
          page_name?: string | null
          platform?: string | null
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
      social_posts: {
        Row: {
          comments_count: number | null
          created_at: string
          id: string
          is_monitored: boolean | null
          like_count: number | null
          media_url: string | null
          message: string | null
          permalink: string | null
          platform: string | null
          platform_post_id: string | null
          post_type: string | null
          project_id: string
          share_count: number | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string
        }
        Insert: {
          comments_count?: number | null
          created_at?: string
          id?: string
          is_monitored?: boolean | null
          like_count?: number | null
          media_url?: string | null
          message?: string | null
          permalink?: string | null
          platform?: string | null
          platform_post_id?: string | null
          post_type?: string | null
          project_id: string
          share_count?: number | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
        }
        Update: {
          comments_count?: number | null
          created_at?: string
          id?: string
          is_monitored?: boolean | null
          like_count?: number | null
          media_url?: string | null
          message?: string | null
          permalink?: string | null
          platform?: string | null
          platform_post_id?: string | null
          post_type?: string | null
          project_id?: string
          share_count?: number | null
          thumbnail_url?: string | null
          timestamp?: string | null
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
      spend_core_events: {
        Row: {
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          created_at: string
          currency: string
          economic_day: string
          id: string
          is_active: boolean
          occurred_at: string
          project_id: string
          provider: string
          provider_event_id: string
          raw_payload: Json | null
          received_at: string
          spend_amount: number
          version: number
        }
        Insert: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          created_at?: string
          currency?: string
          economic_day: string
          id?: string
          is_active?: boolean
          occurred_at: string
          project_id: string
          provider: string
          provider_event_id: string
          raw_payload?: Json | null
          received_at?: string
          spend_amount?: number
          version?: number
        }
        Update: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          created_at?: string
          currency?: string
          economic_day?: string
          id?: string
          is_active?: boolean
          occurred_at?: string
          project_id?: string
          provider?: string
          provider_event_id?: string
          raw_payload?: Json | null
          received_at?: string
          spend_amount?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "spend_core_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          is_trial: boolean | null
          metadata: Json | null
          notes: string | null
          origin: string | null
          plan_id: string | null
          platform: string | null
          project_id: string | null
          starts_at: string | null
          status: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          is_trial?: boolean | null
          metadata?: Json | null
          notes?: string | null
          origin?: string | null
          plan_id?: string | null
          platform?: string | null
          project_id?: string | null
          starts_at?: string | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          is_trial?: boolean | null
          metadata?: Json | null
          notes?: string | null
          origin?: string | null
          plan_id?: string | null
          platform?: string | null
          project_id?: string | null
          starts_at?: string | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
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
          {
            foreignKeyName: "subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_log: {
        Row: {
          affected_count: number | null
          check_type: string
          checked_at: string | null
          details: Json | null
          id: string
          severity: string
        }
        Insert: {
          affected_count?: number | null
          check_type: string
          checked_at?: string | null
          details?: Json | null
          id?: string
          severity: string
        }
        Update: {
          affected_count?: number | null
          check_type?: string
          checked_at?: string | null
          details?: Json | null
          id?: string
          severity?: string
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          ip_address: string | null
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
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
          project_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
          metadata: Json | null
          processed_at: string | null
          processing_time_ms: number | null
          project_id: string
          success: boolean | null
          webhook_type: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          processing_time_ms?: number | null
          project_id: string
          success?: boolean | null
          webhook_type: string
        }
        Update: {
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          processing_time_ms?: number | null
          project_id?: string
          success?: boolean | null
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
          is_primary: boolean | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          department_id: string
          id?: string
          is_primary?: boolean | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          department_id?: string
          id?: string
          is_primary?: boolean | null
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
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          max_concurrent_chats: number | null
          name: string
          project_id: string
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          max_concurrent_chats?: number | null
          name: string
          project_id: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          max_concurrent_chats?: number | null
          name?: string
          project_id?: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contact_notes: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_notes_project_id_fkey"
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
          close_reason: string | null
          closed_at: string | null
          closed_by: string | null
          contact_avatar_url: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          department_id: string | null
          id: string
          is_bot_active: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json | null
          phone_number: string
          priority: string | null
          project_id: string
          queue_position: number | null
          status: string | null
          subject: string | null
          unread_count: number | null
          updated_at: string
          whatsapp_number_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          contact_avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_bot_active?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          phone_number: string
          priority?: string | null
          project_id: string
          queue_position?: number | null
          status?: string | null
          subject?: string | null
          unread_count?: number | null
          updated_at?: string
          whatsapp_number_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          close_reason?: string | null
          closed_at?: string | null
          closed_by?: string | null
          contact_avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_bot_active?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          phone_number?: string
          priority?: string | null
          project_id?: string
          queue_position?: number | null
          status?: string | null
          subject?: string | null
          unread_count?: number | null
          updated_at?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
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
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
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
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
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
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          external_id: string | null
          id: string
          is_from_bot: boolean | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          project_id: string
          read_at: string | null
          sender_id: string | null
          sender_name: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          external_id?: string | null
          id?: string
          is_from_bot?: boolean | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          project_id: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          external_id?: string | null
          id?: string
          is_from_bot?: boolean | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          project_id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: string | null
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
            foreignKeyName: "whatsapp_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_numbers: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string
          display_name: string | null
          id: string
          instance_name: string | null
          is_active: boolean | null
          is_connected: boolean | null
          last_connected_at: string | null
          phone_number: string
          project_id: string
          provider: string | null
          qr_code: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name?: string | null
          is_active?: boolean | null
          is_connected?: boolean | null
          last_connected_at?: string | null
          phone_number: string
          project_id: string
          provider?: string | null
          qr_code?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name?: string | null
          is_active?: boolean | null
          is_connected?: boolean | null
          last_connected_at?: string | null
          phone_number?: string
          project_id?: string
          provider?: string | null
          qr_code?: string | null
          updated_at?: string
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
      whatsapp_quick_replies: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          shortcut: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          shortcut?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_quick_replies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      canonical_sale_events: {
        Row: {
          affiliate_id: string | null
          affiliate_name: string | null
          canonical_status: string | null
          checkout_origin: string | null
          confirmation_date: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          currency: string | null
          event_timestamp: string | null
          event_type: string | null
          external_id: string | null
          funnel_id: string | null
          funnel_position: string | null
          funnel_position_order: number | null
          gross_value_brl: number | null
          installments_number: number | null
          internal_id: string | null
          is_subscription: boolean | null
          net_value_brl: number | null
          offer_code: string | null
          offer_name: string | null
          original_status: string | null
          payment_method: string | null
          payment_type: string | null
          platform: string | null
          product_code: string | null
          product_name: string | null
          project_id: string | null
          purchase_date: string | null
          recorded_at: string | null
          row_num: number | null
          sale_type: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Relationships: []
      }
      contact_quiz_latest_results: {
        Row: {
          contact_id: string | null
          intent_vector: Json | null
          normalized_score: Json | null
          project_id: string | null
          quiz_id: string | null
          quiz_name: string | null
          quiz_type: Database["public"]["Enums"]["quiz_type"] | null
          raw_score: Json | null
          result_created_at: string | null
          result_id: string | null
          session_id: string | null
          summary: string | null
          traits_vector: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
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
      crm_contact_attribution_view: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          first_order_at: string | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          project_id: string | null
          raw_sck: string | null
          raw_xcod: string | null
          utm_placement: string | null
          utm_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact_journey_metrics_view: {
        Row: {
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          first_order_at: string | null
          first_product: string | null
          first_utm_source: string | null
          is_repeat_customer: boolean | null
          last_order_at: string | null
          last_product: string | null
          project_id: string | null
          total_customer_paid: number | null
          total_items: number | null
          total_orders: number | null
          total_producer_net: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact_orders_metrics_view: {
        Row: {
          avg_ticket: number | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          days_since_last_order: number | null
          first_order_at: string | null
          first_product: string | null
          first_utm_source: string | null
          is_repeat_customer: boolean | null
          items_count: number | null
          last_order_at: string | null
          last_product: string | null
          orders_count: number | null
          project_id: string | null
          provider_breakdown: Json | null
          total_customer_paid: number | null
          total_producer_net: number | null
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
      crm_contact_revenue_view: {
        Row: {
          average_ticket: number | null
          buyer_email: string | null
          buyer_name: string | null
          first_purchase_at: string | null
          last_purchase_at: string | null
          project_id: string | null
          total_customer_paid: number | null
          total_orders: number | null
          total_producer_net: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customer_intelligence_overview: {
        Row: {
          avg_ltv: number | null
          avg_orders_per_customer: number | null
          avg_ticket: number | null
          project_id: string | null
          repeat_customers_count: number | null
          repeat_rate_percent: number | null
          total_contacts: number | null
          total_customers: number | null
          total_leads: number | null
          total_orders: number | null
          total_prospects: number | null
          total_revenue: number | null
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
      crm_journey_orders_view: {
        Row: {
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          currency: string | null
          customer_paid: number | null
          items_count: number | null
          main_funnel_id: string | null
          main_product_name: string | null
          order_id: string | null
          ordered_at: string | null
          producer_net: number | null
          products_detail: Json | null
          project_id: string | null
          provider: string | null
          provider_order_id: string | null
          purchase_sequence: number | null
          status: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_creative: string | null
          utm_placement: string | null
          utm_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_order_automation_events_view: {
        Row: {
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          currency: string | null
          event_type: string | null
          funnel_id: string | null
          items_count: number | null
          main_product_name: string | null
          order_id: string | null
          order_sequence: number | null
          order_value: number | null
          ordered_at: string | null
          producer_net: number | null
          project_id: string | null
          provider: string | null
          provider_order_id: string | null
          status: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_order_items_view: {
        Row: {
          base_price: number | null
          buyer_email: string | null
          buyer_name: string | null
          funnel_id: string | null
          funnel_name: string | null
          item_id: string | null
          item_type: string | null
          order_id: string | null
          product_name: string | null
          project_id: string | null
          provider_offer_id: string | null
          provider_product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_recovery_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "finance_tracking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_by_offer"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_view_shadow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_core_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_without_ledger"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_orders_view: {
        Row: {
          approved_at: string | null
          buyer_email: string | null
          buyer_name: string | null
          currency: string | null
          customer_paid: number | null
          funnel_id: string | null
          funnel_name: string | null
          has_bump: boolean | null
          has_upsell: boolean | null
          item_count: number | null
          order_id: string | null
          ordered_at: string | null
          producer_net: number | null
          project_id: string | null
          provider_order_id: string | null
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          currency?: string | null
          customer_paid?: number | null
          funnel_id?: never
          funnel_name?: never
          has_bump?: never
          has_upsell?: never
          item_count?: never
          order_id?: string | null
          ordered_at?: string | null
          producer_net?: number | null
          project_id?: string | null
          provider_order_id?: string | null
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          currency?: string | null
          customer_paid?: number | null
          funnel_id?: never
          funnel_name?: never
          has_bump?: never
          has_upsell?: never
          item_count?: never
          order_id?: string | null
          ordered_at?: string | null
          producer_net?: number | null
          project_id?: string | null
          provider_order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_recovery_orders_view: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          customer_paid: number | null
          funnel_id: string | null
          funnel_name: string | null
          item_count: number | null
          main_product_name: string | null
          order_id: string | null
          ordered_at: string | null
          producer_net: number | null
          project_id: string | null
          provider_order_id: string | null
          recovery_category: string | null
          status: string | null
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          customer_paid?: number | null
          funnel_id?: never
          funnel_name?: never
          item_count?: never
          main_product_name?: never
          order_id?: string | null
          ordered_at?: string | null
          producer_net?: number | null
          project_id?: string | null
          provider_order_id?: string | null
          recovery_category?: never
          status?: string | null
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          customer_paid?: number | null
          funnel_id?: never
          funnel_name?: never
          item_count?: never
          main_product_name?: never
          order_id?: string | null
          ordered_at?: string | null
          producer_net?: number | null
          project_id?: string | null
          provider_order_id?: string | null
          recovery_category?: never
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_core_view: {
        Row: {
          affiliate_code: string | null
          affiliate_name: string | null
          buyer_city: string | null
          buyer_country: string | null
          buyer_document: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          buyer_phone_ddd: string | null
          buyer_state: string | null
          checkout_origin: string | null
          confirmation_date: string | null
          coupon_code: string | null
          created_at: string | null
          currency: string | null
          economic_day: string | null
          economic_timestamp: string | null
          funnel_id: string | null
          funnel_name: string | null
          funnel_type: string | null
          gross_amount: number | null
          hotmart_status: string | null
          id: string | null
          installments: number | null
          is_cancelled: boolean | null
          is_net_pending: boolean | null
          is_valid_sale: boolean | null
          last_synced_at: string | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          net_amount: number | null
          nome_oferta: string | null
          occurred_at: string | null
          offer_code: string | null
          payment_method: string | null
          payment_type: string | null
          product_code: string | null
          product_name: string | null
          project_id: string | null
          sale_origin: string | null
          tipo_posicao: string | null
          total_price_brl: number | null
          transaction_id: string | null
          updated_at: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_creative: string | null
          utm_placement: string | null
          utm_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotmart_sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
          },
        ]
      }
      finance_ledger_summary: {
        Row: {
          affiliate_cost: number | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          buyer_phone_country_code: string | null
          buyer_phone_ddd: string | null
          checkout_origin: string | null
          coproducer_cost: number | null
          economic_day: string | null
          event_count: number | null
          first_event_at: string | null
          funnel_id: string | null
          funnel_name: string | null
          hotmart_status: string | null
          is_upgrade: boolean | null
          last_event_at: string | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          net_revenue: number | null
          offer_code: string | null
          payment_method: string | null
          payment_type: string | null
          platform_cost: number | null
          producer_gross: number | null
          product_code: string | null
          product_name: string | null
          project_id: string | null
          provider: string | null
          provider_source: string | null
          raw_checkout_origin: string | null
          recurrence: string | null
          refunds: number | null
          sale_category: string | null
          subscriber_code: string | null
          transaction_id: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_creative: string | null
          utm_medium: string | null
          utm_placement: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_tracking_view: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          buyer_phone_country_code: string | null
          buyer_phone_ddd: string | null
          checkout_origin: string | null
          contact_id: string | null
          created_at: string | null
          economic_day: string | null
          funnel_id: string | null
          funnel_name: string | null
          gross_amount: number | null
          hotmart_status: string | null
          id: string | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          net_amount: number | null
          offer_code: string | null
          payment_method: string | null
          payment_type: string | null
          product_code: string | null
          product_name: string | null
          project_id: string | null
          purchase_date: string | null
          recurrence: string | null
          sale_category: string | null
          transaction_id: string | null
          updated_at: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_creative: string | null
          utm_medium: string | null
          utm_placement: string | null
          utm_source: string | null
          webhook_event_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_daily: {
        Row: {
          ad_spend: number | null
          ads: number | null
          campaigns: number | null
          chargeback_count: number | null
          chargebacks: number | null
          cpa: number | null
          economic_day: string | null
          gross_refunds: number | null
          gross_revenue: number | null
          net_revenue: number | null
          profit: number | null
          project_id: string | null
          refund_count: number | null
          refunds: number | null
          revenue: number | null
          roas: number | null
          transactions: number | null
          unique_buyers: number | null
        }
        Relationships: []
      }
      funnel_financials: {
        Row: {
          cpa: number | null
          economic_day: string | null
          funnel_id: string | null
          gross_revenue: number | null
          profit: number | null
          project_id: string | null
          revenue: number | null
          roas: number | null
          sales_count: number | null
          spend: number | null
        }
        Relationships: []
      }
      funnel_financials_summary: {
        Row: {
          avg_ticket: number | null
          days_with_data: number | null
          financial_core_start_date: string | null
          first_day: string | null
          funnel_id: string | null
          funnel_name: string | null
          funnel_type: string | null
          health_status: string | null
          last_day: string | null
          overall_cpa: number | null
          overall_roas: number | null
          project_id: string | null
          roas_target: number | null
          total_gross_revenue: number | null
          total_profit: number | null
          total_revenue: number | null
          total_sales: number | null
          total_spend: number | null
        }
        Relationships: []
      }
      funnel_metrics_daily: {
        Row: {
          avg_ticket: number | null
          chargeback_rate: number | null
          chargebacks: number | null
          confirmed_sales: number | null
          cpa_real: number | null
          front_sales: number | null
          funnel_id: string | null
          gross_revenue: number | null
          investment: number | null
          metric_date: string | null
          net_revenue: number | null
          project_id: string | null
          refund_rate: number | null
          refunds: number | null
          roas: number | null
          unique_buyers: number | null
        }
        Relationships: []
      }
      funnel_orders_by_offer: {
        Row: {
          base_price: number | null
          economic_day: string | null
          funnel_id: string | null
          funnel_name: string | null
          item_type: string | null
          nome_posicao: string | null
          offer_code: string | null
          ordem_posicao: number | null
          order_id: string | null
          product_name: string | null
          project_id: string | null
          tipo_posicao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_orders_view: {
        Row: {
          all_offer_codes: string[] | null
          bump_revenue: number | null
          buyer_email: string | null
          buyer_name: string | null
          checkout_origin: string | null
          created_at: string | null
          currency: string | null
          customer_paid: number | null
          economic_day: string | null
          funnel_id: string | null
          funnel_name: string | null
          has_bump: boolean | null
          has_downsell: boolean | null
          has_upsell: boolean | null
          main_offer_code: string | null
          main_product: string | null
          main_revenue: number | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          order_id: string | null
          order_items_count: number | null
          ordered_at: string | null
          producer_net: number | null
          project_id: string | null
          status: string | null
          transaction_id: string | null
          upsell_revenue: number | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_placement: string | null
          utm_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_revenue: {
        Row: {
          economic_day: string | null
          funnel_id: string | null
          gross_revenue: number | null
          project_id: string | null
          revenue: number | null
          sales_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_spend: {
        Row: {
          economic_day: string | null
          funnel_id: string | null
          project_id: string | null
          record_count: number | null
          spend: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_core_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      live_financial_today: {
        Row: {
          affiliate_fees: number | null
          coproducer_fees: number | null
          cpa: number | null
          data_source: string | null
          economic_day: string | null
          funnel_id: string | null
          funnel_name: string | null
          gross_revenue: number | null
          is_estimated: boolean | null
          platform_fees: number | null
          profit: number | null
          project_id: string | null
          revenue: number | null
          roas: number | null
          sales_count: number | null
          spend: number | null
        }
        Relationships: []
      }
      live_project_totals_today: {
        Row: {
          cpa: number | null
          economic_day: string | null
          project_id: string | null
          roas: number | null
          total_affiliate_fees: number | null
          total_coproducer_fees: number | null
          total_gross_revenue: number | null
          total_platform_fees: number | null
          total_profit: number | null
          total_revenue: number | null
          total_sales: number | null
          total_spend: number | null
        }
        Relationships: []
      }
      live_sales_today: {
        Row: {
          affiliate_cost: number | null
          buyer_email: string | null
          coproducer_cost: number | null
          economic_day: string | null
          funnel_id: string | null
          gross_amount: number | null
          net_revenue: number | null
          offer_code: string | null
          platform_fee: number | null
          product_name: string | null
          project_id: string | null
          raw_checkout_origin: string | null
          status: string | null
          transaction_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_mappings_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "live_spend_today"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      live_spend_today: {
        Row: {
          data_source: string | null
          economic_day: string | null
          funnel_id: string | null
          funnel_name: string | null
          is_estimated: boolean | null
          project_id: string | null
          record_count: number | null
          spend: number | null
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
      order_items_resolved: {
        Row: {
          base_price: number | null
          created_at: string | null
          funnel_id: string | null
          funnel_position: string | null
          id: string | null
          item_type: string | null
          metadata: Json | null
          offer_code: string | null
          offer_mapping_id: string | null
          offer_name: string | null
          order_id: string | null
          product_code: string | null
          product_name: string | null
          project_id: string | null
          provider_offer_id: string | null
          provider_product_id: string | null
          quantity: number | null
          resolution_source: string | null
          resolved_funnel_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_recovery_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "finance_tracking_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_by_offer"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "funnel_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_view_shadow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_core_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_without_ledger"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_view_shadow: {
        Row: {
          affiliate_cost: number | null
          approved_at: string | null
          buyer_email: string | null
          buyer_name: string | null
          chargeback_amount: number | null
          completed_at: string | null
          contact_id: string | null
          coproducer_cost: number | null
          created_at: string | null
          currency: string | null
          customer_paid: number | null
          gross_base: number | null
          id: string | null
          item_count: number | null
          ordered_at: string | null
          platform_fee: number | null
          producer_net: number | null
          project_id: string | null
          provider: string | null
          provider_order_id: string | null
          refund_amount: number | null
          status: string | null
          tax_cost: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_daily: {
        Row: {
          ad_spend: number | null
          affiliate_fees: number | null
          coproducer_fees: number | null
          data_source: string | null
          economic_day: string | null
          gross_revenue: number | null
          net_revenue: number | null
          platform_fees: number | null
          profit: number | null
          project_id: string | null
          roas: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      profit_monthly: {
        Row: {
          ad_spend: number | null
          affiliate_fees: number | null
          coproducer_fees: number | null
          data_source: string | null
          gross_revenue: number | null
          month: string | null
          net_revenue: number | null
          platform_fees: number | null
          profit: number | null
          project_id: string | null
          roas: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      refunds_daily: {
        Row: {
          chargeback_count: number | null
          chargebacks: number | null
          economic_day: string | null
          gross_refunds: number | null
          project_id: string | null
          refund_count: number | null
          refunds: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_daily: {
        Row: {
          affiliate_fees: number | null
          coproducer_fees: number | null
          data_source: string | null
          economic_day: string | null
          gross_revenue: number | null
          net_revenue: number | null
          platform_fees: number | null
          project_id: string | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_core_view: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          economic_day: string | null
          event_type: string | null
          funnel_id: string | null
          funnel_name: string | null
          gross_amount: number | null
          hotmart_status: string | null
          id: string | null
          is_active: boolean | null
          net_amount: number | null
          occurred_at: string | null
          offer_code: string | null
          product_code: string | null
          product_name: string | null
          project_id: string | null
          provider: string | null
          provider_event_id: string | null
          received_at: string | null
          transaction_id: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_creative: string | null
          utm_placement: string | null
          utm_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_journey_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contact_orders_metrics_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_journey_orders_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_order_automation_events_view"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_daily: {
        Row: {
          economic_day: string | null
          gross_revenue: number | null
          project_id: string | null
          revenue: number | null
          transactions: number | null
          unique_buyers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_by_project: {
        Row: {
          economic_day: string | null
          project_id: string | null
          record_count: number | null
          total_spend: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_core_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_daily: {
        Row: {
          ad_spend: number | null
          ads: number | null
          campaigns: number | null
          economic_day: string | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_core_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_monthly: {
        Row: {
          ad_spend: number | null
          campaigns: number | null
          month: string | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_core_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_without_ledger: {
        Row: {
          approved_at: string | null
          currency: string | null
          customer_paid: number | null
          hours_since_approval: number | null
          ledger_status: string | null
          order_id: string | null
          project_id: string | null
          provider_order_id: string | null
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          currency?: string | null
          customer_paid?: number | null
          hours_since_approval?: never
          ledger_status?: string | null
          order_id?: string | null
          project_id?: string | null
          provider_order_id?: string | null
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          currency?: string | null
          customer_paid?: number | null
          hours_since_approval?: never
          ledger_status?: string | null
          order_id?: string | null
          project_id?: string | null
          provider_order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_project_invite: {
        Args: { p_invite_id: string; p_user_id: string }
        Returns: Json
      }
      aggregate_comment_metrics_daily: {
        Args: { p_date: string; p_project_id: string }
        Returns: undefined
      }
      can_invite_to_project: { Args: { _project_id: string }; Returns: boolean }
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
      create_team_member_contact: {
        Args: {
          p_email: string
          p_name: string
          p_phone?: string
          p_phone_country_code?: string
          p_phone_ddd?: string
          p_project_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      decrypt_sensitive: { Args: { p_encrypted_data: string }; Returns: string }
      derive_order_status_from_ledger: {
        Args: { p_order_id: string }
        Returns: string
      }
      encrypt_sensitive: { Args: { p_data: string }; Returns: string }
      get_active_connection: {
        Args: { p_project_id: string; p_provider_slug: string }
        Returns: string
      }
      get_contact_document: {
        Args: { p_contact_id: string; p_project_id: string }
        Returns: string
      }
      get_encryption_key: { Args: { p_key_name?: string }; Returns: string }
      get_next_available_agent: {
        Args: { p_department_id?: string; p_project_id: string }
        Returns: string
      }
      get_project_credentials_internal: {
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
      get_user_max_projects: { Args: { _user_id: string }; Returns: number }
      get_user_project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["project_role"]
      }
      has_accepted_terms: {
        Args: { _user_id: string; _version?: string }
        Returns: boolean
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
      increment_lovable_credits: {
        Args: { p_count?: number; p_project_id: string }
        Returns: undefined
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
      normalize_phone_number: { Args: { phone: string }; Returns: string }
      revert_csv_import_batch: {
        Args: { p_batch_id: string; p_project_id: string }
        Returns: Json
      }
      update_last_login: { Args: never; Returns: undefined }
    }
    Enums: {
      agent_status: "online" | "away" | "offline" | "busy"
      ai_processing_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "skipped"
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
      connection_status:
        | "active"
        | "paused"
        | "expired"
        | "error"
        | "disconnected"
      feature_target_type: "project" | "user"
      integration_auth_type:
        | "oauth2"
        | "api_key"
        | "webhook_token"
        | "basic_auth"
        | "custom"
      integration_category:
        | "financial"
        | "acquisition"
        | "communication"
        | "ingestion"
      invite_status: "pending" | "accepted" | "rejected" | "expired"
      outcome_action_type:
        | "add_tag"
        | "remove_tag"
        | "set_lifecycle_stage"
        | "trigger_automation"
        | "trigger_whatsapp_flow"
        | "trigger_email_sequence"
        | "fire_webhook"
        | "fire_pixel_event"
        | "redirect_url"
        | "dynamic_end_screen"
        | "update_custom_field"
      override_target_type: "user" | "project"
      permission_level: "none" | "view" | "edit" | "admin"
      plan_type: "trial" | "monthly" | "yearly" | "lifetime"
      project_role: "owner" | "manager" | "operator"
      quiz_question_type:
        | "single_choice"
        | "multiple_choice"
        | "scale"
        | "text"
        | "number"
      quiz_session_status: "started" | "in_progress" | "completed" | "abandoned"
      quiz_status: "draft" | "published" | "archived"
      quiz_type:
        | "lead_capture"
        | "segmentation"
        | "assessment"
        | "recommendation"
      social_platform: "instagram" | "facebook"
      social_post_type: "organic" | "ad"
      subscription_origin: "hotmart" | "manual" | "stripe" | "other"
      subscription_status:
        | "active"
        | "trial"
        | "expired"
        | "cancelled"
        | "pending"
      sync_status:
        | "started"
        | "running"
        | "completed"
        | "partial"
        | "failed"
        | "cancelled"
      sync_trigger: "cron" | "manual" | "webhook" | "system"
      sync_type:
        | "webhook_ingest"
        | "api_full_sync"
        | "api_incremental"
        | "csv_import"
        | "token_refresh"
        | "health_check"
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
      ai_processing_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "skipped",
      ],
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
      connection_status: [
        "active",
        "paused",
        "expired",
        "error",
        "disconnected",
      ],
      feature_target_type: ["project", "user"],
      integration_auth_type: [
        "oauth2",
        "api_key",
        "webhook_token",
        "basic_auth",
        "custom",
      ],
      integration_category: [
        "financial",
        "acquisition",
        "communication",
        "ingestion",
      ],
      invite_status: ["pending", "accepted", "rejected", "expired"],
      outcome_action_type: [
        "add_tag",
        "remove_tag",
        "set_lifecycle_stage",
        "trigger_automation",
        "trigger_whatsapp_flow",
        "trigger_email_sequence",
        "fire_webhook",
        "fire_pixel_event",
        "redirect_url",
        "dynamic_end_screen",
        "update_custom_field",
      ],
      override_target_type: ["user", "project"],
      permission_level: ["none", "view", "edit", "admin"],
      plan_type: ["trial", "monthly", "yearly", "lifetime"],
      project_role: ["owner", "manager", "operator"],
      quiz_question_type: [
        "single_choice",
        "multiple_choice",
        "scale",
        "text",
        "number",
      ],
      quiz_session_status: ["started", "in_progress", "completed", "abandoned"],
      quiz_status: ["draft", "published", "archived"],
      quiz_type: [
        "lead_capture",
        "segmentation",
        "assessment",
        "recommendation",
      ],
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
      sync_status: [
        "started",
        "running",
        "completed",
        "partial",
        "failed",
        "cancelled",
      ],
      sync_trigger: ["cron", "manual", "webhook", "system"],
      sync_type: [
        "webhook_ingest",
        "api_full_sync",
        "api_incremental",
        "csv_import",
        "token_refresh",
        "health_check",
      ],
    },
  },
} as const
A new version of Supabase CLI is available: v2.78.1 (currently installed v2.75.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
