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
      agent_decisions_log: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          confidence: number
          contact_id: string | null
          created_at: string
          decision_data: Json
          decision_type: string
          executed_at: string | null
          explanation: Json
          id: string
          outcome: string | null
          outcome_data: Json | null
          prediction_id: string | null
          project_id: string
          rejected_reason: string | null
          reward_score: number | null
          risk_score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number
          contact_id?: string | null
          created_at?: string
          decision_data?: Json
          decision_type: string
          executed_at?: string | null
          explanation?: Json
          id?: string
          outcome?: string | null
          outcome_data?: Json | null
          prediction_id?: string | null
          project_id: string
          rejected_reason?: string | null
          reward_score?: number | null
          risk_score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          confidence?: number
          contact_id?: string | null
          created_at?: string
          decision_data?: Json
          decision_type?: string
          executed_at?: string | null
          explanation?: Json
          id?: string
          outcome?: string | null
          outcome_data?: Json | null
          prediction_id?: string | null
          project_id?: string
          rejected_reason?: string | null
          reward_score?: number | null
          risk_score?: number | null
          status?: string
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
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
          allowed_actions: Json
          boundaries: Json
          confidence_threshold: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          max_actions_per_day: number | null
          name: string
          objective: string
          project_id: string
          require_human_approval: boolean
          trigger_on: Json
          updated_at: string
        }
        Insert: {
          allowed_actions?: Json
          boundaries?: Json
          confidence_threshold?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_actions_per_day?: number | null
          name: string
          objective: string
          project_id: string
          require_human_approval?: boolean
          trigger_on?: Json
          updated_at?: string
        }
        Update: {
          allowed_actions?: Json
          boundaries?: Json
          confidence_threshold?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_actions_per_day?: number | null
          name?: string
          objective?: string
          project_id?: string
          require_human_approval?: boolean
          trigger_on?: Json
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
          current_daily_usage: number
          current_monthly_usage: number
          daily_limit: number
          id: string
          is_unlimited: boolean
          last_daily_reset: string
          last_monthly_reset: string
          lovable_credits_limit: number | null
          lovable_credits_used: number | null
          monthly_limit: number
          openai_credits_used: number | null
          project_id: string
          provider_preference: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_daily_usage?: number
          current_monthly_usage?: number
          daily_limit?: number
          id?: string
          is_unlimited?: boolean
          last_daily_reset?: string
          last_monthly_reset?: string
          lovable_credits_limit?: number | null
          lovable_credits_used?: number | null
          monthly_limit?: number
          openai_credits_used?: number | null
          project_id: string
          provider_preference?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_daily_usage?: number
          current_monthly_usage?: number
          daily_limit?: number
          id?: string
          is_unlimited?: boolean
          last_daily_reset?: string
          last_monthly_reset?: string
          lovable_credits_limit?: number | null
          lovable_credits_used?: number | null
          monthly_limit?: number
          openai_credits_used?: number | null
          project_id?: string
          provider_preference?: string
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
          recorded_at: string
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
          recorded_at?: string
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
          recorded_at?: string
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
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
          confidence: number
          contact_id: string
          content: Json
          contradicted_by: string | null
          created_at: string
          id: string
          is_contradicted: boolean
          is_locked: boolean
          last_reinforced_at: string
          memory_type: string
          project_id: string
          reinforcement_count: number
          source: string
          source_id: string | null
          source_name: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number
          contact_id: string
          content?: Json
          contradicted_by?: string | null
          created_at?: string
          id?: string
          is_contradicted?: boolean
          is_locked?: boolean
          last_reinforced_at?: string
          memory_type: string
          project_id: string
          reinforcement_count?: number
          source: string
          source_id?: string | null
          source_name?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number
          contact_id?: string
          content?: Json
          contradicted_by?: string | null
          created_at?: string
          id?: string
          is_contradicted?: boolean
          is_locked?: boolean
          last_reinforced_at?: string
          memory_type?: string
          project_id?: string
          reinforcement_count?: number
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
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
          confidence: number
          contact_id: string
          created_at: string
          expires_at: string | null
          explanation: Json
          id: string
          is_active: boolean
          prediction_type: string
          project_id: string
          recommended_actions: Json
          risk_level: string
          updated_at: string
          urgency_score: number
        }
        Insert: {
          confidence?: number
          contact_id: string
          created_at?: string
          expires_at?: string | null
          explanation?: Json
          id?: string
          is_active?: boolean
          prediction_type: string
          project_id: string
          recommended_actions?: Json
          risk_level?: string
          updated_at?: string
          urgency_score?: number
        }
        Update: {
          confidence?: number
          contact_id?: string
          created_at?: string
          expires_at?: string | null
          explanation?: Json
          id?: string
          is_active?: boolean
          prediction_type?: string
          project_id?: string
          recommended_actions?: Json
          risk_level?: string
          updated_at?: string
          urgency_score?: number
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
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
          confidence_delta: number
          contact_profile_id: string
          created_at: string
          delta_intent_vector: Json
          delta_trait_vector: Json
          entropy_delta: number
          id: string
          metadata: Json | null
          profile_snapshot: Json
          project_id: string
          source: string
          source_id: string | null
          source_name: string | null
        }
        Insert: {
          confidence_delta?: number
          contact_profile_id: string
          created_at?: string
          delta_intent_vector?: Json
          delta_trait_vector?: Json
          entropy_delta?: number
          id?: string
          metadata?: Json | null
          profile_snapshot?: Json
          project_id: string
          source: string
          source_id?: string | null
          source_name?: string | null
        }
        Update: {
          confidence_delta?: number
          contact_profile_id?: string
          created_at?: string
          delta_intent_vector?: Json
          delta_trait_vector?: Json
          entropy_delta?: number
          id?: string
          metadata?: Json | null
          profile_snapshot?: Json
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
          confidence_score: number
          contact_id: string
          created_at: string
          entropy_score: number
          id: string
          intent_vector: Json
          last_updated_at: string
          project_id: string
          signal_sources: Json
          total_signals: number
          trait_vector: Json
          volatility_score: number
        }
        Insert: {
          confidence_score?: number
          contact_id: string
          created_at?: string
          entropy_score?: number
          id?: string
          intent_vector?: Json
          last_updated_at?: string
          project_id: string
          signal_sources?: Json
          total_signals?: number
          trait_vector?: Json
          volatility_score?: number
        }
        Update: {
          confidence_score?: number
          contact_id?: string
          created_at?: string
          entropy_score?: number
          id?: string
          intent_vector?: Json
          last_updated_at?: string
          project_id?: string
          signal_sources?: Json
          total_signals?: number
          trait_vector?: Json
          volatility_score?: number
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
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
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
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
          is_team_member: boolean | null
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
          user_id: string | null
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
          is_team_member?: boolean | null
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
          user_id?: string | null
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
          is_team_member?: boolean | null
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
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
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
      event_dispatch_rules: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          payload_mapping: Json
          project_id: string
          provider: string
          provider_event_name: string
          system_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          payload_mapping?: Json
          project_id: string
          provider: string
          provider_event_name: string
          system_event: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          payload_mapping?: Json
          project_id?: string
          provider?: string
          provider_event_name?: string
          system_event?: string
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
      funnel_experiments: {
        Row: {
          confidence_threshold: number | null
          control_config: Json
          created_at: string
          created_by: string | null
          description: string | null
          ended_at: string | null
          funnel_performance_id: string | null
          id: string
          min_sample_size: number | null
          name: string
          project_id: string
          results: Json | null
          started_at: string | null
          status: string
          suggestion_id: string | null
          traffic_split: number | null
          updated_at: string
          variant_config: Json
          winner: string | null
        }
        Insert: {
          confidence_threshold?: number | null
          control_config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          funnel_performance_id?: string | null
          id?: string
          min_sample_size?: number | null
          name: string
          project_id: string
          results?: Json | null
          started_at?: string | null
          status?: string
          suggestion_id?: string | null
          traffic_split?: number | null
          updated_at?: string
          variant_config?: Json
          winner?: string | null
        }
        Update: {
          confidence_threshold?: number | null
          control_config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          funnel_performance_id?: string | null
          id?: string
          min_sample_size?: number | null
          name?: string
          project_id?: string
          results?: Json | null
          started_at?: string | null
          status?: string
          suggestion_id?: string | null
          traffic_split?: number | null
          updated_at?: string
          variant_config?: Json
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_experiments_funnel_performance_id_fkey"
            columns: ["funnel_performance_id"]
            isOneToOne: false
            referencedRelation: "funnel_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_experiments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_experiments_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "funnel_optimization_suggestions"
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
      funnel_optimization_suggestions: {
        Row: {
          applied_at: string | null
          confidence: number | null
          created_at: string
          description: string | null
          evidence: Json | null
          funnel_performance_id: string | null
          id: string
          impact_estimate: number | null
          outcome: Json | null
          project_id: string
          recommended_action: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggestion_type: string
          title: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json | null
          funnel_performance_id?: string | null
          id?: string
          impact_estimate?: number | null
          outcome?: Json | null
          project_id: string
          recommended_action?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggestion_type: string
          title: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json | null
          funnel_performance_id?: string | null
          id?: string
          impact_estimate?: number | null
          outcome?: Json | null
          project_id?: string
          recommended_action?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggestion_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_optimization_suggestions_funnel_performance_id_fkey"
            columns: ["funnel_performance_id"]
            isOneToOne: false
            referencedRelation: "funnel_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_optimization_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_performance: {
        Row: {
          avg_time_to_convert: unknown
          churn_rate: number | null
          confidence: number | null
          conversion_rate: number | null
          created_at: string
          funnel_id: string | null
          id: string
          last_updated_at: string
          path_name: string | null
          path_signature: Json
          path_type: string
          performance_score: number | null
          project_id: string
          revenue_per_user: number | null
          sample_size: number | null
          total_churns: number | null
          total_conversions: number | null
          total_entries: number | null
          trend: string | null
        }
        Insert: {
          avg_time_to_convert?: unknown
          churn_rate?: number | null
          confidence?: number | null
          conversion_rate?: number | null
          created_at?: string
          funnel_id?: string | null
          id?: string
          last_updated_at?: string
          path_name?: string | null
          path_signature?: Json
          path_type?: string
          performance_score?: number | null
          project_id: string
          revenue_per_user?: number | null
          sample_size?: number | null
          total_churns?: number | null
          total_conversions?: number | null
          total_entries?: number | null
          trend?: string | null
        }
        Update: {
          avg_time_to_convert?: unknown
          churn_rate?: number | null
          confidence?: number | null
          conversion_rate?: number | null
          created_at?: string
          funnel_id?: string | null
          id?: string
          last_updated_at?: string
          path_name?: string | null
          path_signature?: Json
          path_type?: string
          performance_score?: number | null
          project_id?: string
          revenue_per_user?: number | null
          sample_size?: number | null
          total_churns?: number | null
          total_conversions?: number | null
          total_entries?: number | null
          trend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_performance_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "funnel_performance_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_performance_project_id_fkey"
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
          category: string
          created_at: string
          description: string | null
          id: string
          project_id: string | null
          threshold_key: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string | null
          threshold_key: string
          threshold_value: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string | null
          threshold_key?: string
          threshold_value?: number
          updated_at?: string
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
      metric_definitions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          formula: string | null
          id: string
          metric_key: string
          metric_name: string
          unit: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          formula?: string | null
          id?: string
          metric_key: string
          metric_name: string
          unit?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          formula?: string | null
          id?: string
          metric_key?: string
          metric_name?: string
          unit?: string | null
        }
        Relationships: []
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
            foreignKeyName: "offer_mappings_project_id_fkey"
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
          conversion_value: number | null
          created_at: string
          event_data: Json | null
          event_type: string
          experiment_id: string | null
          funnel_performance_id: string | null
          id: string
          path_signature: Json
          project_id: string
          time_in_path: unknown
          variant: string | null
        }
        Insert: {
          contact_id?: string | null
          conversion_value?: number | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          experiment_id?: string | null
          funnel_performance_id?: string | null
          id?: string
          path_signature?: Json
          project_id: string
          time_in_path?: unknown
          variant?: string | null
        }
        Update: {
          contact_id?: string | null
          conversion_value?: number | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          experiment_id?: string | null
          funnel_performance_id?: string | null
          id?: string
          path_signature?: Json
          project_id?: string
          time_in_path?: unknown
          variant?: string | null
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_events_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "funnel_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_events_funnel_performance_id_fkey"
            columns: ["funnel_performance_id"]
            isOneToOne: false
            referencedRelation: "funnel_performance"
            referencedColumns: ["id"]
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
          channel: string
          contact_id: string | null
          created_at: string
          current_intent: string | null
          dominant_trait: string | null
          excluded_memory_types: string[] | null
          expires_at: string
          human_override: Json | null
          id: string
          memory_signals: Json
          personalization_depth: string
          prediction_signals: Json
          profile_snapshot: Json
          project_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          channel: string
          contact_id?: string | null
          created_at?: string
          current_intent?: string | null
          dominant_trait?: string | null
          excluded_memory_types?: string[] | null
          expires_at?: string
          human_override?: Json | null
          id?: string
          memory_signals?: Json
          personalization_depth?: string
          prediction_signals?: Json
          profile_snapshot?: Json
          project_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          contact_id?: string | null
          created_at?: string
          current_intent?: string | null
          dominant_trait?: string | null
          excluded_memory_types?: string[] | null
          expires_at?: string
          human_override?: Json | null
          id?: string
          memory_signals?: Json
          personalization_depth?: string
          prediction_signals?: Json
          profile_snapshot?: Json
          project_id?: string
          session_id?: string
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
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
          applied: boolean
          channel: string
          contact_id: string | null
          content_original: string | null
          content_personalized: string | null
          context_id: string | null
          created_at: string
          directives: Json
          id: string
          outcome: string | null
          outcome_data: Json | null
          project_id: string
          session_id: string | null
          tokens_resolved: Json
        }
        Insert: {
          applied?: boolean
          channel: string
          contact_id?: string | null
          content_original?: string | null
          content_personalized?: string | null
          context_id?: string | null
          created_at?: string
          directives?: Json
          id?: string
          outcome?: string | null
          outcome_data?: Json | null
          project_id: string
          session_id?: string | null
          tokens_resolved?: Json
        }
        Update: {
          applied?: boolean
          channel?: string
          contact_id?: string | null
          content_original?: string | null
          content_personalized?: string | null
          context_id?: string | null
          created_at?: string
          directives?: Json
          id?: string
          outcome?: string | null
          outcome_data?: Json | null
          project_id?: string
          session_id?: string | null
          tokens_resolved?: Json
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalization_logs_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "personalization_contexts"
            referencedColumns: ["id"]
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
          max_members: number
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
          max_members?: number
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
          max_members?: number
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
          account_activated: boolean | null
          avatar_url: string | null
          can_create_projects: boolean | null
          company_name: string | null
          company_role: string | null
          created_at: string
          crm_contact_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          max_projects: number | null
          onboarding_completed: boolean | null
          phone: string | null
          phone_country_code: string | null
          phone_ddd: string | null
          signup_source: string | null
          timezone: string | null
          updated_at: string
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          account_activated?: boolean | null
          avatar_url?: string | null
          can_create_projects?: boolean | null
          company_name?: string | null
          company_role?: string | null
          created_at?: string
          crm_contact_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          max_projects?: number | null
          onboarding_completed?: boolean | null
          phone?: string | null
          phone_country_code?: string | null
          phone_ddd?: string | null
          signup_source?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          account_activated?: boolean | null
          avatar_url?: string | null
          can_create_projects?: boolean | null
          company_name?: string | null
          company_role?: string | null
          created_at?: string
          crm_contact_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          max_projects?: number | null
          onboarding_completed?: boolean | null
          phone?: string | null
          phone_country_code?: string | null
          phone_ddd?: string | null
          signup_source?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean | null
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
          permissions_insights:
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
          permissions_pesquisas:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_social_listening:
            | Database["public"]["Enums"]["permission_level"]
            | null
          project_id: string
          responded_at: string | null
          role: Database["public"]["Enums"]["project_role"]
          role_template_id: string | null
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
          permissions_insights?:
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
          permissions_pesquisas?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_social_listening?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          project_id: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["project_role"]
          role_template_id?: string | null
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
          permissions_insights?:
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
          permissions_pesquisas?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          permissions_social_listening?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          project_id?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["project_role"]
          role_template_id?: string | null
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
          {
            foreignKeyName: "project_invites_role_template_id_fkey"
            columns: ["role_template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_member_feature_permissions: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          permission_level: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          permission_level?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          permission_level?: string
          project_id?: string
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "project_member_feature_permissions_project_id_fkey"
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
          insights: Database["public"]["Enums"]["permission_level"] | null
          lancamentos: Database["public"]["Enums"]["permission_level"]
          meta_ads: Database["public"]["Enums"]["permission_level"]
          ofertas: Database["public"]["Enums"]["permission_level"]
          pesquisas: Database["public"]["Enums"]["permission_level"] | null
          project_id: string
          social_listening:
            | Database["public"]["Enums"]["permission_level"]
            | null
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
          insights?: Database["public"]["Enums"]["permission_level"] | null
          lancamentos?: Database["public"]["Enums"]["permission_level"]
          meta_ads?: Database["public"]["Enums"]["permission_level"]
          ofertas?: Database["public"]["Enums"]["permission_level"]
          pesquisas?: Database["public"]["Enums"]["permission_level"] | null
          project_id: string
          social_listening?:
            | Database["public"]["Enums"]["permission_level"]
            | null
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
          insights?: Database["public"]["Enums"]["permission_level"] | null
          lancamentos?: Database["public"]["Enums"]["permission_level"]
          meta_ads?: Database["public"]["Enums"]["permission_level"]
          ofertas?: Database["public"]["Enums"]["permission_level"]
          pesquisas?: Database["public"]["Enums"]["permission_level"] | null
          project_id?: string
          social_listening?:
            | Database["public"]["Enums"]["permission_level"]
            | null
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
          role_template_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          role_template_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          role_template_id?: string | null
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
          {
            foreignKeyName: "project_members_role_template_id_fkey"
            columns: ["role_template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
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
      project_settings: {
        Row: {
          created_at: string
          financial_core_start_date: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          financial_core_start_date?: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          financial_core_start_date?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tracking_settings: {
        Row: {
          created_at: string
          enable_browser_events: boolean
          enable_server_events: boolean
          gtag_id: string | null
          id: string
          meta_pixel_id: string | null
          project_id: string
          tiktok_pixel_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enable_browser_events?: boolean
          enable_server_events?: boolean
          gtag_id?: string | null
          id?: string
          meta_pixel_id?: string | null
          project_id: string
          tiktok_pixel_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enable_browser_events?: boolean
          enable_server_events?: boolean
          gtag_id?: string | null
          id?: string
          meta_pixel_id?: string | null
          project_id?: string
          tiktok_pixel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tracking_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
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
          max_members: number
          name: string
          public_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_members?: number
          name: string
          public_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_members?: number
          name?: string
          public_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_event_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          processed_at: string | null
          project_id: string
          provider: string
          provider_event_id: string
          raw_payload: Json
          received_at: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          project_id: string
          provider: string
          provider_event_id: string
          raw_payload?: Json
          received_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          project_id?: string
          provider?: string
          provider_event_id?: string
          raw_payload?: Json
          received_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_event_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answer_text: string | null
          answer_value: number | null
          created_at: string
          id: string
          option_id: string | null
          question_id: string
          session_id: string
        }
        Insert: {
          answer_text?: string | null
          answer_value?: number | null
          created_at?: string
          id?: string
          option_id?: string | null
          question_id: string
          session_id: string
        }
        Update: {
          answer_text?: string | null
          answer_value?: number | null
          created_at?: string
          id?: string
          option_id?: string | null
          question_id?: string
          session_id?: string
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
          contact_id: string | null
          created_at: string
          event_name: string
          id: string
          payload: Json | null
          project_id: string
          session_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          payload?: Json | null
          project_id: string
          session_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          payload?: Json | null
          project_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          end_quiz: boolean | null
          id: string
          intent_vector: Json | null
          label: string
          next_block_id: string | null
          next_question_id: string | null
          order_index: number
          question_id: string
          traits_vector: Json | null
          value: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          end_quiz?: boolean | null
          id?: string
          intent_vector?: Json | null
          label: string
          next_block_id?: string | null
          next_question_id?: string | null
          order_index?: number
          question_id: string
          traits_vector?: Json | null
          value: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          end_quiz?: boolean | null
          id?: string
          intent_vector?: Json | null
          label?: string
          next_block_id?: string | null
          next_question_id?: string | null
          order_index?: number
          question_id?: string
          traits_vector?: Json | null
          value?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_next_block_id_fkey"
            columns: ["next_block_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_options_next_question_id_fkey"
            columns: ["next_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
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
          actions_executed: Json
          contact_id: string | null
          created_at: string
          decision_trace: Json
          evaluation_time_ms: number | null
          id: string
          outcome_id: string | null
          project_id: string
          quiz_session_id: string
        }
        Insert: {
          actions_executed?: Json
          contact_id?: string | null
          created_at?: string
          decision_trace?: Json
          evaluation_time_ms?: number | null
          id?: string
          outcome_id?: string | null
          project_id: string
          quiz_session_id: string
        }
        Update: {
          actions_executed?: Json
          contact_id?: string | null
          created_at?: string
          decision_trace?: Json
          evaluation_time_ms?: number | null
          id?: string
          outcome_id?: string | null
          project_id?: string
          quiz_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_outcome_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "quiz_outcome_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_outcome_logs_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "quiz_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_outcome_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_outcome_logs_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_outcomes: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          description: string | null
          end_screen_override: Json | null
          id: string
          is_active: boolean
          name: string
          priority: number
          quiz_id: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          description?: string | null
          end_screen_override?: Json | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          quiz_id: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          description?: string | null
          end_screen_override?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          quiz_id?: string
          updated_at?: string
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
          condition_payload: Json
          condition_type: string
          created_at: string
          group_id: string | null
          id: string
          is_active: boolean
          logical_operator: string
          order_index: number
          question_id: string
          updated_at: string
        }
        Insert: {
          condition_payload?: Json
          condition_type: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean
          logical_operator?: string
          order_index?: number
          question_id: string
          updated_at?: string
        }
        Update: {
          condition_payload?: Json
          condition_type?: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean
          logical_operator?: string
          order_index?: number
          question_id?: string
          updated_at?: string
        }
        Relationships: [
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
          dynamic_weight_rules: Json | null
          id: string
          is_hidden: boolean
          is_required: boolean
          order_index: number
          quiz_id: string
          subtitle: string | null
          title: string
          type: Database["public"]["Enums"]["quiz_question_type"]
          visibility_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          dynamic_weight_rules?: Json | null
          id?: string
          is_hidden?: boolean
          is_required?: boolean
          order_index?: number
          quiz_id: string
          subtitle?: string | null
          title: string
          type?: Database["public"]["Enums"]["quiz_question_type"]
          visibility_type?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          dynamic_weight_rules?: Json | null
          id?: string
          is_hidden?: boolean
          is_required?: boolean
          order_index?: number
          quiz_id?: string
          subtitle?: string | null
          title?: string
          type?: Database["public"]["Enums"]["quiz_question_type"]
          visibility_type?: string
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
          confidence_score: number | null
          created_at: string
          decision_path: Json | null
          entropy_score: number | null
          flow_type: string | null
          id: string
          intent_vector: Json | null
          normalized_score: Json | null
          project_id: string
          questions_answered: number | null
          questions_skipped: number | null
          raw_score: Json | null
          semantic_interpretation: Json | null
          semantic_profile_id: string | null
          session_id: string
          summary: string | null
          traits_vector: Json | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          decision_path?: Json | null
          entropy_score?: number | null
          flow_type?: string | null
          id?: string
          intent_vector?: Json | null
          normalized_score?: Json | null
          project_id: string
          questions_answered?: number | null
          questions_skipped?: number | null
          raw_score?: Json | null
          semantic_interpretation?: Json | null
          semantic_profile_id?: string | null
          session_id: string
          summary?: string | null
          traits_vector?: Json | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          decision_path?: Json | null
          entropy_score?: number | null
          flow_type?: string | null
          id?: string
          intent_vector?: Json | null
          normalized_score?: Json | null
          project_id?: string
          questions_answered?: number | null
          questions_skipped?: number | null
          raw_score?: Json | null
          semantic_interpretation?: Json | null
          semantic_profile_id?: string | null
          session_id?: string
          summary?: string | null
          traits_vector?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_semantic_profile_id_fkey"
            columns: ["semantic_profile_id"]
            isOneToOne: false
            referencedRelation: "semantic_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          accumulated_vectors: Json | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          current_question_id: string | null
          decision_path: Json | null
          flow_metadata: Json | null
          id: string
          injected_question_ids: string[] | null
          ip_hash: string | null
          project_id: string
          quiz_id: string
          skipped_question_ids: string[] | null
          started_at: string
          status: Database["public"]["Enums"]["quiz_session_status"]
          user_agent: string | null
          utm_data: Json | null
          visited_question_ids: string[] | null
        }
        Insert: {
          accumulated_vectors?: Json | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          current_question_id?: string | null
          decision_path?: Json | null
          flow_metadata?: Json | null
          id?: string
          injected_question_ids?: string[] | null
          ip_hash?: string | null
          project_id: string
          quiz_id: string
          skipped_question_ids?: string[] | null
          started_at?: string
          status?: Database["public"]["Enums"]["quiz_session_status"]
          user_agent?: string | null
          utm_data?: Json | null
          visited_question_ids?: string[] | null
        }
        Update: {
          accumulated_vectors?: Json | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          current_question_id?: string | null
          decision_path?: Json | null
          flow_metadata?: Json | null
          id?: string
          injected_question_ids?: string[] | null
          ip_hash?: string | null
          project_id?: string
          quiz_id?: string
          skipped_question_ids?: string[] | null
          started_at?: string
          status?: Database["public"]["Enums"]["quiz_session_status"]
          user_agent?: string | null
          utm_data?: Json | null
          visited_question_ids?: string[] | null
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
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
          adaptive_config: Json | null
          allow_anonymous: boolean
          completion_config: Json | null
          created_at: string
          description: string | null
          enable_pixel_events: boolean
          end_screen_config: Json | null
          flow_type: string
          id: string
          identity_settings: Json
          is_active: boolean
          name: string
          pixel_event_overrides: Json
          project_id: string
          requires_identification: boolean
          slug: string | null
          start_screen_config: Json | null
          template_id: string | null
          theme_config: Json | null
          theme_id: string | null
          type: Database["public"]["Enums"]["quiz_type"]
          updated_at: string
        }
        Insert: {
          adaptive_config?: Json | null
          allow_anonymous?: boolean
          completion_config?: Json | null
          created_at?: string
          description?: string | null
          enable_pixel_events?: boolean
          end_screen_config?: Json | null
          flow_type?: string
          id?: string
          identity_settings?: Json
          is_active?: boolean
          name: string
          pixel_event_overrides?: Json
          project_id: string
          requires_identification?: boolean
          slug?: string | null
          start_screen_config?: Json | null
          template_id?: string | null
          theme_config?: Json | null
          theme_id?: string | null
          type?: Database["public"]["Enums"]["quiz_type"]
          updated_at?: string
        }
        Update: {
          adaptive_config?: Json | null
          allow_anonymous?: boolean
          completion_config?: Json | null
          created_at?: string
          description?: string | null
          enable_pixel_events?: boolean
          end_screen_config?: Json | null
          flow_type?: string
          id?: string
          identity_settings?: Json
          is_active?: boolean
          name?: string
          pixel_event_overrides?: Json
          project_id?: string
          requires_identification?: boolean
          slug?: string | null
          start_screen_config?: Json | null
          template_id?: string | null
          theme_config?: Json | null
          theme_id?: string | null
          type?: Database["public"]["Enums"]["quiz_type"]
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
          {
            foreignKeyName: "quizzes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "experience_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "experience_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_logs: {
        Row: {
          action_data: Json
          action_type: string
          contact_id: string
          created_at: string
          id: string
          outcome: string | null
          outcome_data: Json | null
          outcome_recorded_at: string | null
          performed_by: string | null
          prediction_id: string | null
          project_id: string
        }
        Insert: {
          action_data?: Json
          action_type: string
          contact_id: string
          created_at?: string
          id?: string
          outcome?: string | null
          outcome_data?: Json | null
          outcome_recorded_at?: string | null
          performed_by?: string | null
          prediction_id?: string | null
          project_id: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          contact_id?: string
          created_at?: string
          id?: string
          outcome?: string | null
          outcome_data?: Json | null
          outcome_recorded_at?: string | null
          performed_by?: string | null
          prediction_id?: string | null
          project_id?: string
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_logs_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "contact_predictions"
            referencedColumns: ["id"]
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
      role_template_feature_permissions: {
        Row: {
          created_at: string
          feature_id: string
          id: string
          permission_level: string
          role_template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_id: string
          id?: string
          permission_level?: string
          role_template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_id?: string
          id?: string
          permission_level?: string
          role_template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_template_feature_permissions_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_template_feature_permissions_role_template_id_fkey"
            columns: ["role_template_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          base_role: Database["public"]["Enums"]["project_role"] | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_custom: boolean | null
          is_system_default: boolean | null
          name: string
          perm_analise: Database["public"]["Enums"]["permission_level"] | null
          perm_automacoes:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_chat_ao_vivo:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_configuracoes:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_crm: Database["public"]["Enums"]["permission_level"] | null
          perm_dashboard: Database["public"]["Enums"]["permission_level"] | null
          perm_insights: Database["public"]["Enums"]["permission_level"] | null
          perm_lancamentos:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_meta_ads: Database["public"]["Enums"]["permission_level"] | null
          perm_ofertas: Database["public"]["Enums"]["permission_level"] | null
          perm_pesquisas: Database["public"]["Enums"]["permission_level"] | null
          perm_social_listening:
            | Database["public"]["Enums"]["permission_level"]
            | null
          project_id: string | null
          updated_at: string | null
          whatsapp_auto_create_agent: boolean | null
          whatsapp_is_supervisor: boolean | null
          whatsapp_max_chats: number | null
          whatsapp_visibility_mode: string | null
        }
        Insert: {
          base_role?: Database["public"]["Enums"]["project_role"] | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_custom?: boolean | null
          is_system_default?: boolean | null
          name: string
          perm_analise?: Database["public"]["Enums"]["permission_level"] | null
          perm_automacoes?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_chat_ao_vivo?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_configuracoes?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_crm?: Database["public"]["Enums"]["permission_level"] | null
          perm_dashboard?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_insights?: Database["public"]["Enums"]["permission_level"] | null
          perm_lancamentos?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_meta_ads?: Database["public"]["Enums"]["permission_level"] | null
          perm_ofertas?: Database["public"]["Enums"]["permission_level"] | null
          perm_pesquisas?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_social_listening?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          project_id?: string | null
          updated_at?: string | null
          whatsapp_auto_create_agent?: boolean | null
          whatsapp_is_supervisor?: boolean | null
          whatsapp_max_chats?: number | null
          whatsapp_visibility_mode?: string | null
        }
        Update: {
          base_role?: Database["public"]["Enums"]["project_role"] | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_custom?: boolean | null
          is_system_default?: boolean | null
          name?: string
          perm_analise?: Database["public"]["Enums"]["permission_level"] | null
          perm_automacoes?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_chat_ao_vivo?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_configuracoes?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_crm?: Database["public"]["Enums"]["permission_level"] | null
          perm_dashboard?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_insights?: Database["public"]["Enums"]["permission_level"] | null
          perm_lancamentos?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_meta_ads?: Database["public"]["Enums"]["permission_level"] | null
          perm_ofertas?: Database["public"]["Enums"]["permission_level"] | null
          perm_pesquisas?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          perm_social_listening?:
            | Database["public"]["Enums"]["permission_level"]
            | null
          project_id?: string | null
          updated_at?: string | null
          whatsapp_auto_create_agent?: boolean | null
          whatsapp_is_supervisor?: boolean | null
          whatsapp_max_chats?: number | null
          whatsapp_visibility_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_core_events: {
        Row: {
          attribution: Json | null
          contact_id: string | null
          created_at: string
          currency: string
          economic_day: string
          event_type: string
          gross_amount: number
          id: string
          is_active: boolean
          net_amount: number
          occurred_at: string
          project_id: string
          provider: string
          provider_event_id: string
          raw_payload: Json | null
          received_at: string
          version: number
        }
        Insert: {
          attribution?: Json | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          economic_day: string
          event_type: string
          gross_amount?: number
          id?: string
          is_active?: boolean
          net_amount?: number
          occurred_at: string
          project_id: string
          provider: string
          provider_event_id: string
          raw_payload?: Json | null
          received_at?: string
          version?: number
        }
        Update: {
          attribution?: Json | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          economic_day?: string
          event_type?: string
          gross_amount?: number
          id?: string
          is_active?: boolean
          net_amount?: number
          occurred_at?: string
          project_id?: string
          provider?: string
          provider_event_id?: string
          raw_payload?: Json | null
          received_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_core_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "sales_core_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_core_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_profiles: {
        Row: {
          buying_style: string | null
          copy_angle: string | null
          created_at: string
          description: string | null
          emotional_driver: string | null
          id: string
          intent_pattern: Json | null
          is_active: boolean | null
          name: string
          primary_intent: string | null
          primary_traits: string[] | null
          priority: number | null
          project_id: string
          risk_profile: string | null
          trait_pattern: Json | null
          updated_at: string
        }
        Insert: {
          buying_style?: string | null
          copy_angle?: string | null
          created_at?: string
          description?: string | null
          emotional_driver?: string | null
          id?: string
          intent_pattern?: Json | null
          is_active?: boolean | null
          name: string
          primary_intent?: string | null
          primary_traits?: string[] | null
          priority?: number | null
          project_id: string
          risk_profile?: string | null
          trait_pattern?: Json | null
          updated_at?: string
        }
        Update: {
          buying_style?: string | null
          copy_angle?: string | null
          created_at?: string
          description?: string | null
          emotional_driver?: string | null
          id?: string
          intent_pattern?: Json | null
          is_active?: boolean | null
          name?: string
          primary_intent?: string | null
          primary_traits?: string[] | null
          priority?: number | null
          project_id?: string
          risk_profile?: string | null
          trait_pattern?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comments: {
        Row: {
          ai_error: string | null
          ai_processed_at: string | null
          ai_processing_status:
            | Database["public"]["Enums"]["ai_processing_status"]
            | null
          ai_suggested_reply: string | null
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
          is_own_account: boolean | null
          is_replied: boolean | null
          like_count: number | null
          manually_classified: boolean | null
          parent_comment_id: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          project_id: string
          replied_at: string | null
          replied_by: string | null
          reply_count: number | null
          reply_sent_at: string | null
          reply_status: string | null
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
          ai_suggested_reply?: string | null
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
          is_own_account?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          manually_classified?: boolean | null
          parent_comment_id?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          project_id: string
          replied_at?: string | null
          replied_by?: string | null
          reply_count?: number | null
          reply_sent_at?: string | null
          reply_status?: string | null
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
          ai_suggested_reply?: string | null
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
          is_own_account?: boolean | null
          is_replied?: boolean | null
          like_count?: number | null
          manually_classified?: boolean | null
          parent_comment_id?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_id?: string
          project_id?: string
          replied_at?: string | null
          replied_by?: string | null
          reply_count?: number | null
          reply_sent_at?: string | null
          reply_status?: string | null
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
          ad_status: string | null
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
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          ad_status?: string | null
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
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          ad_status?: string | null
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
          thumbnail_url?: string | null
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
      survey_ai_knowledge_base: {
        Row: {
          auto_classify_responses: boolean | null
          business_description: string | null
          business_name: string | null
          created_at: string
          high_intent_indicators: string | null
          high_intent_keywords: string[] | null
          id: string
          min_intent_score_for_action: number | null
          objection_patterns: string | null
          pain_keywords: string[] | null
          pain_point_indicators: string | null
          products_services: string | null
          project_id: string
          satisfaction_indicators: string | null
          satisfaction_keywords: string[] | null
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          auto_classify_responses?: boolean | null
          business_description?: string | null
          business_name?: string | null
          created_at?: string
          high_intent_indicators?: string | null
          high_intent_keywords?: string[] | null
          id?: string
          min_intent_score_for_action?: number | null
          objection_patterns?: string | null
          pain_keywords?: string[] | null
          pain_point_indicators?: string | null
          products_services?: string | null
          project_id: string
          satisfaction_indicators?: string | null
          satisfaction_keywords?: string[] | null
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          auto_classify_responses?: boolean | null
          business_description?: string | null
          business_name?: string | null
          created_at?: string
          high_intent_indicators?: string | null
          high_intent_keywords?: string[] | null
          id?: string
          min_intent_score_for_action?: number | null
          objection_patterns?: string | null
          pain_keywords?: string[] | null
          pain_point_indicators?: string | null
          products_services?: string | null
          project_id?: string
          satisfaction_indicators?: string | null
          satisfaction_keywords?: string[] | null
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_ai_knowledge_base_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_insights_daily: {
        Row: {
          ai_daily_summary: string | null
          avg_intent_score: number | null
          confusion_count: number | null
          created_at: string
          feature_request_count: number | null
          high_intent_count: number | null
          high_intent_percentage: number | null
          id: string
          metric_date: string
          negative_count: number | null
          neutral_count: number | null
          neutral_sentiment_count: number | null
          opportunities_identified: number | null
          pain_point_count: number | null
          positive_count: number | null
          price_objection_count: number | null
          project_id: string
          satisfaction_count: number | null
          survey_id: string | null
          total_responses: number | null
          unique_respondents: number | null
          updated_at: string
        }
        Insert: {
          ai_daily_summary?: string | null
          avg_intent_score?: number | null
          confusion_count?: number | null
          created_at?: string
          feature_request_count?: number | null
          high_intent_count?: number | null
          high_intent_percentage?: number | null
          id?: string
          metric_date: string
          negative_count?: number | null
          neutral_count?: number | null
          neutral_sentiment_count?: number | null
          opportunities_identified?: number | null
          pain_point_count?: number | null
          positive_count?: number | null
          price_objection_count?: number | null
          project_id: string
          satisfaction_count?: number | null
          survey_id?: string | null
          total_responses?: number | null
          unique_respondents?: number | null
          updated_at?: string
        }
        Update: {
          ai_daily_summary?: string | null
          avg_intent_score?: number | null
          confusion_count?: number | null
          created_at?: string
          feature_request_count?: number | null
          high_intent_count?: number | null
          high_intent_percentage?: number | null
          id?: string
          metric_date?: string
          negative_count?: number | null
          neutral_count?: number | null
          neutral_sentiment_count?: number | null
          opportunities_identified?: number | null
          pain_point_count?: number | null
          positive_count?: number | null
          price_objection_count?: number | null
          project_id?: string
          satisfaction_count?: number | null
          survey_id?: string | null
          total_responses?: number | null
          unique_respondents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_insights_daily_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_insights_daily_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          identity_confidence_weight: number | null
          identity_field_target: string | null
          is_required: boolean | null
          options: Json | null
          position: number
          question_text: string
          question_type: string
          settings: Json | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          identity_confidence_weight?: number | null
          identity_field_target?: string | null
          is_required?: boolean | null
          options?: Json | null
          position?: number
          question_text: string
          question_type: string
          settings?: Json | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          identity_confidence_weight?: number | null
          identity_field_target?: string | null
          is_required?: boolean | null
          options?: Json | null
          position?: number
          question_text?: string
          question_type?: string
          settings?: Json | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_response_analysis: {
        Row: {
          ai_summary: string | null
          classification: string | null
          contact_id: string | null
          created_at: string
          detected_keywords: string[] | null
          id: string
          intent_score: number | null
          key_insights: Json | null
          processed_at: string | null
          processed_by: string | null
          processing_error: string | null
          project_id: string
          response_id: string
          sentiment: string | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          classification?: string | null
          contact_id?: string | null
          created_at?: string
          detected_keywords?: string[] | null
          id?: string
          intent_score?: number | null
          key_insights?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          processing_error?: string | null
          project_id: string
          response_id: string
          sentiment?: string | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          classification?: string | null
          contact_id?: string | null
          created_at?: string
          detected_keywords?: string[] | null
          id?: string
          intent_score?: number | null
          key_insights?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          processing_error?: string | null
          project_id?: string
          response_id?: string
          sentiment?: string | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_response_analysis_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "survey_response_analysis_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_response_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_response_analysis_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: true
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_response_analysis_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          contact_id: string | null
          created_at: string
          email: string
          id: string
          metadata: Json | null
          processed_at: string | null
          project_id: string
          source: string
          submitted_at: string
          survey_id: string
        }
        Insert: {
          answers?: Json
          contact_id?: string | null
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          project_id: string
          source?: string
          submitted_at?: string
          survey_id: string
        }
        Update: {
          answers?: Json
          contact_id?: string | null
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          project_id?: string
          source?: string
          submitted_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "survey_responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_webhook_keys: {
        Row: {
          api_key: string
          created_at: string
          default_tags: string[] | null
          field_mappings: Json | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          project_id: string
          survey_id: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          api_key?: string
          created_at?: string
          default_tags?: string[] | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          project_id: string
          survey_id: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          api_key?: string
          created_at?: string
          default_tags?: string[] | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          project_id?: string
          survey_id?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_webhook_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_webhook_keys_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          created_by: string | null
          default_funnel_id: string | null
          default_tags: string[] | null
          description: string | null
          id: string
          name: string
          objective: string
          project_id: string
          settings: Json | null
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_funnel_id?: string | null
          default_tags?: string[] | null
          description?: string | null
          id?: string
          name: string
          objective?: string
          project_id: string
          settings?: Json | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_funnel_id?: string | null
          default_tags?: string[] | null
          description?: string | null
          id?: string
          name?: string
          objective?: string
          project_id?: string
          settings?: Json | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_default_funnel_id_fkey"
            columns: ["default_funnel_id"]
            isOneToOne: false
            referencedRelation: "funnel_spend"
            referencedColumns: ["funnel_id"]
          },
          {
            foreignKeyName: "surveys_default_funnel_id_fkey"
            columns: ["default_funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          contact_id: string | null
          created_at: string
          event_name: string
          external_dispatch_status: Json
          id: string
          parent_event_id: string | null
          payload: Json
          priority: number | null
          project_id: string
          session_id: string | null
          source: string
          triggered_events: string[] | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          event_name: string
          external_dispatch_status?: Json
          id?: string
          parent_event_id?: string | null
          payload?: Json
          priority?: number | null
          project_id: string
          session_id?: string | null
          source: string
          triggered_events?: string[] | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          event_name?: string
          external_dispatch_status?: Json
          id?: string
          parent_event_id?: string | null
          payload?: Json
          priority?: number | null
          project_id?: string
          session_id?: string | null
          source?: string
          triggered_events?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "system_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_social_insights"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "system_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "system_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_learnings: {
        Row: {
          affected_contacts_count: number | null
          applied_at: string | null
          category: string
          confidence: number | null
          created_at: string
          description: string
          evidence: Json | null
          id: string
          impact_score: number | null
          learning_type: string
          project_id: string
          status: string | null
          title: string
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          affected_contacts_count?: number | null
          applied_at?: string | null
          category: string
          confidence?: number | null
          created_at?: string
          description: string
          evidence?: Json | null
          id?: string
          impact_score?: number | null
          learning_type: string
          project_id: string
          status?: string | null
          title: string
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          affected_contacts_count?: number | null
          applied_at?: string | null
          category?: string
          confidence?: number | null
          created_at?: string
          description?: string
          evidence?: Json | null
          id?: string
          impact_score?: number | null
          learning_type?: string
          project_id?: string
          status?: string | null
          title?: string
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_learnings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          acceptance_method: string | null
          accepted_at: string
          created_at: string
          id: string
          ip_address: string | null
          scrolled_to_end: boolean | null
          terms_version: string
          time_spent_seconds: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acceptance_method?: string | null
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          scrolled_to_end?: boolean | null
          terms_version?: string
          time_spent_seconds?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acceptance_method?: string | null
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          scrolled_to_end?: boolean | null
          terms_version?: string
          time_spent_seconds?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      terms_versions: {
        Row: {
          content: string
          created_at: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          requires_reaccept: boolean | null
          title: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          requires_reaccept?: boolean | null
          title: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          requires_reaccept?: boolean | null
          title?: string
          version?: string
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
          visibility_mode: string | null
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
          visibility_mode?: string | null
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
          visibility_mode?: string | null
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
            isOneToOne: true
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
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
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
      financial_monthly: {
        Row: {
          ad_spend: number | null
          cpa: number | null
          gross_revenue: number | null
          month: string | null
          profit: number | null
          project_id: string | null
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
            foreignKeyName: "sales_core_events_project_id_fkey"
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
      funnel_summary: {
        Row: {
          first_sale_date: string | null
          funnel_id: string | null
          funnel_name: string | null
          funnel_type: string | null
          health_status: string | null
          last_sale_date: string | null
          overall_avg_ticket: number | null
          overall_chargeback_rate: number | null
          overall_cpa: number | null
          overall_refund_rate: number | null
          overall_roas: number | null
          project_id: string | null
          roas_target: number | null
          total_chargebacks: number | null
          total_confirmed_sales: number | null
          total_front_sales: number | null
          total_gross_revenue: number | null
          total_investment: number | null
          total_refunds: number | null
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
            foreignKeyName: "sales_core_events_project_id_fkey"
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
            foreignKeyName: "sales_core_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_monthly: {
        Row: {
          gross_revenue: number | null
          month: string | null
          project_id: string | null
          revenue: number | null
          transactions: number | null
          unique_buyers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_core_events_project_id_fkey"
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
      can_use_feature: {
        Args: { _feature_key: string; _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_create_project: { Args: { _user_id: string }; Returns: boolean }
      can_view_conversation: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      check_and_use_ai_quota: {
        Args: { p_items_count: number; p_project_id: string }
        Returns: Json
      }
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
        Returns: string
      }
      decrypt_sensitive: { Args: { p_encrypted_data: string }; Returns: string }
      encrypt_sensitive: { Args: { p_data: string }; Returns: string }
      get_contact_document: {
        Args: { p_contact_id: string; p_project_id: string }
        Returns: string
      }
      get_encryption_key: { Args: { p_key_name?: string }; Returns: string }
      get_funnel_metrics_daily_range: {
        Args: { p_end: string; p_funnel_id: string; p_start: string }
        Returns: {
          avg_ticket: number
          chargeback_rate: number
          chargebacks: number
          confirmed_sales: number
          cpa_real: number
          front_sales: number
          funnel_id: string
          gross_revenue: number
          investment: number
          metric_date: string
          net_revenue: number
          project_id: string
          refund_rate: number
          refunds: number
          roas: number
          unique_buyers: number
        }[]
      }
      get_funnel_summary_by_id: {
        Args: { p_funnel_id: string }
        Returns: {
          first_sale_date: string
          funnel_id: string
          funnel_name: string
          funnel_type: string
          health_status: string
          last_sale_date: string
          overall_avg_ticket: number
          overall_chargeback_rate: number
          overall_cpa: number
          overall_refund_rate: number
          overall_roas: number
          project_id: string
          roas_target: number
          total_chargebacks: number
          total_confirmed_sales: number
          total_front_sales: number
          total_gross_revenue: number
          total_investment: number
          total_refunds: number
        }[]
      }
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
      get_project_invite_public: {
        Args: { p_email: string; p_invite_id: string }
        Returns: Json
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
      has_area_permission:
        | {
            Args: {
              _area: string
              _min_level?: Database["public"]["Enums"]["permission_level"]
              _project_id: string
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _area: string
              _min_level?: string
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
      increment_lovable_credits: {
        Args: { p_count?: number; p_project_id: string }
        Returns: undefined
      }
      increment_openai_credits: {
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
      quiz_type:
        | "lead"
        | "qualification"
        | "funnel"
        | "onboarding"
        | "entertainment"
        | "viral"
        | "research"
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
      quiz_type: [
        "lead",
        "qualification",
        "funnel",
        "onboarding",
        "entertainment",
        "viral",
        "research",
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
    },
  },
} as const
