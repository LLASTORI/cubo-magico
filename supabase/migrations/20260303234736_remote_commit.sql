drop extension if exists "pg_cron";

drop extension if exists "pg_net";

create type "public"."connection_status" as enum ('active', 'paused', 'expired', 'error', 'disconnected');

create type "public"."feature_target_type" as enum ('project', 'user');

create type "public"."integration_auth_type" as enum ('oauth2', 'api_key', 'webhook_token', 'basic_auth', 'custom');

create type "public"."integration_category" as enum ('financial', 'acquisition', 'communication', 'ingestion');

create type "public"."quiz_status" as enum ('draft', 'published', 'archived');

create type "public"."sync_status" as enum ('started', 'running', 'completed', 'partial', 'failed', 'cancelled');

create type "public"."sync_trigger" as enum ('cron', 'manual', 'webhook', 'system');

create type "public"."sync_type" as enum ('webhook_ingest', 'api_full_sync', 'api_incremental', 'csv_import', 'token_refresh', 'health_check');

drop trigger if exists "trigger_update_contact_financial" on "public"."crm_transactions";

drop trigger if exists "update_experiments_updated_at" on "public"."funnel_experiments";

drop trigger if exists "update_optimization_suggestions_updated_at" on "public"."funnel_optimization_suggestions";

drop trigger if exists "trigger_derive_order_status" on "public"."ledger_events";

drop trigger if exists "validate_ledger_events_v21_trigger" on "public"."ledger_events";

drop trigger if exists "update_funnel_metrics_on_path_event" on "public"."path_events";

drop trigger if exists "trigger_ensure_owner_permissions" on "public"."project_members";

drop trigger if exists "trigger_handle_role_change_to_owner" on "public"."project_members";

drop trigger if exists "validate_quiz_slug" on "public"."quizzes";

drop trigger if exists "update_role_template_feature_permissions_updated_at" on "public"."role_template_feature_permissions";

drop trigger if exists "update_role_templates_updated_at" on "public"."role_templates";

drop trigger if exists "update_semantic_profiles_updated_at" on "public"."semantic_profiles";

drop trigger if exists "sync_project_max_members_trigger" on "public"."subscriptions";

drop trigger if exists "update_survey_ai_knowledge_base_updated_at" on "public"."survey_ai_knowledge_base";

drop trigger if exists "update_survey_insights_daily_updated_at" on "public"."survey_insights_daily";

drop trigger if exists "update_survey_questions_updated_at" on "public"."survey_questions";

drop trigger if exists "update_survey_response_analysis_updated_at" on "public"."survey_response_analysis";

drop trigger if exists "update_survey_webhook_keys_updated_at" on "public"."survey_webhook_keys";

drop trigger if exists "update_surveys_updated_at" on "public"."surveys";

drop trigger if exists "validate_survey_slug" on "public"."surveys";

drop trigger if exists "update_system_learnings_updated_at" on "public"."system_learnings";

drop trigger if exists "update_whatsapp_agents_updated_at" on "public"."whatsapp_agents";

drop trigger if exists "update_whatsapp_conversations_updated_at" on "public"."whatsapp_conversations";

drop trigger if exists "update_whatsapp_departments_updated_at" on "public"."whatsapp_departments";

drop trigger if exists "update_whatsapp_instances_updated_at" on "public"."whatsapp_instances";

drop trigger if exists "update_whatsapp_messages_updated_at" on "public"."whatsapp_messages";

drop trigger if exists "normalize_whatsapp_number" on "public"."whatsapp_numbers";

drop trigger if exists "update_whatsapp_numbers_updated_at" on "public"."whatsapp_numbers";

drop policy "Super admins can insert audit logs" on "public"."admin_audit_logs";

drop policy "Super admins can view audit logs" on "public"."admin_audit_logs";

drop policy "Super admins can manage notification settings" on "public"."admin_notification_settings";

drop policy "Super admins can view notification settings" on "public"."admin_notification_settings";

drop policy "Users can create decisions for their projects" on "public"."agent_decisions_log";

drop policy "Users can update decisions for their projects" on "public"."agent_decisions_log";

drop policy "Users can view decisions for their projects" on "public"."agent_decisions_log";

drop policy "Users can create agents for their projects" on "public"."ai_agents";

drop policy "Users can delete agents for their projects" on "public"."ai_agents";

drop policy "Users can update agents for their projects" on "public"."ai_agents";

drop policy "Users can view agents for their projects" on "public"."ai_agents";

drop policy "Managers and owners can manage ai knowledge base" on "public"."ai_knowledge_base";

drop policy "Members can view ai knowledge base" on "public"."ai_knowledge_base";

drop policy "Super admins can manage all ai knowledge base" on "public"."ai_knowledge_base";

drop policy "Membros podem ver quotas do projeto" on "public"."ai_project_quotas";

drop policy "Sistema pode gerenciar quotas" on "public"."ai_project_quotas";

drop policy "Membros podem ver tracking do projeto" on "public"."ai_usage_tracking";

drop policy "Sistema pode inserir tracking" on "public"."ai_usage_tracking";

drop policy "Managers and owners can manage automation executions" on "public"."automation_executions";

drop policy "Members can view automation executions" on "public"."automation_executions";

drop policy "Super admins can manage all automation executions" on "public"."automation_executions";

drop policy "Managers and owners can manage automation flow edges" on "public"."automation_flow_edges";

drop policy "Members can view automation flow edges" on "public"."automation_flow_edges";

drop policy "Super admins can manage all automation flow edges" on "public"."automation_flow_edges";

drop policy "Managers and owners can manage automation flow nodes" on "public"."automation_flow_nodes";

drop policy "Members can view automation flow nodes" on "public"."automation_flow_nodes";

drop policy "Super admins can manage all automation flow nodes" on "public"."automation_flow_nodes";

drop policy "Managers and owners can manage automation flows" on "public"."automation_flows";

drop policy "Members can view automation flows" on "public"."automation_flows";

drop policy "Super admins can manage all automation flows" on "public"."automation_flows";

drop policy "Managers and owners can manage automation folders" on "public"."automation_folders";

drop policy "Members can view automation folders" on "public"."automation_folders";

drop policy "Super admins can manage all automation folders" on "public"."automation_folders";

drop policy "Users can delete media from their projects" on "public"."automation_media";

drop policy "Users can upload media to their projects" on "public"."automation_media";

drop policy "Users can view media from their projects" on "public"."automation_media";

drop policy "Managers and owners can manage automation message templates" on "public"."automation_message_templates";

drop policy "Members can view automation message templates" on "public"."automation_message_templates";

drop policy "Super admins can manage all automation message templates" on "public"."automation_message_templates";

drop policy "Managers and owners can manage comment metrics" on "public"."comment_metrics_daily";

drop policy "Members can view comment metrics" on "public"."comment_metrics_daily";

drop policy "Super admins can manage all comment metrics" on "public"."comment_metrics_daily";

drop policy "Members can view contact identity events" on "public"."contact_identity_events";

drop policy "Members with crm edit permission can manage contact identity ev" on "public"."contact_identity_events";

drop policy "Super admins can manage all contact identity events" on "public"."contact_identity_events";

drop policy "Users can create memories for their project contacts" on "public"."contact_memory";

drop policy "Users can delete memories for their project contacts" on "public"."contact_memory";

drop policy "Users can update memories for their project contacts" on "public"."contact_memory";

drop policy "Users can view memories for their project contacts" on "public"."contact_memory";

drop policy "Users can create predictions for their projects" on "public"."contact_predictions";

drop policy "Users can delete predictions for their projects" on "public"."contact_predictions";

drop policy "Users can update predictions for their projects" on "public"."contact_predictions";

drop policy "Users can view predictions for their projects" on "public"."contact_predictions";

drop policy "Users can insert profile history for their projects" on "public"."contact_profile_history";

drop policy "Users can view profile history of their projects" on "public"."contact_profile_history";

drop policy "Users can delete contact profiles in their projects" on "public"."contact_profiles";

drop policy "Users can insert contact profiles for their projects" on "public"."contact_profiles";

drop policy "Users can update contact profiles in their projects" on "public"."contact_profiles";

drop policy "Users can view contact profiles of their projects" on "public"."contact_profiles";

drop policy "Managers and owners can insert crm activities" on "public"."crm_activities";

drop policy "Members can view crm activities" on "public"."crm_activities";

drop policy "Members with crm edit permission can manage crm activities" on "public"."crm_activities";

drop policy "Super admins can manage all crm activities" on "public"."crm_activities";

drop policy "Members can view activities" on "public"."crm_activities_tasks";

drop policy "Members with crm edit permission can manage activities tasks" on "public"."crm_activities_tasks";

drop policy "Super admins can manage all activities" on "public"."crm_activities_tasks";

drop policy "Members can view cadence steps" on "public"."crm_cadence_steps";

drop policy "Members with crm edit permission can manage cadence steps" on "public"."crm_cadence_steps";

drop policy "Super admins can manage all cadence steps" on "public"."crm_cadence_steps";

drop policy "Members can view cadences" on "public"."crm_cadences";

drop policy "Members with crm edit permission can manage cadences" on "public"."crm_cadences";

drop policy "Super admins can manage all cadences" on "public"."crm_cadences";

drop policy "Members can view contact cadences" on "public"."crm_contact_cadences";

drop policy "Members with crm edit permission can manage contact cadences" on "public"."crm_contact_cadences";

drop policy "Super admins can manage all contact cadences" on "public"."crm_contact_cadences";

drop policy "Managers and owners can delete contact interactions" on "public"."crm_contact_interactions";

drop policy "Managers and owners can insert contact interactions" on "public"."crm_contact_interactions";

drop policy "Managers and owners can update contact interactions" on "public"."crm_contact_interactions";

drop policy "Members can view contact interactions" on "public"."crm_contact_interactions";

drop policy "Members with crm edit permission can manage contact interaction" on "public"."crm_contact_interactions";

drop policy "Super admins can manage all contact interactions" on "public"."crm_contact_interactions";

drop policy "Managers and owners can delete crm contacts" on "public"."crm_contacts";

drop policy "Managers and owners can insert crm contacts" on "public"."crm_contacts";

drop policy "Managers and owners can update crm contacts" on "public"."crm_contacts";

drop policy "Members can view crm contacts" on "public"."crm_contacts";

drop policy "Members with crm edit permission can manage contacts" on "public"."crm_contacts";

drop policy "Super admins can manage all crm contacts" on "public"."crm_contacts";

drop policy "Members can view pipeline stages" on "public"."crm_pipeline_stages";

drop policy "Members with crm edit permission can manage pipeline stages" on "public"."crm_pipeline_stages";

drop policy "Super admins can manage all pipeline stages" on "public"."crm_pipeline_stages";

drop policy "Members can view recovery activities" on "public"."crm_recovery_activities";

drop policy "Members with crm edit permission can manage recovery activities" on "public"."crm_recovery_activities";

drop policy "Super admins can manage all recovery activities" on "public"."crm_recovery_activities";

drop policy "Members can view recovery stages" on "public"."crm_recovery_stages";

drop policy "Members with crm edit permission can manage recovery stages" on "public"."crm_recovery_stages";

drop policy "Super admins can manage all recovery stages" on "public"."crm_recovery_stages";

drop policy "Managers and owners can delete crm transactions" on "public"."crm_transactions";

drop policy "Managers and owners can insert crm transactions" on "public"."crm_transactions";

drop policy "Managers and owners can update crm transactions" on "public"."crm_transactions";

drop policy "Members can view crm transactions" on "public"."crm_transactions";

drop policy "Members with crm edit permission can manage transactions" on "public"."crm_transactions";

drop policy "Super admins can manage all crm transactions" on "public"."crm_transactions";

drop policy "Managers and owners can manage webhook keys" on "public"."crm_webhook_keys";

drop policy "Members can view webhook keys" on "public"."crm_webhook_keys";

drop policy "Super admins can manage all webhook keys" on "public"."crm_webhook_keys";

drop policy "Users can insert economic_days for their projects" on "public"."economic_days";

drop policy "Users can update economic_days for their projects" on "public"."economic_days";

drop policy "Users can view economic_days for their projects" on "public"."economic_days";

drop policy "Only super admins can manage encryption keys" on "public"."encryption_keys";

drop policy "Users can manage dispatch rules for their projects" on "public"."event_dispatch_rules";

drop policy "Users can view dispatch rules for their projects" on "public"."event_dispatch_rules";

drop policy "Anyone can view system templates" on "public"."experience_templates";

drop policy "Managers and owners can manage project templates" on "public"."experience_templates";

drop policy "Members can view templates for their projects" on "public"."experience_templates";

drop policy "Super admins can manage all templates" on "public"."experience_templates";

drop policy "Managers and owners can manage themes" on "public"."experience_themes";

drop policy "Members can view themes for their projects" on "public"."experience_themes";

drop policy "Super admins can manage all themes" on "public"."experience_themes";

drop policy "Super admins can manage all overrides" on "public"."feature_overrides";

drop policy "Users can view own overrides" on "public"."feature_overrides";

drop policy "Anyone can view features" on "public"."features";

drop policy "Super admins can manage features" on "public"."features";

drop policy "Project owners can delete ledger entries" on "public"."finance_ledger";

drop policy "System can insert ledger entries" on "public"."finance_ledger";

drop policy "Users can view their project ledger entries" on "public"."finance_ledger";

drop policy "System can manage sync runs" on "public"."finance_sync_runs";

drop policy "Users can view their project sync runs" on "public"."finance_sync_runs";

drop policy "Managers and owners can delete funnel changes" on "public"."funnel_changes";

drop policy "Managers and owners can insert funnel changes" on "public"."funnel_changes";

drop policy "Managers and owners can update funnel changes" on "public"."funnel_changes";

drop policy "Members can view funnel changes" on "public"."funnel_changes";

drop policy "Super admins can manage all funnel changes" on "public"."funnel_changes";

drop policy "Super admins can view all funnel changes" on "public"."funnel_changes";

drop policy "Users can manage experiments for their projects" on "public"."funnel_experiments";

drop policy "Users can view experiments for their projects" on "public"."funnel_experiments";

drop policy "Managers and owners can manage funnel meta accounts" on "public"."funnel_meta_accounts";

drop policy "Members can view funnel meta accounts" on "public"."funnel_meta_accounts";

drop policy "Super admins can manage all funnel meta accounts" on "public"."funnel_meta_accounts";

drop policy "Super admins can view all funnel meta accounts" on "public"."funnel_meta_accounts";

drop policy "Users can manage optimization suggestions for their projects" on "public"."funnel_optimization_suggestions";

drop policy "Users can view optimization suggestions for their projects" on "public"."funnel_optimization_suggestions";

drop policy "Users can manage funnel performance for their projects" on "public"."funnel_performance";

drop policy "Users can view funnel performance for their projects" on "public"."funnel_performance";

drop policy "Users can manage thresholds for their projects" on "public"."funnel_thresholds";

drop policy "Users can view thresholds for their projects" on "public"."funnel_thresholds";

drop policy "Members can manage funnels" on "public"."funnels";

drop policy "Super admins can manage all funnels" on "public"."funnels";

drop policy "Super admins can view all funnels" on "public"."funnels";

drop policy "Users can create backfill runs for their projects" on "public"."hotmart_backfill_runs";

drop policy "Users can update backfill runs for their projects" on "public"."hotmart_backfill_runs";

drop policy "Users can view backfill runs for their projects" on "public"."hotmart_backfill_runs";

drop policy "Super admins can manage hotmart product plans" on "public"."hotmart_product_plans";

drop policy "Super admins can view hotmart product plans" on "public"."hotmart_product_plans";

drop policy "Managers and owners can manage sales" on "public"."hotmart_sales";

drop policy "Members can view project sales" on "public"."hotmart_sales";

drop policy "Super admins can manage all sales" on "public"."hotmart_sales";

drop policy "Super admins can view all sales" on "public"."hotmart_sales";

drop policy "Managers and owners can manage launch phases" on "public"."launch_phases";

drop policy "Members can view launch phases" on "public"."launch_phases";

drop policy "Super admins can manage all launch phases" on "public"."launch_phases";

drop policy "Managers and owners can manage launch products" on "public"."launch_products";

drop policy "Members can view launch products" on "public"."launch_products";

drop policy "Super admins can manage all launch products" on "public"."launch_products";

drop policy "Users can insert ledger_events in their projects" on "public"."ledger_events";

drop policy "Users can view ledger_events from their projects" on "public"."ledger_events";

drop policy "Managers and owners can insert import batches" on "public"."ledger_import_batches";

drop policy "Members can view import batches" on "public"."ledger_import_batches";

drop policy "Super admins can manage all import batches" on "public"."ledger_import_batches";

drop policy "Managers and owners can insert ledger_official" on "public"."ledger_official";

drop policy "Managers and owners can update ledger_official" on "public"."ledger_official";

drop policy "Members can view ledger_official" on "public"."ledger_official";

drop policy "Super admins can manage all ledger_official" on "public"."ledger_official";

drop policy "Managers and owners can manage meta ad accounts" on "public"."meta_ad_accounts";

drop policy "Members can view meta ad accounts" on "public"."meta_ad_accounts";

drop policy "Super admins can manage all meta ad accounts" on "public"."meta_ad_accounts";

drop policy "Super admins can view all meta ad accounts" on "public"."meta_ad_accounts";

drop policy "Managers and owners can manage meta audiences" on "public"."meta_ad_audiences";

drop policy "Members can view meta audiences" on "public"."meta_ad_audiences";

drop policy "Super admins can manage all meta audiences" on "public"."meta_ad_audiences";

drop policy "Managers and owners can manage meta ads" on "public"."meta_ads";

drop policy "Members can view meta ads" on "public"."meta_ads";

drop policy "Super admins can manage all meta ads" on "public"."meta_ads";

drop policy "Super admins can view all meta ads" on "public"."meta_ads";

drop policy "Managers and owners can manage meta adsets" on "public"."meta_adsets";

drop policy "Members can view meta adsets" on "public"."meta_adsets";

drop policy "Super admins can manage all meta adsets" on "public"."meta_adsets";

drop policy "Super admins can view all meta adsets" on "public"."meta_adsets";

drop policy "Managers and owners can manage audience contacts" on "public"."meta_audience_contacts";

drop policy "Members can view audience contacts" on "public"."meta_audience_contacts";

drop policy "Super admins can manage all audience contacts" on "public"."meta_audience_contacts";

drop policy "Managers and owners can manage sync logs" on "public"."meta_audience_sync_logs";

drop policy "Members can view sync logs" on "public"."meta_audience_sync_logs";

drop policy "Super admins can manage all sync logs" on "public"."meta_audience_sync_logs";

drop policy "Managers and owners can manage meta campaigns" on "public"."meta_campaigns";

drop policy "Members can view meta campaigns" on "public"."meta_campaigns";

drop policy "Super admins can manage all meta campaigns" on "public"."meta_campaigns";

drop policy "Super admins can view all meta campaigns" on "public"."meta_campaigns";

drop policy "Super admins can view all meta credentials" on "public"."meta_credentials";

drop policy "Managers and owners can manage meta insights" on "public"."meta_insights";

drop policy "Members can view meta insights" on "public"."meta_insights";

drop policy "Super admins can manage all meta insights" on "public"."meta_insights";

drop policy "Super admins can view all meta insights" on "public"."meta_insights";

drop policy "Managers and owners can manage lookalike audiences" on "public"."meta_lookalike_audiences";

drop policy "Members can view lookalike audiences" on "public"."meta_lookalike_audiences";

drop policy "Super admins can manage all lookalike audiences" on "public"."meta_lookalike_audiences";

drop policy "Anyone can view metric definitions" on "public"."metric_definitions";

drop policy "System can insert notifications" on "public"."notifications";

drop policy "Users can delete own notifications" on "public"."notifications";

drop policy "Users can update own notifications" on "public"."notifications";

drop policy "Users can view own notifications" on "public"."notifications";

drop policy "Managers and owners can delete offer mappings" on "public"."offer_mappings";

drop policy "Managers and owners can insert offer mappings" on "public"."offer_mappings";

drop policy "Managers and owners can update offer mappings" on "public"."offer_mappings";

drop policy "Members can view offer mappings" on "public"."offer_mappings";

drop policy "Super admins can manage all offer mappings" on "public"."offer_mappings";

drop policy "Super admins can view all offer mappings" on "public"."offer_mappings";

drop policy "Users can insert order_items in their orders" on "public"."order_items";

drop policy "Users can view order_items from their orders" on "public"."order_items";

drop policy "Users can insert orders in their projects" on "public"."orders";

drop policy "Users can update orders in their projects" on "public"."orders";

drop policy "Users can view orders from their projects" on "public"."orders";

drop policy "Users can insert path events for their projects" on "public"."path_events";

drop policy "Users can view path events for their projects" on "public"."path_events";

drop policy "Users can create contexts for their projects" on "public"."personalization_contexts";

drop policy "Users can delete contexts for their projects" on "public"."personalization_contexts";

drop policy "Users can update contexts for their projects" on "public"."personalization_contexts";

drop policy "Users can view contexts for their projects" on "public"."personalization_contexts";

drop policy "Users can create logs for their projects" on "public"."personalization_logs";

drop policy "Users can view logs for their projects" on "public"."personalization_logs";

drop policy "Managers and owners can manage phase campaigns" on "public"."phase_campaigns";

drop policy "Members can view phase campaigns" on "public"."phase_campaigns";

drop policy "Super admins can manage all phase campaigns" on "public"."phase_campaigns";

drop policy "Anyone can view plan features" on "public"."plan_features";

drop policy "Super admins can manage plan features" on "public"."plan_features";

drop policy "Anyone can view active plans" on "public"."plans";

drop policy "Super admins can manage plans" on "public"."plans";

drop policy "Users can manage their project splits" on "public"."product_revenue_splits";

drop policy "Users can view their project splits" on "public"."product_revenue_splits";

drop policy "Super admins can update all profiles" on "public"."profiles";

drop policy "Super admins can view all profiles" on "public"."profiles";

drop policy "Managers and owners can manage credentials" on "public"."project_credentials";

drop policy "Members can view credentials" on "public"."project_credentials";

drop policy "Super admins can manage all project credentials" on "public"."project_credentials";

drop policy "Super admins can view all project credentials" on "public"."project_credentials";

drop policy "Manager can create operator invites" on "public"."project_invites";

drop policy "Members can view project invites" on "public"."project_invites";

drop policy "Owner can manage all invites" on "public"."project_invites";

drop policy "Users can respond to their invites" on "public"."project_invites";

drop policy "Users can view invites sent to them" on "public"."project_invites";

drop policy "Project owners can manage member feature permissions" on "public"."project_member_feature_permissions";

drop policy "Super admins can manage feature permissions" on "public"."project_member_feature_permissions";

drop policy "Users can read own feature permissions" on "public"."project_member_feature_permissions";

drop policy "Members can view their own permissions" on "public"."project_member_permissions";

drop policy "Owners can manage all permissions" on "public"."project_member_permissions";

drop policy "Super admins can manage all permissions" on "public"."project_member_permissions";

drop policy "Manager can remove operators" on "public"."project_members";

drop policy "Members can leave project (except owner)" on "public"."project_members";

drop policy "Members can view project members" on "public"."project_members";

drop policy "Owner can manage all members" on "public"."project_members";

drop policy "Super admins can manage all project members" on "public"."project_members";

drop policy "Super admins can view all project members" on "public"."project_members";

drop policy "Users can join via invite" on "public"."project_members";

drop policy "Managers and owners can manage modules" on "public"."project_modules";

drop policy "Members can view project modules" on "public"."project_modules";

drop policy "Only super admins can manage modules" on "public"."project_modules";

drop policy "Super admins can manage all modules" on "public"."project_modules";

drop policy "Users can insert settings for their own projects" on "public"."project_settings";

drop policy "Users can update settings for their own projects" on "public"."project_settings";

drop policy "Users can view settings for their projects" on "public"."project_settings";

drop policy "Users can manage tracking settings for their projects" on "public"."project_tracking_settings";

drop policy "Users can view tracking settings for their projects" on "public"."project_tracking_settings";

drop policy "Super admins can delete all projects" on "public"."projects";

drop policy "Super admins can update all projects" on "public"."projects";

drop policy "Super admins can view all projects" on "public"."projects";

drop policy "Users can create own projects" on "public"."projects";

drop policy "Users can delete own projects" on "public"."projects";

drop policy "Users can update own projects" on "public"."projects";

drop policy "Users can view accessible projects" on "public"."projects";

drop policy "Users can insert provider_event_log for their projects" on "public"."provider_event_log";

drop policy "Users can update provider_event_log for their projects" on "public"."provider_event_log";

drop policy "Users can view provider_event_log for their projects" on "public"."provider_event_log";

drop policy "Users can insert provider_order_map in their projects" on "public"."provider_order_map";

drop policy "Users can view provider_order_map from their projects" on "public"."provider_order_map";

drop policy "Managers and owners can manage quiz answers" on "public"."quiz_answers";

drop policy "Members can view quiz answers" on "public"."quiz_answers";

drop policy "Public can create quiz answers" on "public"."quiz_answers";

drop policy "Super admins can manage all quiz answers" on "public"."quiz_answers";

drop policy "Managers and owners can manage quiz events" on "public"."quiz_events";

drop policy "Members can view quiz events" on "public"."quiz_events";

drop policy "Public can create quiz events" on "public"."quiz_events";

drop policy "Super admins can manage all quiz events" on "public"."quiz_events";

drop policy "Managers and owners can manage quiz options" on "public"."quiz_options";

drop policy "Members can view quiz options" on "public"."quiz_options";

drop policy "Public can view options of active quizzes" on "public"."quiz_options";

drop policy "Super admins can manage all quiz options" on "public"."quiz_options";

drop policy "Quiz outcome logs are insertable by project members" on "public"."quiz_outcome_logs";

drop policy "Quiz outcome logs are viewable by project members" on "public"."quiz_outcome_logs";

drop policy "Quiz outcomes are manageable by project members" on "public"."quiz_outcomes";

drop policy "Quiz outcomes are viewable by project members" on "public"."quiz_outcomes";

drop policy "Managers and owners can manage quiz conditions" on "public"."quiz_question_conditions";

drop policy "Public can view conditions of active quizzes" on "public"."quiz_question_conditions";

drop policy "Super admins can manage all quiz conditions" on "public"."quiz_question_conditions";

drop policy "Managers and owners can manage quiz questions" on "public"."quiz_questions";

drop policy "Members can view quiz questions" on "public"."quiz_questions";

drop policy "Public can view questions of active quizzes" on "public"."quiz_questions";

drop policy "Super admins can manage all quiz questions" on "public"."quiz_questions";

drop policy "Managers and owners can manage quiz results" on "public"."quiz_results";

drop policy "Members can view quiz results" on "public"."quiz_results";

drop policy "Public can create quiz results" on "public"."quiz_results";

drop policy "Super admins can manage all quiz results" on "public"."quiz_results";

drop policy "Managers and owners can manage quiz sessions" on "public"."quiz_sessions";

drop policy "Members can view quiz sessions" on "public"."quiz_sessions";

drop policy "Public can create quiz sessions" on "public"."quiz_sessions";

drop policy "Public can update quiz sessions" on "public"."quiz_sessions";

drop policy "Super admins can manage all quiz sessions" on "public"."quiz_sessions";

drop policy "Managers and owners can manage quizzes" on "public"."quizzes";

drop policy "Members can view quizzes" on "public"."quizzes";

drop policy "Public can view active quizzes" on "public"."quizzes";

drop policy "Super admins can manage all quizzes" on "public"."quizzes";

drop policy "Users can create recommendation logs for their projects" on "public"."recommendation_logs";

drop policy "Users can update recommendation logs for their projects" on "public"."recommendation_logs";

drop policy "Users can view recommendation logs for their projects" on "public"."recommendation_logs";

drop policy "Members can read accessible template permissions" on "public"."role_template_feature_permissions";

drop policy "Project owners can manage custom template permissions" on "public"."role_template_feature_permissions";

drop policy "Super admins can manage feature permissions" on "public"."role_template_feature_permissions";

drop policy "Managers can manage project templates" on "public"."role_templates";

drop policy "Project members can view project templates" on "public"."role_templates";

drop policy "Super admins can manage system templates" on "public"."role_templates";

drop policy "Users can view system templates" on "public"."role_templates";

drop policy "Users can insert sales_core_events for their projects" on "public"."sales_core_events";

drop policy "Users can update sales_core_events for their projects" on "public"."sales_core_events";

drop policy "Users can view sales_core_events for their projects" on "public"."sales_core_events";

drop policy "Users can insert import batches into their projects" on "public"."sales_history_import_batches";

drop policy "Users can update import batches in their projects" on "public"."sales_history_import_batches";

drop policy "Users can view import batches from their projects" on "public"."sales_history_import_batches";

drop policy "Users can insert sales history into their projects" on "public"."sales_history_orders";

drop policy "Users can view sales history from their projects" on "public"."sales_history_orders";

drop policy "Users can delete semantic_profiles for their projects" on "public"."semantic_profiles";

drop policy "Users can insert semantic_profiles for their projects" on "public"."semantic_profiles";

drop policy "Users can update semantic_profiles for their projects" on "public"."semantic_profiles";

drop policy "Users can view semantic_profiles for their projects" on "public"."semantic_profiles";

drop policy "Members can view social comments" on "public"."social_comments";

drop policy "Members with social_listening edit permission can manage social" on "public"."social_comments";

drop policy "Super admins can manage all social comments" on "public"."social_comments";

drop policy "Members with social_listening edit permission can manage social" on "public"."social_listening_pages";

drop policy "Users can manage their project's social listening pages" on "public"."social_listening_pages";

drop policy "Users can view their project's social listening pages" on "public"."social_listening_pages";

drop policy "Managers and owners can manage sync logs" on "public"."social_listening_sync_logs";

drop policy "Members can view sync logs" on "public"."social_listening_sync_logs";

drop policy "Members with social_listening edit permission can manage social" on "public"."social_listening_sync_logs";

drop policy "Super admins can manage all sync logs" on "public"."social_listening_sync_logs";

drop policy "Members can view social posts" on "public"."social_posts";

drop policy "Members with social_listening edit permission can manage social" on "public"."social_posts";

drop policy "Super admins can manage all social posts" on "public"."social_posts";

drop policy "Users can insert spend_core_events for their projects" on "public"."spend_core_events";

drop policy "Users can update spend_core_events for their projects" on "public"."spend_core_events";

drop policy "Users can view spend_core_events for their projects" on "public"."spend_core_events";

drop policy "Super admins can manage subscriptions" on "public"."subscriptions";

drop policy "Super admins can view all subscriptions" on "public"."subscriptions";

drop policy "Users can view own subscription" on "public"."subscriptions";

drop policy "Members with pesquisas edit permission can manage survey ai kno" on "public"."survey_ai_knowledge_base";

drop policy "Users can delete survey AI knowledge base for their projects" on "public"."survey_ai_knowledge_base";

drop policy "Users can insert survey AI knowledge base for their projects" on "public"."survey_ai_knowledge_base";

drop policy "Users can update survey AI knowledge base for their projects" on "public"."survey_ai_knowledge_base";

drop policy "Users can view survey AI knowledge base for their projects" on "public"."survey_ai_knowledge_base";

drop policy "Users can delete survey insights for their projects" on "public"."survey_insights_daily";

drop policy "Users can insert survey insights for their projects" on "public"."survey_insights_daily";

drop policy "Users can update survey insights for their projects" on "public"."survey_insights_daily";

drop policy "Users can view survey insights for their projects" on "public"."survey_insights_daily";

drop policy "Members can view survey questions" on "public"."survey_questions";

drop policy "Members with edit permission can manage survey questions" on "public"."survey_questions";

drop policy "Super admins can manage all survey questions" on "public"."survey_questions";

drop policy "Users can delete survey response analysis for their projects" on "public"."survey_response_analysis";

drop policy "Users can insert survey response analysis for their projects" on "public"."survey_response_analysis";

drop policy "Users can update survey response analysis for their projects" on "public"."survey_response_analysis";

drop policy "Users can view survey response analysis for their projects" on "public"."survey_response_analysis";

drop policy "Members can view survey responses" on "public"."survey_responses";

drop policy "Members with pesquisas edit permission can manage survey respon" on "public"."survey_responses";

drop policy "Super admins can manage all survey responses" on "public"."survey_responses";

drop policy "Managers and owners can manage survey webhook keys" on "public"."survey_webhook_keys";

drop policy "Members can view survey webhook keys" on "public"."survey_webhook_keys";

drop policy "Super admins can manage all survey webhook keys" on "public"."survey_webhook_keys";

drop policy "Members can view surveys" on "public"."surveys";

drop policy "Members with edit permission can manage surveys" on "public"."surveys";

drop policy "Super admins can manage all surveys" on "public"."surveys";

drop policy "System can insert events" on "public"."system_events";

drop policy "Users can view system events for their projects" on "public"."system_events";

drop policy "Users can insert system learnings for their projects" on "public"."system_learnings";

drop policy "Users can update system learnings for their projects" on "public"."system_learnings";

drop policy "Users can view system learnings for their projects" on "public"."system_learnings";

drop policy "Super admins can view all acceptances" on "public"."terms_acceptances";

drop policy "Users can insert own acceptance" on "public"."terms_acceptances";

drop policy "Users can view own acceptances" on "public"."terms_acceptances";

drop policy "Apenas admins podem gerenciar termos" on "public"."terms_versions";

drop policy "Termos são públicos para leitura" on "public"."terms_versions";

drop policy "Super admins can view all activity logs" on "public"."user_activity_logs";

drop policy "Users can insert own activity logs" on "public"."user_activity_logs";

drop policy "Super admins can manage user roles" on "public"."user_roles";

drop policy "Super admins can view all user roles" on "public"."user_roles";

drop policy "Users can view own roles" on "public"."user_roles";

drop policy "Members can view project webhook metrics" on "public"."webhook_metrics";

drop policy "Service role can insert webhook metrics" on "public"."webhook_metrics";

drop policy "Super admins can view all webhook metrics" on "public"."webhook_metrics";

drop policy "Managers and owners can manage agent departments" on "public"."whatsapp_agent_departments";

drop policy "Members can view agent departments" on "public"."whatsapp_agent_departments";

drop policy "Super admins can manage all agent departments" on "public"."whatsapp_agent_departments";

drop policy "Agents can update own status" on "public"."whatsapp_agents";

drop policy "Managers and owners can manage agents" on "public"."whatsapp_agents";

drop policy "Members can view agents" on "public"."whatsapp_agents";

drop policy "Super admins can manage all agents" on "public"."whatsapp_agents";

drop policy "Managers can delete conversations" on "public"."whatsapp_conversations";

drop policy "Members can manage whatsapp conversations" on "public"."whatsapp_conversations";

drop policy "Members can view whatsapp conversations" on "public"."whatsapp_conversations";

drop policy "Project members can insert conversations" on "public"."whatsapp_conversations";

drop policy "Project members can update visible conversations" on "public"."whatsapp_conversations";

drop policy "Project members can view conversations based on visibility" on "public"."whatsapp_conversations";

drop policy "Super admins can manage all whatsapp conversations" on "public"."whatsapp_conversations";

drop policy "Managers and owners can manage departments" on "public"."whatsapp_departments";

drop policy "Members can view departments" on "public"."whatsapp_departments";

drop policy "Super admins can manage all departments" on "public"."whatsapp_departments";

drop policy "Managers and owners can manage whatsapp instances" on "public"."whatsapp_instances";

drop policy "Members can view whatsapp instances" on "public"."whatsapp_instances";

drop policy "Super admins can manage all whatsapp instances" on "public"."whatsapp_instances";

drop policy "Members can insert whatsapp messages" on "public"."whatsapp_messages";

drop policy "Members can update whatsapp messages" on "public"."whatsapp_messages";

drop policy "Members can view whatsapp messages" on "public"."whatsapp_messages";

drop policy "Super admins can manage all whatsapp messages" on "public"."whatsapp_messages";

drop policy "Managers and owners can manage whatsapp numbers" on "public"."whatsapp_numbers";

drop policy "Members can view whatsapp numbers" on "public"."whatsapp_numbers";

drop policy "Super admins can manage all whatsapp numbers" on "public"."whatsapp_numbers";

drop policy "Admins can update all profiles" on "public"."profiles";

drop policy "Admins can view all profiles" on "public"."profiles";

drop policy "Users can update own profile" on "public"."profiles";

drop policy "Users can view own profile" on "public"."profiles";

revoke delete on table "public"."funnel_optimization_suggestions" from "anon";

revoke insert on table "public"."funnel_optimization_suggestions" from "anon";

revoke references on table "public"."funnel_optimization_suggestions" from "anon";

revoke select on table "public"."funnel_optimization_suggestions" from "anon";

revoke trigger on table "public"."funnel_optimization_suggestions" from "anon";

revoke truncate on table "public"."funnel_optimization_suggestions" from "anon";

revoke update on table "public"."funnel_optimization_suggestions" from "anon";

revoke delete on table "public"."funnel_optimization_suggestions" from "authenticated";

revoke insert on table "public"."funnel_optimization_suggestions" from "authenticated";

revoke references on table "public"."funnel_optimization_suggestions" from "authenticated";

revoke select on table "public"."funnel_optimization_suggestions" from "authenticated";

revoke trigger on table "public"."funnel_optimization_suggestions" from "authenticated";

revoke truncate on table "public"."funnel_optimization_suggestions" from "authenticated";

revoke update on table "public"."funnel_optimization_suggestions" from "authenticated";

revoke delete on table "public"."funnel_optimization_suggestions" from "service_role";

revoke insert on table "public"."funnel_optimization_suggestions" from "service_role";

revoke references on table "public"."funnel_optimization_suggestions" from "service_role";

revoke select on table "public"."funnel_optimization_suggestions" from "service_role";

revoke trigger on table "public"."funnel_optimization_suggestions" from "service_role";

revoke truncate on table "public"."funnel_optimization_suggestions" from "service_role";

revoke update on table "public"."funnel_optimization_suggestions" from "service_role";

revoke delete on table "public"."funnel_performance" from "anon";

revoke insert on table "public"."funnel_performance" from "anon";

revoke references on table "public"."funnel_performance" from "anon";

revoke select on table "public"."funnel_performance" from "anon";

revoke trigger on table "public"."funnel_performance" from "anon";

revoke truncate on table "public"."funnel_performance" from "anon";

revoke update on table "public"."funnel_performance" from "anon";

revoke delete on table "public"."funnel_performance" from "authenticated";

revoke insert on table "public"."funnel_performance" from "authenticated";

revoke references on table "public"."funnel_performance" from "authenticated";

revoke select on table "public"."funnel_performance" from "authenticated";

revoke trigger on table "public"."funnel_performance" from "authenticated";

revoke truncate on table "public"."funnel_performance" from "authenticated";

revoke update on table "public"."funnel_performance" from "authenticated";

revoke delete on table "public"."funnel_performance" from "service_role";

revoke insert on table "public"."funnel_performance" from "service_role";

revoke references on table "public"."funnel_performance" from "service_role";

revoke select on table "public"."funnel_performance" from "service_role";

revoke trigger on table "public"."funnel_performance" from "service_role";

revoke truncate on table "public"."funnel_performance" from "service_role";

revoke update on table "public"."funnel_performance" from "service_role";

revoke delete on table "public"."role_template_feature_permissions" from "anon";

revoke insert on table "public"."role_template_feature_permissions" from "anon";

revoke references on table "public"."role_template_feature_permissions" from "anon";

revoke select on table "public"."role_template_feature_permissions" from "anon";

revoke trigger on table "public"."role_template_feature_permissions" from "anon";

revoke truncate on table "public"."role_template_feature_permissions" from "anon";

revoke update on table "public"."role_template_feature_permissions" from "anon";

revoke delete on table "public"."role_template_feature_permissions" from "authenticated";

revoke insert on table "public"."role_template_feature_permissions" from "authenticated";

revoke references on table "public"."role_template_feature_permissions" from "authenticated";

revoke select on table "public"."role_template_feature_permissions" from "authenticated";

revoke trigger on table "public"."role_template_feature_permissions" from "authenticated";

revoke truncate on table "public"."role_template_feature_permissions" from "authenticated";

revoke update on table "public"."role_template_feature_permissions" from "authenticated";

revoke delete on table "public"."role_template_feature_permissions" from "service_role";

revoke insert on table "public"."role_template_feature_permissions" from "service_role";

revoke references on table "public"."role_template_feature_permissions" from "service_role";

revoke select on table "public"."role_template_feature_permissions" from "service_role";

revoke trigger on table "public"."role_template_feature_permissions" from "service_role";

revoke truncate on table "public"."role_template_feature_permissions" from "service_role";

revoke update on table "public"."role_template_feature_permissions" from "service_role";

revoke delete on table "public"."sales_history_import_batches" from "anon";

revoke insert on table "public"."sales_history_import_batches" from "anon";

revoke references on table "public"."sales_history_import_batches" from "anon";

revoke select on table "public"."sales_history_import_batches" from "anon";

revoke trigger on table "public"."sales_history_import_batches" from "anon";

revoke truncate on table "public"."sales_history_import_batches" from "anon";

revoke update on table "public"."sales_history_import_batches" from "anon";

revoke delete on table "public"."sales_history_import_batches" from "authenticated";

revoke insert on table "public"."sales_history_import_batches" from "authenticated";

revoke references on table "public"."sales_history_import_batches" from "authenticated";

revoke select on table "public"."sales_history_import_batches" from "authenticated";

revoke trigger on table "public"."sales_history_import_batches" from "authenticated";

revoke truncate on table "public"."sales_history_import_batches" from "authenticated";

revoke update on table "public"."sales_history_import_batches" from "authenticated";

revoke delete on table "public"."sales_history_import_batches" from "service_role";

revoke insert on table "public"."sales_history_import_batches" from "service_role";

revoke references on table "public"."sales_history_import_batches" from "service_role";

revoke select on table "public"."sales_history_import_batches" from "service_role";

revoke trigger on table "public"."sales_history_import_batches" from "service_role";

revoke truncate on table "public"."sales_history_import_batches" from "service_role";

revoke update on table "public"."sales_history_import_batches" from "service_role";

revoke delete on table "public"."semantic_profiles" from "anon";

revoke insert on table "public"."semantic_profiles" from "anon";

revoke references on table "public"."semantic_profiles" from "anon";

revoke select on table "public"."semantic_profiles" from "anon";

revoke trigger on table "public"."semantic_profiles" from "anon";

revoke truncate on table "public"."semantic_profiles" from "anon";

revoke update on table "public"."semantic_profiles" from "anon";

revoke delete on table "public"."semantic_profiles" from "authenticated";

revoke insert on table "public"."semantic_profiles" from "authenticated";

revoke references on table "public"."semantic_profiles" from "authenticated";

revoke select on table "public"."semantic_profiles" from "authenticated";

revoke trigger on table "public"."semantic_profiles" from "authenticated";

revoke truncate on table "public"."semantic_profiles" from "authenticated";

revoke update on table "public"."semantic_profiles" from "authenticated";

revoke delete on table "public"."semantic_profiles" from "service_role";

revoke insert on table "public"."semantic_profiles" from "service_role";

revoke references on table "public"."semantic_profiles" from "service_role";

revoke select on table "public"."semantic_profiles" from "service_role";

revoke trigger on table "public"."semantic_profiles" from "service_role";

revoke truncate on table "public"."semantic_profiles" from "service_role";

revoke update on table "public"."semantic_profiles" from "service_role";

revoke delete on table "public"."social_listening_sync_logs" from "anon";

revoke insert on table "public"."social_listening_sync_logs" from "anon";

revoke references on table "public"."social_listening_sync_logs" from "anon";

revoke select on table "public"."social_listening_sync_logs" from "anon";

revoke trigger on table "public"."social_listening_sync_logs" from "anon";

revoke truncate on table "public"."social_listening_sync_logs" from "anon";

revoke update on table "public"."social_listening_sync_logs" from "anon";

revoke delete on table "public"."social_listening_sync_logs" from "authenticated";

revoke insert on table "public"."social_listening_sync_logs" from "authenticated";

revoke references on table "public"."social_listening_sync_logs" from "authenticated";

revoke select on table "public"."social_listening_sync_logs" from "authenticated";

revoke trigger on table "public"."social_listening_sync_logs" from "authenticated";

revoke truncate on table "public"."social_listening_sync_logs" from "authenticated";

revoke update on table "public"."social_listening_sync_logs" from "authenticated";

revoke delete on table "public"."social_listening_sync_logs" from "service_role";

revoke insert on table "public"."social_listening_sync_logs" from "service_role";

revoke references on table "public"."social_listening_sync_logs" from "service_role";

revoke select on table "public"."social_listening_sync_logs" from "service_role";

revoke trigger on table "public"."social_listening_sync_logs" from "service_role";

revoke truncate on table "public"."social_listening_sync_logs" from "service_role";

revoke update on table "public"."social_listening_sync_logs" from "service_role";

revoke delete on table "public"."survey_ai_knowledge_base" from "anon";

revoke insert on table "public"."survey_ai_knowledge_base" from "anon";

revoke references on table "public"."survey_ai_knowledge_base" from "anon";

revoke select on table "public"."survey_ai_knowledge_base" from "anon";

revoke trigger on table "public"."survey_ai_knowledge_base" from "anon";

revoke truncate on table "public"."survey_ai_knowledge_base" from "anon";

revoke update on table "public"."survey_ai_knowledge_base" from "anon";

revoke delete on table "public"."survey_ai_knowledge_base" from "authenticated";

revoke insert on table "public"."survey_ai_knowledge_base" from "authenticated";

revoke references on table "public"."survey_ai_knowledge_base" from "authenticated";

revoke select on table "public"."survey_ai_knowledge_base" from "authenticated";

revoke trigger on table "public"."survey_ai_knowledge_base" from "authenticated";

revoke truncate on table "public"."survey_ai_knowledge_base" from "authenticated";

revoke update on table "public"."survey_ai_knowledge_base" from "authenticated";

revoke delete on table "public"."survey_ai_knowledge_base" from "service_role";

revoke insert on table "public"."survey_ai_knowledge_base" from "service_role";

revoke references on table "public"."survey_ai_knowledge_base" from "service_role";

revoke select on table "public"."survey_ai_knowledge_base" from "service_role";

revoke trigger on table "public"."survey_ai_knowledge_base" from "service_role";

revoke truncate on table "public"."survey_ai_knowledge_base" from "service_role";

revoke update on table "public"."survey_ai_knowledge_base" from "service_role";

revoke delete on table "public"."survey_insights_daily" from "anon";

revoke insert on table "public"."survey_insights_daily" from "anon";

revoke references on table "public"."survey_insights_daily" from "anon";

revoke select on table "public"."survey_insights_daily" from "anon";

revoke trigger on table "public"."survey_insights_daily" from "anon";

revoke truncate on table "public"."survey_insights_daily" from "anon";

revoke update on table "public"."survey_insights_daily" from "anon";

revoke delete on table "public"."survey_insights_daily" from "authenticated";

revoke insert on table "public"."survey_insights_daily" from "authenticated";

revoke references on table "public"."survey_insights_daily" from "authenticated";

revoke select on table "public"."survey_insights_daily" from "authenticated";

revoke trigger on table "public"."survey_insights_daily" from "authenticated";

revoke truncate on table "public"."survey_insights_daily" from "authenticated";

revoke update on table "public"."survey_insights_daily" from "authenticated";

revoke delete on table "public"."survey_insights_daily" from "service_role";

revoke insert on table "public"."survey_insights_daily" from "service_role";

revoke references on table "public"."survey_insights_daily" from "service_role";

revoke select on table "public"."survey_insights_daily" from "service_role";

revoke trigger on table "public"."survey_insights_daily" from "service_role";

revoke truncate on table "public"."survey_insights_daily" from "service_role";

revoke update on table "public"."survey_insights_daily" from "service_role";

revoke delete on table "public"."survey_questions" from "anon";

revoke insert on table "public"."survey_questions" from "anon";

revoke references on table "public"."survey_questions" from "anon";

revoke select on table "public"."survey_questions" from "anon";

revoke trigger on table "public"."survey_questions" from "anon";

revoke truncate on table "public"."survey_questions" from "anon";

revoke update on table "public"."survey_questions" from "anon";

revoke delete on table "public"."survey_questions" from "authenticated";

revoke insert on table "public"."survey_questions" from "authenticated";

revoke references on table "public"."survey_questions" from "authenticated";

revoke select on table "public"."survey_questions" from "authenticated";

revoke trigger on table "public"."survey_questions" from "authenticated";

revoke truncate on table "public"."survey_questions" from "authenticated";

revoke update on table "public"."survey_questions" from "authenticated";

revoke delete on table "public"."survey_questions" from "service_role";

revoke insert on table "public"."survey_questions" from "service_role";

revoke references on table "public"."survey_questions" from "service_role";

revoke select on table "public"."survey_questions" from "service_role";

revoke trigger on table "public"."survey_questions" from "service_role";

revoke truncate on table "public"."survey_questions" from "service_role";

revoke update on table "public"."survey_questions" from "service_role";

revoke delete on table "public"."survey_response_analysis" from "anon";

revoke insert on table "public"."survey_response_analysis" from "anon";

revoke references on table "public"."survey_response_analysis" from "anon";

revoke select on table "public"."survey_response_analysis" from "anon";

revoke trigger on table "public"."survey_response_analysis" from "anon";

revoke truncate on table "public"."survey_response_analysis" from "anon";

revoke update on table "public"."survey_response_analysis" from "anon";

revoke delete on table "public"."survey_response_analysis" from "authenticated";

revoke insert on table "public"."survey_response_analysis" from "authenticated";

revoke references on table "public"."survey_response_analysis" from "authenticated";

revoke select on table "public"."survey_response_analysis" from "authenticated";

revoke trigger on table "public"."survey_response_analysis" from "authenticated";

revoke truncate on table "public"."survey_response_analysis" from "authenticated";

revoke update on table "public"."survey_response_analysis" from "authenticated";

revoke delete on table "public"."survey_response_analysis" from "service_role";

revoke insert on table "public"."survey_response_analysis" from "service_role";

revoke references on table "public"."survey_response_analysis" from "service_role";

revoke select on table "public"."survey_response_analysis" from "service_role";

revoke trigger on table "public"."survey_response_analysis" from "service_role";

revoke truncate on table "public"."survey_response_analysis" from "service_role";

revoke update on table "public"."survey_response_analysis" from "service_role";

revoke delete on table "public"."survey_responses" from "anon";

revoke insert on table "public"."survey_responses" from "anon";

revoke references on table "public"."survey_responses" from "anon";

revoke select on table "public"."survey_responses" from "anon";

revoke trigger on table "public"."survey_responses" from "anon";

revoke truncate on table "public"."survey_responses" from "anon";

revoke update on table "public"."survey_responses" from "anon";

revoke delete on table "public"."survey_responses" from "authenticated";

revoke insert on table "public"."survey_responses" from "authenticated";

revoke references on table "public"."survey_responses" from "authenticated";

revoke select on table "public"."survey_responses" from "authenticated";

revoke trigger on table "public"."survey_responses" from "authenticated";

revoke truncate on table "public"."survey_responses" from "authenticated";

revoke update on table "public"."survey_responses" from "authenticated";

revoke delete on table "public"."survey_responses" from "service_role";

revoke insert on table "public"."survey_responses" from "service_role";

revoke references on table "public"."survey_responses" from "service_role";

revoke select on table "public"."survey_responses" from "service_role";

revoke trigger on table "public"."survey_responses" from "service_role";

revoke truncate on table "public"."survey_responses" from "service_role";

revoke update on table "public"."survey_responses" from "service_role";

revoke delete on table "public"."survey_webhook_keys" from "anon";

revoke insert on table "public"."survey_webhook_keys" from "anon";

revoke references on table "public"."survey_webhook_keys" from "anon";

revoke select on table "public"."survey_webhook_keys" from "anon";

revoke trigger on table "public"."survey_webhook_keys" from "anon";

revoke truncate on table "public"."survey_webhook_keys" from "anon";

revoke update on table "public"."survey_webhook_keys" from "anon";

revoke delete on table "public"."survey_webhook_keys" from "authenticated";

revoke insert on table "public"."survey_webhook_keys" from "authenticated";

revoke references on table "public"."survey_webhook_keys" from "authenticated";

revoke select on table "public"."survey_webhook_keys" from "authenticated";

revoke trigger on table "public"."survey_webhook_keys" from "authenticated";

revoke truncate on table "public"."survey_webhook_keys" from "authenticated";

revoke update on table "public"."survey_webhook_keys" from "authenticated";

revoke delete on table "public"."survey_webhook_keys" from "service_role";

revoke insert on table "public"."survey_webhook_keys" from "service_role";

revoke references on table "public"."survey_webhook_keys" from "service_role";

revoke select on table "public"."survey_webhook_keys" from "service_role";

revoke trigger on table "public"."survey_webhook_keys" from "service_role";

revoke truncate on table "public"."survey_webhook_keys" from "service_role";

revoke update on table "public"."survey_webhook_keys" from "service_role";

revoke delete on table "public"."surveys" from "anon";

revoke insert on table "public"."surveys" from "anon";

revoke references on table "public"."surveys" from "anon";

revoke select on table "public"."surveys" from "anon";

revoke trigger on table "public"."surveys" from "anon";

revoke truncate on table "public"."surveys" from "anon";

revoke update on table "public"."surveys" from "anon";

revoke delete on table "public"."surveys" from "authenticated";

revoke insert on table "public"."surveys" from "authenticated";

revoke references on table "public"."surveys" from "authenticated";

revoke select on table "public"."surveys" from "authenticated";

revoke trigger on table "public"."surveys" from "authenticated";

revoke truncate on table "public"."surveys" from "authenticated";

revoke update on table "public"."surveys" from "authenticated";

revoke delete on table "public"."surveys" from "service_role";

revoke insert on table "public"."surveys" from "service_role";

revoke references on table "public"."surveys" from "service_role";

revoke select on table "public"."surveys" from "service_role";

revoke trigger on table "public"."surveys" from "service_role";

revoke truncate on table "public"."surveys" from "service_role";

revoke update on table "public"."surveys" from "service_role";

revoke delete on table "public"."system_events" from "anon";

revoke insert on table "public"."system_events" from "anon";

revoke references on table "public"."system_events" from "anon";

revoke select on table "public"."system_events" from "anon";

revoke trigger on table "public"."system_events" from "anon";

revoke truncate on table "public"."system_events" from "anon";

revoke update on table "public"."system_events" from "anon";

revoke delete on table "public"."system_events" from "authenticated";

revoke insert on table "public"."system_events" from "authenticated";

revoke references on table "public"."system_events" from "authenticated";

revoke select on table "public"."system_events" from "authenticated";

revoke trigger on table "public"."system_events" from "authenticated";

revoke truncate on table "public"."system_events" from "authenticated";

revoke update on table "public"."system_events" from "authenticated";

revoke delete on table "public"."system_events" from "service_role";

revoke insert on table "public"."system_events" from "service_role";

revoke references on table "public"."system_events" from "service_role";

revoke select on table "public"."system_events" from "service_role";

revoke trigger on table "public"."system_events" from "service_role";

revoke truncate on table "public"."system_events" from "service_role";

revoke update on table "public"."system_events" from "service_role";

revoke delete on table "public"."system_learnings" from "anon";

revoke insert on table "public"."system_learnings" from "anon";

revoke references on table "public"."system_learnings" from "anon";

revoke select on table "public"."system_learnings" from "anon";

revoke trigger on table "public"."system_learnings" from "anon";

revoke truncate on table "public"."system_learnings" from "anon";

revoke update on table "public"."system_learnings" from "anon";

revoke delete on table "public"."system_learnings" from "authenticated";

revoke insert on table "public"."system_learnings" from "authenticated";

revoke references on table "public"."system_learnings" from "authenticated";

revoke select on table "public"."system_learnings" from "authenticated";

revoke trigger on table "public"."system_learnings" from "authenticated";

revoke truncate on table "public"."system_learnings" from "authenticated";

revoke update on table "public"."system_learnings" from "authenticated";

revoke delete on table "public"."system_learnings" from "service_role";

revoke insert on table "public"."system_learnings" from "service_role";

revoke references on table "public"."system_learnings" from "service_role";

revoke select on table "public"."system_learnings" from "service_role";

revoke trigger on table "public"."system_learnings" from "service_role";

revoke truncate on table "public"."system_learnings" from "service_role";

revoke update on table "public"."system_learnings" from "service_role";

revoke delete on table "public"."terms_versions" from "anon";

revoke insert on table "public"."terms_versions" from "anon";

revoke references on table "public"."terms_versions" from "anon";

revoke select on table "public"."terms_versions" from "anon";

revoke trigger on table "public"."terms_versions" from "anon";

revoke truncate on table "public"."terms_versions" from "anon";

revoke update on table "public"."terms_versions" from "anon";

revoke delete on table "public"."terms_versions" from "authenticated";

revoke insert on table "public"."terms_versions" from "authenticated";

revoke references on table "public"."terms_versions" from "authenticated";

revoke select on table "public"."terms_versions" from "authenticated";

revoke trigger on table "public"."terms_versions" from "authenticated";

revoke truncate on table "public"."terms_versions" from "authenticated";

revoke update on table "public"."terms_versions" from "authenticated";

revoke delete on table "public"."terms_versions" from "service_role";

revoke insert on table "public"."terms_versions" from "service_role";

revoke references on table "public"."terms_versions" from "service_role";

revoke select on table "public"."terms_versions" from "service_role";

revoke trigger on table "public"."terms_versions" from "service_role";

revoke truncate on table "public"."terms_versions" from "service_role";

revoke update on table "public"."terms_versions" from "service_role";

revoke delete on table "public"."whatsapp_instances" from "anon";

revoke insert on table "public"."whatsapp_instances" from "anon";

revoke references on table "public"."whatsapp_instances" from "anon";

revoke select on table "public"."whatsapp_instances" from "anon";

revoke trigger on table "public"."whatsapp_instances" from "anon";

revoke truncate on table "public"."whatsapp_instances" from "anon";

revoke update on table "public"."whatsapp_instances" from "anon";

revoke delete on table "public"."whatsapp_instances" from "authenticated";

revoke insert on table "public"."whatsapp_instances" from "authenticated";

revoke references on table "public"."whatsapp_instances" from "authenticated";

revoke select on table "public"."whatsapp_instances" from "authenticated";

revoke trigger on table "public"."whatsapp_instances" from "authenticated";

revoke truncate on table "public"."whatsapp_instances" from "authenticated";

revoke update on table "public"."whatsapp_instances" from "authenticated";

revoke delete on table "public"."whatsapp_instances" from "service_role";

revoke insert on table "public"."whatsapp_instances" from "service_role";

revoke references on table "public"."whatsapp_instances" from "service_role";

revoke select on table "public"."whatsapp_instances" from "service_role";

revoke trigger on table "public"."whatsapp_instances" from "service_role";

revoke truncate on table "public"."whatsapp_instances" from "service_role";

revoke update on table "public"."whatsapp_instances" from "service_role";

alter table "public"."agent_decisions_log" drop constraint "agent_decisions_log_approved_by_fkey";

alter table "public"."ai_agents" drop constraint "ai_agents_created_by_fkey";

alter table "public"."automation_executions" drop constraint "automation_executions_conversation_id_fkey";

alter table "public"."automation_flows" drop constraint "automation_flows_created_by_fkey";

alter table "public"."automation_media" drop constraint "automation_media_uploaded_by_fkey";

alter table "public"."automation_message_templates" drop constraint "automation_message_templates_created_by_fkey";

alter table "public"."comment_metrics_daily" drop constraint "comment_metrics_daily_unique";

alter table "public"."contact_memory" drop constraint "contact_memory_confidence_check";

alter table "public"."contact_memory" drop constraint "contact_memory_memory_type_check";

alter table "public"."contact_memory" drop constraint "contact_memory_source_check";

alter table "public"."contact_profile_history" drop constraint "contact_profile_history_source_check";

alter table "public"."contact_profiles" drop constraint "contact_profiles_contact_unique";

alter table "public"."crm_activities_tasks" drop constraint "crm_activities_tasks_assigned_to_fkey";

alter table "public"."crm_activities_tasks" drop constraint "crm_activities_tasks_created_by_fkey";

alter table "public"."crm_cadences" drop constraint "crm_cadences_created_by_fkey";

alter table "public"."crm_contact_cadences" drop constraint "crm_contact_cadences_contact_id_cadence_id_key";

alter table "public"."crm_contact_interactions" drop constraint "crm_contact_interactions_funnel_id_fkey";

alter table "public"."crm_webhook_keys" drop constraint "crm_webhook_keys_api_key_key";

alter table "public"."crm_webhook_keys" drop constraint "crm_webhook_keys_default_funnel_id_fkey";

alter table "public"."economic_days" drop constraint "economic_days_project_id_date_key";

alter table "public"."event_dispatch_rules" drop constraint "event_dispatch_rules_project_id_system_event_provider_key";

alter table "public"."experience_templates" drop constraint "experience_templates_created_by_fkey";

alter table "public"."experience_themes" drop constraint "experience_themes_created_by_fkey";

alter table "public"."feature_overrides" drop constraint "feature_overrides_created_by_fkey";

alter table "public"."feature_overrides" drop constraint "feature_overrides_target_type_target_id_feature_id_key";

alter table "public"."features" drop constraint "features_feature_key_key";

alter table "public"."finance_ledger" drop constraint "finance_ledger_unique_event";

alter table "public"."finance_sync_runs" drop constraint "finance_sync_runs_created_by_fkey";

alter table "public"."funnel_experiments" drop constraint "funnel_experiments_created_by_fkey";

alter table "public"."funnel_experiments" drop constraint "funnel_experiments_funnel_performance_id_fkey";

alter table "public"."funnel_experiments" drop constraint "funnel_experiments_suggestion_id_fkey";

alter table "public"."funnel_experiments" drop constraint "valid_experiment_status";

alter table "public"."funnel_meta_accounts" drop constraint "funnel_meta_accounts_funnel_id_meta_account_id_key";

alter table "public"."funnel_optimization_suggestions" drop constraint "funnel_optimization_suggestions_funnel_performance_id_fkey";

alter table "public"."funnel_optimization_suggestions" drop constraint "funnel_optimization_suggestions_project_id_fkey";

alter table "public"."funnel_optimization_suggestions" drop constraint "funnel_optimization_suggestions_reviewed_by_fkey";

alter table "public"."funnel_optimization_suggestions" drop constraint "valid_suggestion_status";

alter table "public"."funnel_performance" drop constraint "funnel_performance_funnel_id_fkey";

alter table "public"."funnel_performance" drop constraint "funnel_performance_project_id_fkey";

alter table "public"."funnel_performance" drop constraint "valid_path_type";

alter table "public"."funnel_thresholds" drop constraint "funnel_thresholds_project_id_threshold_key_key";

alter table "public"."funnels" drop constraint "funnels_type_check";

alter table "public"."hotmart_backfill_runs" drop constraint "hotmart_backfill_runs_executed_by_fkey";

alter table "public"."hotmart_product_plans" drop constraint "hotmart_product_plans_plan_id_fkey";

alter table "public"."hotmart_product_plans" drop constraint "hotmart_product_plans_product_id_offer_code_key";

alter table "public"."hotmart_sales" drop constraint "hotmart_sales_project_transaction_unique";

alter table "public"."hotmart_sales" drop constraint "hotmart_sales_transaction_id_key";

alter table "public"."hotmart_sales" drop constraint "hotmart_sales_transaction_id_unique";

alter table "public"."launch_products" drop constraint "launch_products_offer_mapping_id_fkey";

alter table "public"."launch_products" drop constraint "launch_products_unique";

alter table "public"."ledger_import_batches" drop constraint "ledger_import_batches_imported_by_fkey";

alter table "public"."ledger_official" drop constraint "ledger_official_imported_by_fkey";

alter table "public"."ledger_official" drop constraint "ledger_official_reconciled_by_fkey";

alter table "public"."ledger_official" drop constraint "ledger_official_unique_transaction";

alter table "public"."meta_ad_accounts" drop constraint "meta_ad_accounts_project_account_unique";

alter table "public"."meta_ad_accounts" drop constraint "meta_ad_accounts_project_id_account_id_key";

alter table "public"."meta_ad_audiences" drop constraint "meta_ad_audiences_segment_type_check";

alter table "public"."meta_ad_audiences" drop constraint "meta_ad_audiences_status_check";

alter table "public"."meta_ad_audiences" drop constraint "meta_ad_audiences_sync_frequency_check";

alter table "public"."meta_adsets" drop constraint "meta_adsets_project_adset_unique";

alter table "public"."meta_audience_contacts" drop constraint "meta_audience_contacts_unique";

alter table "public"."meta_audience_sync_logs" drop constraint "meta_audience_sync_logs_status_check";

alter table "public"."meta_campaigns" drop constraint "meta_campaigns_project_campaign_unique";

alter table "public"."meta_insights" drop constraint "meta_insights_project_id_ad_account_id_campaign_id_adset_id_key";

alter table "public"."meta_insights" drop constraint "meta_insights_unique_key";

alter table "public"."meta_lookalike_audiences" drop constraint "meta_lookalike_audiences_percentage_check";

alter table "public"."meta_lookalike_audiences" drop constraint "meta_lookalike_audiences_status_check";

alter table "public"."metric_definitions" drop constraint "metric_definitions_metric_key_key";

alter table "public"."offer_mappings" drop constraint "offer_mappings_project_provider_codigo_unique";

alter table "public"."order_items" drop constraint "order_items_funnel_id_fkey";

alter table "public"."order_items" drop constraint "order_items_offer_mapping_id_fkey";

alter table "public"."orders" drop constraint "orders_provider_unique";

alter table "public"."path_events" drop constraint "path_events_experiment_id_fkey";

alter table "public"."path_events" drop constraint "path_events_funnel_performance_id_fkey";

alter table "public"."path_events" drop constraint "valid_event_type";

alter table "public"."personalization_contexts" drop constraint "personalization_contexts_channel_check";

alter table "public"."personalization_contexts" drop constraint "personalization_contexts_personalization_depth_check";

alter table "public"."personalization_logs" drop constraint "personalization_logs_context_id_fkey";

alter table "public"."phase_campaigns" drop constraint "phase_campaigns_unique";

alter table "public"."plan_features" drop constraint "plan_features_plan_id_feature_id_key";

alter table "public"."product_revenue_splits" drop constraint "product_revenue_splits_partner_type_check";

alter table "public"."product_revenue_splits" drop constraint "product_revenue_splits_percentage_check";

alter table "public"."product_revenue_splits" drop constraint "product_revenue_splits_project_id_product_id_partner_type_p_key";

alter table "public"."project_credentials" drop constraint "project_credentials_project_provider_unique";

alter table "public"."project_invites" drop constraint "project_invites_project_id_email_status_key";

alter table "public"."project_invites" drop constraint "project_invites_role_template_id_fkey";

alter table "public"."project_member_feature_permissions" drop constraint "project_member_feature_permis_project_id_user_id_feature_id_key";

alter table "public"."project_member_feature_permissions" drop constraint "project_member_feature_permissions_permission_level_check";

alter table "public"."project_member_feature_permissions" drop constraint "project_member_feature_permissions_project_id_fkey";

alter table "public"."project_member_feature_permissions" drop constraint "project_member_feature_permissions_user_id_fkey";

alter table "public"."project_members" drop constraint "project_members_role_template_id_fkey";

alter table "public"."project_modules" drop constraint "project_modules_enabled_by_fkey";

alter table "public"."project_settings" drop constraint "project_settings_project_id_key";

alter table "public"."project_tracking_settings" drop constraint "project_tracking_settings_project_id_key";

alter table "public"."projects" drop constraint "projects_public_code_key";

alter table "public"."provider_event_log" drop constraint "provider_event_log_project_id_fkey";

alter table "public"."provider_event_log" drop constraint "provider_event_log_status_check";

alter table "public"."provider_order_map" drop constraint "provider_order_map_unique";

alter table "public"."quiz_events" drop constraint "quiz_events_contact_id_fkey";

alter table "public"."quiz_options" drop constraint "quiz_options_next_block_id_fkey";

alter table "public"."quiz_options" drop constraint "quiz_options_next_question_id_fkey";

alter table "public"."quiz_outcome_logs" drop constraint "quiz_outcome_logs_contact_id_fkey";

alter table "public"."quiz_outcome_logs" drop constraint "quiz_outcome_logs_project_id_fkey";

alter table "public"."quiz_outcome_logs" drop constraint "quiz_outcome_logs_quiz_session_id_fkey";

alter table "public"."quiz_question_conditions" drop constraint "quiz_question_conditions_condition_type_check";

alter table "public"."quiz_question_conditions" drop constraint "quiz_question_conditions_logical_operator_check";

alter table "public"."quiz_questions" drop constraint "quiz_questions_visibility_type_check";

alter table "public"."quiz_results" drop constraint "quiz_results_semantic_profile_id_fkey";

alter table "public"."quiz_results" drop constraint "quiz_results_session_id_key";

alter table "public"."quiz_sessions" drop constraint "quiz_sessions_current_question_id_fkey";

alter table "public"."quizzes" drop constraint "quizzes_flow_type_check";

alter table "public"."quizzes" drop constraint "quizzes_template_id_fkey";

alter table "public"."quizzes" drop constraint "quizzes_theme_id_fkey";

alter table "public"."recommendation_logs" drop constraint "recommendation_logs_prediction_id_fkey";

alter table "public"."role_template_feature_permissions" drop constraint "role_template_feature_permissio_role_template_id_feature_id_key";

alter table "public"."role_template_feature_permissions" drop constraint "role_template_feature_permissions_feature_id_fkey";

alter table "public"."role_template_feature_permissions" drop constraint "role_template_feature_permissions_permission_level_check";

alter table "public"."role_template_feature_permissions" drop constraint "role_template_feature_permissions_role_template_id_fkey";

alter table "public"."role_templates" drop constraint "role_templates_project_id_fkey";

alter table "public"."role_templates" drop constraint "role_templates_whatsapp_visibility_mode_check";

alter table "public"."role_templates" drop constraint "unique_system_template_name";

alter table "public"."sales_core_events" drop constraint "sales_core_events_contact_id_fkey";

alter table "public"."sales_core_events" drop constraint "sales_core_events_event_type_check";

alter table "public"."sales_history_import_batches" drop constraint "sales_history_import_batches_imported_by_fkey";

alter table "public"."sales_history_import_batches" drop constraint "sales_history_import_batches_project_id_fkey";

alter table "public"."sales_history_orders" drop constraint "sales_history_orders_imported_by_fkey";

alter table "public"."sales_history_orders" drop constraint "unique_sales_history_transaction";

alter table "public"."semantic_profiles" drop constraint "semantic_profiles_project_id_fkey";

alter table "public"."social_comments" drop constraint "social_comments_crm_contact_id_fkey";

alter table "public"."social_comments" drop constraint "social_comments_intent_score_check";

alter table "public"."social_comments" drop constraint "social_comments_parent_fkey";

alter table "public"."social_comments" drop constraint "social_comments_unique";

alter table "public"."social_listening_pages" drop constraint "unique_page_per_project";

alter table "public"."social_listening_sync_logs" drop constraint "social_listening_sync_logs_project_id_fkey";

alter table "public"."social_posts" drop constraint "social_posts_unique";

alter table "public"."subscriptions" drop constraint "subscriptions_created_by_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_user_id_key";

alter table "public"."survey_ai_knowledge_base" drop constraint "survey_ai_knowledge_base_project_id_fkey";

alter table "public"."survey_ai_knowledge_base" drop constraint "unique_project_survey_kb";

alter table "public"."survey_insights_daily" drop constraint "survey_insights_daily_project_id_fkey";

alter table "public"."survey_insights_daily" drop constraint "survey_insights_daily_survey_id_fkey";

alter table "public"."survey_insights_daily" drop constraint "unique_survey_insights_daily";

alter table "public"."survey_questions" drop constraint "survey_questions_survey_id_fkey";

alter table "public"."survey_response_analysis" drop constraint "survey_response_analysis_contact_id_fkey";

alter table "public"."survey_response_analysis" drop constraint "survey_response_analysis_intent_score_check";

alter table "public"."survey_response_analysis" drop constraint "survey_response_analysis_project_id_fkey";

alter table "public"."survey_response_analysis" drop constraint "survey_response_analysis_response_id_fkey";

alter table "public"."survey_response_analysis" drop constraint "survey_response_analysis_survey_id_fkey";

alter table "public"."survey_response_analysis" drop constraint "unique_response_analysis";

alter table "public"."survey_responses" drop constraint "survey_responses_contact_id_fkey";

alter table "public"."survey_responses" drop constraint "survey_responses_project_id_fkey";

alter table "public"."survey_responses" drop constraint "survey_responses_survey_id_fkey";

alter table "public"."survey_webhook_keys" drop constraint "survey_webhook_keys_api_key_key";

alter table "public"."survey_webhook_keys" drop constraint "survey_webhook_keys_project_id_fkey";

alter table "public"."survey_webhook_keys" drop constraint "survey_webhook_keys_survey_id_fkey";

alter table "public"."surveys" drop constraint "surveys_created_by_fkey";

alter table "public"."surveys" drop constraint "surveys_default_funnel_id_fkey";

alter table "public"."surveys" drop constraint "surveys_project_id_fkey";

alter table "public"."surveys" drop constraint "surveys_project_id_slug_key";

alter table "public"."system_events" drop constraint "system_events_contact_id_fkey";

alter table "public"."system_events" drop constraint "system_events_parent_event_id_fkey";

alter table "public"."system_events" drop constraint "system_events_project_id_fkey";

alter table "public"."system_learnings" drop constraint "system_learnings_project_id_fkey";

alter table "public"."terms_acceptances" drop constraint "terms_acceptances_user_id_fkey";

alter table "public"."terms_versions" drop constraint "terms_versions_version_key";

alter table "public"."user_activity_logs" drop constraint "user_activity_logs_project_id_fkey";

alter table "public"."whatsapp_agents" drop constraint "whatsapp_agents_project_id_user_id_key";

alter table "public"."whatsapp_agents" drop constraint "whatsapp_agents_visibility_mode_check";

alter table "public"."whatsapp_conversations" drop constraint "whatsapp_conversations_project_id_remote_jid_key";

alter table "public"."whatsapp_departments" drop constraint "whatsapp_departments_project_id_name_key";

alter table "public"."whatsapp_instances" drop constraint "whatsapp_instances_instance_name_key";

alter table "public"."whatsapp_instances" drop constraint "whatsapp_instances_whatsapp_number_id_fkey";

alter table "public"."whatsapp_messages" drop constraint "whatsapp_messages_sent_by_fkey";

alter table "public"."whatsapp_messages" drop constraint "whatsapp_messages_whatsapp_number_id_fkey";

alter table "public"."whatsapp_numbers" drop constraint "whatsapp_numbers_phone_number_unique";

alter table "public"."whatsapp_numbers" drop constraint "whatsapp_numbers_project_id_phone_number_key";

alter table "public"."agent_decisions_log" drop constraint "agent_decisions_log_contact_id_fkey";

alter table "public"."agent_decisions_log" drop constraint "agent_decisions_log_prediction_id_fkey";

alter table "public"."automation_executions" drop constraint "automation_executions_current_node_id_fkey";

alter table "public"."automation_flows" drop constraint "automation_flows_folder_id_fkey";

alter table "public"."automation_folders" drop constraint "automation_folders_parent_id_fkey";

alter table "public"."crm_activities" drop constraint "crm_activities_transaction_id_fkey";

alter table "public"."crm_cadences" drop constraint "crm_cadences_trigger_stage_id_fkey";

alter table "public"."crm_contacts" drop constraint "crm_contacts_pipeline_stage_id_fkey";

alter table "public"."crm_contacts" drop constraint "crm_contacts_recovery_stage_id_fkey";

alter table "public"."crm_recovery_activities" drop constraint "crm_recovery_activities_contact_id_fkey";

alter table "public"."crm_recovery_activities" drop constraint "crm_recovery_activities_project_id_fkey";

alter table "public"."crm_recovery_activities" drop constraint "crm_recovery_activities_stage_id_fkey";

alter table "public"."crm_webhook_keys" drop constraint "crm_webhook_keys_project_id_fkey";

alter table "public"."economic_days" drop constraint "economic_days_project_id_fkey";

alter table "public"."event_dispatch_rules" drop constraint "event_dispatch_rules_project_id_fkey";

alter table "public"."experience_templates" drop constraint "experience_templates_project_id_fkey";

alter table "public"."experience_themes" drop constraint "experience_themes_project_id_fkey";

alter table "public"."feature_overrides" drop constraint "feature_overrides_feature_id_fkey";

alter table "public"."finance_ledger" drop constraint "finance_ledger_project_id_fkey";

alter table "public"."finance_sync_runs" drop constraint "finance_sync_runs_project_id_fkey";

alter table "public"."funnel_changes" drop constraint "funnel_changes_project_id_fkey";

alter table "public"."funnel_experiments" drop constraint "funnel_experiments_project_id_fkey";

alter table "public"."funnel_meta_accounts" drop constraint "funnel_meta_accounts_funnel_id_fkey";

alter table "public"."funnel_meta_accounts" drop constraint "funnel_meta_accounts_meta_account_id_fkey";

alter table "public"."funnel_meta_accounts" drop constraint "funnel_meta_accounts_project_id_fkey";

alter table "public"."funnel_thresholds" drop constraint "funnel_thresholds_project_id_fkey";

alter table "public"."funnels" drop constraint "funnels_project_id_fkey";

alter table "public"."hotmart_backfill_runs" drop constraint "hotmart_backfill_runs_project_id_fkey";

alter table "public"."launch_phases" drop constraint "launch_phases_funnel_id_fkey";

alter table "public"."launch_phases" drop constraint "launch_phases_project_id_fkey";

alter table "public"."launch_products" drop constraint "launch_products_funnel_id_fkey";

alter table "public"."launch_products" drop constraint "launch_products_project_id_fkey";

alter table "public"."ledger_import_batches" drop constraint "ledger_import_batches_project_id_fkey";

alter table "public"."ledger_official" drop constraint "ledger_official_project_id_fkey";

alter table "public"."meta_ad_accounts" drop constraint "meta_ad_accounts_project_id_fkey";

alter table "public"."meta_ad_audiences" drop constraint "meta_ad_audiences_project_id_fkey";

alter table "public"."meta_ads" drop constraint "meta_ads_project_id_fkey";

alter table "public"."meta_adsets" drop constraint "meta_adsets_project_id_fkey";

alter table "public"."meta_audience_contacts" drop constraint "meta_audience_contacts_audience_id_fkey";

alter table "public"."meta_audience_contacts" drop constraint "meta_audience_contacts_contact_id_fkey";

alter table "public"."meta_audience_sync_logs" drop constraint "meta_audience_sync_logs_audience_id_fkey";

alter table "public"."meta_campaigns" drop constraint "meta_campaigns_project_id_fkey";

alter table "public"."meta_insights" drop constraint "meta_insights_project_id_fkey";

alter table "public"."meta_lookalike_audiences" drop constraint "meta_lookalike_audiences_source_audience_id_fkey";

alter table "public"."offer_mappings" drop constraint "offer_mappings_funnel_id_fkey";

alter table "public"."offer_mappings" drop constraint "offer_mappings_project_id_fkey";

alter table "public"."orders" drop constraint "orders_contact_id_fkey";

alter table "public"."path_events" drop constraint "path_events_contact_id_fkey";

alter table "public"."path_events" drop constraint "path_events_project_id_fkey";

alter table "public"."personalization_contexts" drop constraint "personalization_contexts_contact_id_fkey";

alter table "public"."personalization_contexts" drop constraint "personalization_contexts_project_id_fkey";

alter table "public"."personalization_logs" drop constraint "personalization_logs_contact_id_fkey";

alter table "public"."personalization_logs" drop constraint "personalization_logs_project_id_fkey";

alter table "public"."phase_campaigns" drop constraint "phase_campaigns_phase_id_fkey";

alter table "public"."phase_campaigns" drop constraint "phase_campaigns_project_id_fkey";

alter table "public"."plan_features" drop constraint "plan_features_feature_id_fkey";

alter table "public"."plan_features" drop constraint "plan_features_plan_id_fkey";

alter table "public"."project_invites" drop constraint "project_invites_invited_by_fkey";

alter table "public"."project_member_feature_permissions" drop constraint "project_member_feature_permissions_feature_id_fkey";

alter table "public"."project_member_permissions" drop constraint "project_member_permissions_user_id_fkey";

alter table "public"."project_modules" drop constraint "project_modules_project_id_fkey";

alter table "public"."project_settings" drop constraint "project_settings_project_id_fkey";

alter table "public"."project_tracking_settings" drop constraint "project_tracking_settings_project_id_fkey";

alter table "public"."provider_order_map" drop constraint "provider_order_map_order_id_fkey";

alter table "public"."provider_order_map" drop constraint "provider_order_map_project_id_fkey";

alter table "public"."quiz_answers" drop constraint "quiz_answers_option_id_fkey";

alter table "public"."quiz_answers" drop constraint "quiz_answers_question_id_fkey";

alter table "public"."quiz_events" drop constraint "quiz_events_project_id_fkey";

alter table "public"."quiz_events" drop constraint "quiz_events_session_id_fkey";

alter table "public"."quiz_outcome_logs" drop constraint "quiz_outcome_logs_outcome_id_fkey";

alter table "public"."quiz_results" drop constraint "quiz_results_project_id_fkey";

alter table "public"."quiz_results" drop constraint "quiz_results_session_id_fkey";

alter table "public"."quiz_sessions" drop constraint "quiz_sessions_contact_id_fkey";

alter table "public"."quiz_sessions" drop constraint "quiz_sessions_project_id_fkey";

alter table "public"."quiz_sessions" drop constraint "quiz_sessions_quiz_id_fkey";

alter table "public"."quizzes" drop constraint "quizzes_project_id_fkey";

alter table "public"."recommendation_logs" drop constraint "recommendation_logs_contact_id_fkey";

alter table "public"."recommendation_logs" drop constraint "recommendation_logs_project_id_fkey";

alter table "public"."sales_core_events" drop constraint "sales_core_events_project_id_fkey";

alter table "public"."spend_core_events" drop constraint "spend_core_events_project_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_user_id_fkey";

alter table "public"."whatsapp_agents" drop constraint "whatsapp_agents_user_id_fkey";

alter table "public"."whatsapp_conversations" drop constraint "whatsapp_conversations_assigned_to_fkey";

alter table "public"."whatsapp_conversations" drop constraint "whatsapp_conversations_contact_id_fkey";

alter table "public"."whatsapp_conversations" drop constraint "whatsapp_conversations_whatsapp_number_id_fkey";

drop function if exists "public"."can_use_feature"(_user_id uuid, _project_id uuid, _feature_key text);

drop function if exists "public"."can_view_conversation"(p_user_id uuid, p_conversation_id uuid);

drop function if exists "public"."check_and_use_ai_quota"(p_project_id uuid, p_items_count integer);

drop function if exists "public"."derive_order_status_from_ledger"(p_order_id uuid);

drop function if exists "public"."ensure_owner_permissions"();

drop view if exists "public"."funnel_summary";

drop function if exists "public"."get_funnel_metrics_daily_range"(p_funnel_id uuid, p_start date, p_end date);

drop function if exists "public"."get_funnel_summary_by_id"(p_funnel_id uuid);

drop function if exists "public"."get_project_credentials_internal"(p_project_id uuid);

drop function if exists "public"."get_project_invite_public"(p_invite_id uuid, p_email text);

drop function if exists "public"."get_user_email"(_user_id uuid);

drop function if exists "public"."get_webhook_stats"(p_project_id uuid, p_hours integer);

drop function if exists "public"."handle_role_change_to_owner"();

drop function if exists "public"."has_area_permission"(_user_id uuid, _project_id uuid, _area text, _min_level public.permission_level);

drop function if exists "public"."has_area_permission"(_user_id uuid, _project_id uuid, _area text, _min_level text);

drop function if exists "public"."increment_openai_credits"(p_project_id uuid, p_count integer);

drop function if exists "public"."migrate_auto_recoveries"();

drop function if exists "public"."migrate_contact_product_data"();

drop function if exists "public"."migrate_generic_tags"();

drop function if exists "public"."migrate_hotmart_to_crm"();

drop function if exists "public"."migrate_hotmart_to_interactions"();

drop function if exists "public"."migrate_hotmart_to_interactions_batch"(p_project_id uuid, p_batch_size integer);

drop function if exists "public"."migrate_tags_to_contextual"();

drop function if exists "public"."populate_contact_utms_from_transactions"();

drop function if exists "public"."update_contact_financial_data"();

drop function if exists "public"."update_funnel_performance_metrics"();

drop function if exists "public"."update_order_status_from_ledger"();

drop function if exists "public"."update_role_templates_updated_at"();

drop function if exists "public"."validate_experience_slug"();

drop function if exists "public"."validate_ledger_events_v21"();

drop view if exists "public"."contact_quiz_latest_results";

drop view if exists "public"."contact_social_insights";

drop view if exists "public"."crm_contact_attribution_view";

drop view if exists "public"."crm_contact_journey_metrics_view";

drop view if exists "public"."crm_contact_orders_metrics_view";

drop view if exists "public"."crm_contact_revenue_view";

drop view if exists "public"."crm_customer_intelligence_overview";

drop view if exists "public"."crm_journey_orders_view";

drop view if exists "public"."crm_order_automation_events_view";

drop view if exists "public"."crm_order_items_view";

drop view if exists "public"."crm_orders_view";

drop view if exists "public"."crm_recovery_orders_view";

drop view if exists "public"."finance_tracking_view";

drop view if exists "public"."funnel_financials_summary";

drop view if exists "public"."funnel_metrics_daily";

drop view if exists "public"."funnel_orders_by_offer";

drop view if exists "public"."funnel_orders_view";

drop view if exists "public"."live_project_totals_today";

drop view if exists "public"."orders_view_shadow";

drop view if exists "public"."owner_profit_daily";

drop view if exists "public"."revenue_allocations_daily";

drop view if exists "public"."sales_core_view";

drop view if exists "public"."canonical_sale_events";

drop view if exists "public"."funnel_financials";

drop view if exists "public"."funnel_spend";

drop view if exists "public"."live_financial_today";

drop view if exists "public"."live_sales_today";

drop view if exists "public"."live_spend_today";

drop view if exists "public"."revenue_allocations";

drop view if exists "public"."finance_ledger_summary";

alter table "public"."funnel_optimization_suggestions" drop constraint "funnel_optimization_suggestions_pkey";

alter table "public"."funnel_performance" drop constraint "funnel_performance_pkey";

alter table "public"."role_template_feature_permissions" drop constraint "role_template_feature_permissions_pkey";

alter table "public"."sales_history_import_batches" drop constraint "sales_history_import_batches_pkey";

alter table "public"."semantic_profiles" drop constraint "semantic_profiles_pkey";

alter table "public"."social_listening_sync_logs" drop constraint "social_listening_sync_logs_pkey";

alter table "public"."survey_ai_knowledge_base" drop constraint "survey_ai_knowledge_base_pkey";

alter table "public"."survey_insights_daily" drop constraint "survey_insights_daily_pkey";

alter table "public"."survey_questions" drop constraint "survey_questions_pkey";

alter table "public"."survey_response_analysis" drop constraint "survey_response_analysis_pkey";

alter table "public"."survey_responses" drop constraint "survey_responses_pkey";

alter table "public"."survey_webhook_keys" drop constraint "survey_webhook_keys_pkey";

alter table "public"."surveys" drop constraint "surveys_pkey";

alter table "public"."system_events" drop constraint "system_events_pkey";

alter table "public"."system_learnings" drop constraint "system_learnings_pkey";

alter table "public"."terms_versions" drop constraint "terms_versions_pkey";

alter table "public"."whatsapp_instances" drop constraint "whatsapp_instances_pkey";

drop index if exists "public"."comment_metrics_daily_unique";

drop index if exists "public"."contact_profiles_contact_unique";

drop index if exists "public"."crm_contact_cadences_contact_id_cadence_id_key";

drop index if exists "public"."crm_contact_interactions_project_external_id_key";

drop index if exists "public"."crm_webhook_keys_api_key_key";

drop index if exists "public"."economic_days_project_id_date_key";

drop index if exists "public"."event_dispatch_rules_project_id_system_event_provider_key";

drop index if exists "public"."feature_overrides_target_type_target_id_feature_id_key";

drop index if exists "public"."features_feature_key_key";

drop index if exists "public"."finance_ledger_unique_event";

drop index if exists "public"."funnel_meta_accounts_funnel_id_meta_account_id_key";

drop index if exists "public"."funnel_optimization_suggestions_pkey";

drop index if exists "public"."funnel_performance_pkey";

drop index if exists "public"."funnel_thresholds_project_id_threshold_key_key";

drop index if exists "public"."hotmart_product_plans_product_id_offer_code_key";

drop index if exists "public"."hotmart_sales_project_transaction_unique";

drop index if exists "public"."hotmart_sales_transaction_id_key";

drop index if exists "public"."hotmart_sales_transaction_id_unique";

drop index if exists "public"."idx_admin_audit_logs_admin_id";

drop index if exists "public"."idx_admin_audit_logs_created_at";

drop index if exists "public"."idx_admin_audit_logs_target";

drop index if exists "public"."idx_agent_decisions_log_agent_id";

drop index if exists "public"."idx_agent_decisions_log_contact_id";

drop index if exists "public"."idx_agent_decisions_log_created_at";

drop index if exists "public"."idx_agent_decisions_log_project_id";

drop index if exists "public"."idx_agent_decisions_log_status";

drop index if exists "public"."idx_ai_agents_is_active";

drop index if exists "public"."idx_ai_agents_project_id";

drop index if exists "public"."idx_ai_knowledge_base_project_id";

drop index if exists "public"."idx_ai_project_quotas_project_id";

drop index if exists "public"."idx_ai_usage_tracking_created_at";

drop index if exists "public"."idx_ai_usage_tracking_feature";

drop index if exists "public"."idx_ai_usage_tracking_project_date";

drop index if exists "public"."idx_ai_usage_tracking_project_id";

drop index if exists "public"."idx_automation_executions_contact_id";

drop index if exists "public"."idx_automation_executions_flow_id";

drop index if exists "public"."idx_automation_executions_next_execution";

drop index if exists "public"."idx_automation_executions_status";

drop index if exists "public"."idx_automation_flow_edges_flow_id";

drop index if exists "public"."idx_automation_flow_nodes_flow_id";

drop index if exists "public"."idx_automation_flows_is_active";

drop index if exists "public"."idx_automation_flows_project_id";

drop index if exists "public"."idx_automation_flows_trigger_type";

drop index if exists "public"."idx_automation_message_templates_project_id";

drop index if exists "public"."idx_comment_metrics_daily_date";

drop index if exists "public"."idx_contact_identity_events_contact";

drop index if exists "public"."idx_contact_identity_events_field";

drop index if exists "public"."idx_contact_identity_events_project";

drop index if exists "public"."idx_contact_memory_confidence";

drop index if exists "public"."idx_contact_memory_contact";

drop index if exists "public"."idx_contact_memory_last_reinforced";

drop index if exists "public"."idx_contact_memory_project";

drop index if exists "public"."idx_contact_memory_type";

drop index if exists "public"."idx_contact_predictions_contact";

drop index if exists "public"."idx_contact_predictions_expires";

drop index if exists "public"."idx_contact_predictions_project";

drop index if exists "public"."idx_contact_profiles_confidence";

drop index if exists "public"."idx_contact_profiles_contact_id";

drop index if exists "public"."idx_contact_profiles_project_id";

drop index if exists "public"."idx_contact_profiles_updated";

drop index if exists "public"."idx_crm_activities_contact_id";

drop index if exists "public"."idx_crm_activities_created_at";

drop index if exists "public"."idx_crm_activities_project_id";

drop index if exists "public"."idx_crm_activities_tasks_contact";

drop index if exists "public"."idx_crm_activities_tasks_due_date";

drop index if exists "public"."idx_crm_activities_tasks_status";

drop index if exists "public"."idx_crm_activities_type";

drop index if exists "public"."idx_crm_cadence_steps_cadence";

drop index if exists "public"."idx_crm_cadences_project";

drop index if exists "public"."idx_crm_contact_cadences_contact";

drop index if exists "public"."idx_crm_contact_cadences_status";

drop index if exists "public"."idx_crm_contact_interactions_contact_id";

drop index if exists "public"."idx_crm_contact_interactions_funnel_id";

drop index if exists "public"."idx_crm_contact_interactions_interacted_at";

drop index if exists "public"."idx_crm_contact_interactions_launch_tag";

drop index if exists "public"."idx_crm_contact_interactions_meta_ad_id";

drop index if exists "public"."idx_crm_contact_interactions_meta_adset_id";

drop index if exists "public"."idx_crm_contact_interactions_meta_campaign_id";

drop index if exists "public"."idx_crm_contact_interactions_project_id";

drop index if exists "public"."idx_crm_contact_interactions_utm_campaign";

drop index if exists "public"."idx_crm_contacts_first_name";

drop index if exists "public"."idx_crm_contacts_first_seen";

drop index if exists "public"."idx_crm_contacts_has_pending_payment";

drop index if exists "public"."idx_crm_contacts_instagram";

drop index if exists "public"."idx_crm_contacts_is_team_member";

drop index if exists "public"."idx_crm_contacts_last_name";

drop index if exists "public"."idx_crm_contacts_last_product_code";

drop index if exists "public"."idx_crm_contacts_pipeline_stage";

drop index if exists "public"."idx_crm_contacts_project_id";

drop index if exists "public"."idx_crm_contacts_project_lower_email";

drop index if exists "public"."idx_crm_contacts_recovery_stage";

drop index if exists "public"."idx_crm_contacts_source";

drop index if exists "public"."idx_crm_contacts_subscription_status";

drop index if exists "public"."idx_crm_contacts_user_id";

drop index if exists "public"."idx_crm_pipeline_stages_project";

drop index if exists "public"."idx_crm_recovery_activities_contact";

drop index if exists "public"."idx_crm_recovery_activities_project";

drop index if exists "public"."idx_crm_recovery_stages_project";

drop index if exists "public"."idx_crm_transactions_contact_id";

drop index if exists "public"."idx_crm_transactions_offer_code";

drop index if exists "public"."idx_crm_transactions_platform";

drop index if exists "public"."idx_crm_transactions_product_name";

drop index if exists "public"."idx_crm_transactions_project_id";

drop index if exists "public"."idx_crm_transactions_project_status";

drop index if exists "public"."idx_crm_transactions_transaction_date";

drop index if exists "public"."idx_crm_webhook_keys_api_key";

drop index if exists "public"."idx_economic_days_project";

drop index if exists "public"."idx_event_dispatch_rules_project";

drop index if exists "public"."idx_experience_templates_project_id";

drop index if exists "public"."idx_experience_templates_slug";

drop index if exists "public"."idx_experience_themes_project_id";

drop index if exists "public"."idx_experiments_project";

drop index if exists "public"."idx_experiments_status";

drop index if exists "public"."idx_feature_overrides_expires_at";

drop index if exists "public"."idx_feature_overrides_feature_id";

drop index if exists "public"."idx_feature_overrides_target";

drop index if exists "public"."idx_features_module_key";

drop index if exists "public"."idx_finance_ledger_event_type";

drop index if exists "public"."idx_finance_ledger_occurred_at";

drop index if exists "public"."idx_finance_ledger_project_id";

drop index if exists "public"."idx_finance_ledger_project_occurred";

drop index if exists "public"."idx_finance_ledger_transaction_id";

drop index if exists "public"."idx_finance_sync_runs_project";

drop index if exists "public"."idx_funnel_changes_data";

drop index if exists "public"."idx_funnel_changes_funil";

drop index if exists "public"."idx_funnel_meta_accounts_funnel";

drop index if exists "public"."idx_funnel_meta_accounts_meta";

drop index if exists "public"."idx_funnel_meta_accounts_project";

drop index if exists "public"."idx_funnel_performance_funnel";

drop index if exists "public"."idx_funnel_performance_path_type";

drop index if exists "public"."idx_funnel_performance_project";

drop index if exists "public"."idx_funnel_performance_score";

drop index if exists "public"."idx_funnels_name_project";

drop index if exists "public"."idx_funnels_type";

drop index if exists "public"."idx_hotmart_backfill_runs_project_id";

drop index if exists "public"."idx_hotmart_backfill_runs_status";

drop index if exists "public"."idx_hotmart_product_plans_plan_id";

drop index if exists "public"."idx_hotmart_product_plans_product_id";

drop index if exists "public"."idx_hotmart_sales_attribution_type";

drop index if exists "public"."idx_hotmart_sales_category";

drop index if exists "public"."idx_hotmart_sales_currency";

drop index if exists "public"."idx_hotmart_sales_meta_campaign";

drop index if exists "public"."idx_hotmart_sales_product_code";

drop index if exists "public"."idx_hotmart_sales_project_date";

drop index if exists "public"."idx_hotmart_sales_project_lower_buyer_email";

drop index if exists "public"."idx_hotmart_sales_project_offer_code";

drop index if exists "public"."idx_hotmart_sales_project_product_code";

drop index if exists "public"."idx_hotmart_sales_project_status";

drop index if exists "public"."idx_hotmart_sales_project_tx_offer_created_at";

drop index if exists "public"."idx_hotmart_sales_sale_date";

drop index if exists "public"."idx_hotmart_sales_status";

drop index if exists "public"."idx_hotmart_sales_transaction_id";

drop index if exists "public"."idx_hotmart_sales_utm_campaign_id";

drop index if exists "public"."idx_hotmart_sales_utm_source";

drop index if exists "public"."idx_hotmart_sales_utms";

drop index if exists "public"."idx_launch_products_funnel";

drop index if exists "public"."idx_ledger_events_actor";

drop index if exists "public"."idx_ledger_events_confidence_level";

drop index if exists "public"."idx_ledger_events_event_type";

drop index if exists "public"."idx_ledger_events_occurred_at";

drop index if exists "public"."idx_ledger_events_order_id";

drop index if exists "public"."idx_ledger_events_project_id";

drop index if exists "public"."idx_ledger_events_provider_event_id_unique";

drop index if exists "public"."idx_ledger_events_reference_period";

drop index if exists "public"."idx_ledger_events_source_origin";

drop index if exists "public"."idx_ledger_events_source_type";

drop index if exists "public"."idx_ledger_import_batches_date";

drop index if exists "public"."idx_ledger_import_batches_project";

drop index if exists "public"."idx_ledger_official_has_divergence";

drop index if exists "public"."idx_ledger_official_import_batch";

drop index if exists "public"."idx_ledger_official_is_reconciled";

drop index if exists "public"."idx_ledger_official_project_id";

drop index if exists "public"."idx_ledger_official_sale_date";

drop index if exists "public"."idx_ledger_official_transaction_id";

drop index if exists "public"."idx_meta_ad_audiences_project";

drop index if exists "public"."idx_meta_ad_audiences_status";

drop index if exists "public"."idx_meta_ad_audiences_sync_frequency";

drop index if exists "public"."idx_meta_ad_audiences_unique_name";

drop index if exists "public"."idx_meta_ads_adset";

drop index if exists "public"."idx_meta_adsets_campaign";

drop index if exists "public"."idx_meta_audience_contacts_audience";

drop index if exists "public"."idx_meta_audience_contacts_synced";

drop index if exists "public"."idx_meta_audience_sync_logs_audience";

drop index if exists "public"."idx_meta_audience_sync_logs_executed";

drop index if exists "public"."idx_meta_campaigns_project";

drop index if exists "public"."idx_meta_insights_campaign";

drop index if exists "public"."idx_meta_insights_project_date";

drop index if exists "public"."idx_meta_lookalike_audiences_source";

drop index if exists "public"."idx_offer_mappings_codigo_oferta";

drop index if exists "public"."idx_offer_mappings_id_funil";

drop index if exists "public"."idx_offer_mappings_project_id_produto";

drop index if exists "public"."idx_offer_mappings_provider_lookup";

drop index if exists "public"."idx_optimization_suggestions_project";

drop index if exists "public"."idx_optimization_suggestions_status";

drop index if exists "public"."idx_order_items_funnel_id";

drop index if exists "public"."idx_order_items_item_type";

drop index if exists "public"."idx_order_items_order_id";

drop index if exists "public"."idx_order_items_provider_product_id";

drop index if exists "public"."idx_orders_buyer_email";

drop index if exists "public"."idx_orders_contact_id";

drop index if exists "public"."idx_orders_created_at";

drop index if exists "public"."idx_orders_ledger_status";

drop index if exists "public"."idx_orders_meta_ad_id";

drop index if exists "public"."idx_orders_meta_adset_id";

drop index if exists "public"."idx_orders_meta_campaign_id";

drop index if exists "public"."idx_orders_ordered_at";

drop index if exists "public"."idx_orders_payment_method";

drop index if exists "public"."idx_orders_project_id";

drop index if exists "public"."idx_orders_provider";

drop index if exists "public"."idx_orders_utm_adset";

drop index if exists "public"."idx_orders_utm_campaign";

drop index if exists "public"."idx_orders_utm_placement";

drop index if exists "public"."idx_orders_utm_source";

drop index if exists "public"."idx_orders_utm_source_campaign";

drop index if exists "public"."idx_path_events_contact";

drop index if exists "public"."idx_path_events_created";

drop index if exists "public"."idx_path_events_funnel_perf";

drop index if exists "public"."idx_path_events_project";

drop index if exists "public"."idx_personalization_contexts_contact";

drop index if exists "public"."idx_personalization_contexts_expires";

drop index if exists "public"."idx_personalization_contexts_project";

drop index if exists "public"."idx_personalization_contexts_session";

drop index if exists "public"."idx_personalization_logs_contact";

drop index if exists "public"."idx_personalization_logs_context";

drop index if exists "public"."idx_personalization_logs_project";

drop index if exists "public"."idx_phase_campaigns_phase";

drop index if exists "public"."idx_plan_features_feature_id";

drop index if exists "public"."idx_plan_features_plan_id";

drop index if exists "public"."idx_product_revenue_splits_product";

drop index if exists "public"."idx_product_revenue_splits_project";

drop index if exists "public"."idx_profile_history_created";

drop index if exists "public"."idx_profile_history_profile_id";

drop index if exists "public"."idx_profile_history_project_id";

drop index if exists "public"."idx_profile_history_source";

drop index if exists "public"."idx_project_modules_module_key";

drop index if exists "public"."idx_project_modules_project_id";

drop index if exists "public"."idx_projects_public_code";

drop index if exists "public"."idx_provider_event_log_lookup";

drop index if exists "public"."idx_provider_event_log_status";

drop index if exists "public"."idx_provider_order_map_lookup";

drop index if exists "public"."idx_provider_order_map_order_id";

drop index if exists "public"."idx_quiz_answers_session_id";

drop index if exists "public"."idx_quiz_events_event_name";

drop index if exists "public"."idx_quiz_events_project_id";

drop index if exists "public"."idx_quiz_events_session_id";

drop index if exists "public"."idx_quiz_options_next_question";

drop index if exists "public"."idx_quiz_options_question_id";

drop index if exists "public"."idx_quiz_outcome_logs_contact";

drop index if exists "public"."idx_quiz_outcome_logs_created";

drop index if exists "public"."idx_quiz_outcome_logs_outcome";

drop index if exists "public"."idx_quiz_outcome_logs_project";

drop index if exists "public"."idx_quiz_outcome_logs_session";

drop index if exists "public"."idx_quiz_outcomes_active";

drop index if exists "public"."idx_quiz_outcomes_priority";

drop index if exists "public"."idx_quiz_outcomes_quiz_id";

drop index if exists "public"."idx_quiz_question_conditions_group_id";

drop index if exists "public"."idx_quiz_question_conditions_question_id";

drop index if exists "public"."idx_quiz_questions_order";

drop index if exists "public"."idx_quiz_questions_quiz_id";

drop index if exists "public"."idx_quiz_questions_visibility";

drop index if exists "public"."idx_quiz_results_project_id";

drop index if exists "public"."idx_quiz_results_session_id";

drop index if exists "public"."idx_quiz_sessions_contact_id";

drop index if exists "public"."idx_quiz_sessions_current_question";

drop index if exists "public"."idx_quiz_sessions_project_id";

drop index if exists "public"."idx_quiz_sessions_quiz_id";

drop index if exists "public"."idx_quiz_sessions_status";

drop index if exists "public"."idx_quizzes_is_active";

drop index if exists "public"."idx_quizzes_project_id";

drop index if exists "public"."idx_quizzes_template_id";

drop index if exists "public"."idx_quizzes_theme_id";

drop index if exists "public"."idx_recommendation_logs_contact";

drop index if exists "public"."idx_recommendation_logs_prediction";

drop index if exists "public"."idx_recommendation_logs_project";

drop index if exists "public"."idx_sales_core_events_active";

drop index if exists "public"."idx_sales_core_events_contact";

drop index if exists "public"."idx_sales_core_events_economic_day";

drop index if exists "public"."idx_sales_core_events_project_day";

drop index if exists "public"."idx_sales_core_events_provider";

drop index if exists "public"."idx_sales_core_events_provider_lookup";

drop index if exists "public"."idx_sales_history_batch";

drop index if exists "public"."idx_sales_history_date";

drop index if exists "public"."idx_sales_history_email";

drop index if exists "public"."idx_sales_history_product";

drop index if exists "public"."idx_sales_history_project";

drop index if exists "public"."idx_sales_history_status";

drop index if exists "public"."idx_semantic_profiles_priority";

drop index if exists "public"."idx_semantic_profiles_project_id";

drop index if exists "public"."idx_social_comments_ai_pending";

drop index if exists "public"."idx_social_comments_classification";

drop index if exists "public"."idx_social_comments_classification_key";

drop index if exists "public"."idx_social_comments_crm_contact";

drop index if exists "public"."idx_social_comments_intent";

drop index if exists "public"."idx_social_comments_is_own_account";

drop index if exists "public"."idx_social_comments_reply_status";

drop index if exists "public"."idx_social_comments_timestamp";

drop index if exists "public"."idx_social_listening_pages_active";

drop index if exists "public"."idx_social_listening_pages_project_id";

drop index if exists "public"."idx_social_posts_campaign";

drop index if exists "public"."idx_social_posts_is_ad";

drop index if exists "public"."idx_social_posts_media_type";

drop index if exists "public"."idx_social_posts_meta_ad_id";

drop index if exists "public"."idx_social_posts_published";

drop index if exists "public"."idx_social_sync_logs_project";

drop index if exists "public"."idx_spend_core_events_active";

drop index if exists "public"."idx_spend_core_events_campaign";

drop index if exists "public"."idx_spend_core_events_project_day";

drop index if exists "public"."idx_spend_core_events_provider";

drop index if exists "public"."idx_subscriptions_external_id";

drop index if exists "public"."idx_survey_insights_daily_project_date";

drop index if exists "public"."idx_survey_insights_daily_survey_date";

drop index if exists "public"."idx_survey_questions_position";

drop index if exists "public"."idx_survey_questions_survey";

drop index if exists "public"."idx_survey_response_analysis_classification";

drop index if exists "public"."idx_survey_response_analysis_intent";

drop index if exists "public"."idx_survey_response_analysis_project";

drop index if exists "public"."idx_survey_response_analysis_survey";

drop index if exists "public"."idx_survey_responses_contact";

drop index if exists "public"."idx_survey_responses_email";

drop index if exists "public"."idx_survey_responses_project";

drop index if exists "public"."idx_survey_responses_survey";

drop index if exists "public"."idx_survey_webhook_keys_api_key";

drop index if exists "public"."idx_survey_webhook_keys_survey";

drop index if exists "public"."idx_surveys_default_funnel_id";

drop index if exists "public"."idx_surveys_project";

drop index if exists "public"."idx_surveys_slug";

drop index if exists "public"."idx_surveys_status";

drop index if exists "public"."idx_system_events_contact";

drop index if exists "public"."idx_system_events_created_at";

drop index if exists "public"."idx_system_events_project_event";

drop index if exists "public"."idx_system_events_project_source";

drop index if exists "public"."idx_system_learnings_project";

drop index if exists "public"."idx_system_learnings_status";

drop index if exists "public"."idx_system_learnings_type";

drop index if exists "public"."idx_terms_acceptances_accepted_at";

drop index if exists "public"."idx_terms_acceptances_user_id";

drop index if exists "public"."idx_terms_versions_is_active";

drop index if exists "public"."idx_user_activity_logs_action";

drop index if exists "public"."idx_user_activity_logs_created_at";

drop index if exists "public"."idx_user_activity_logs_user_id";

drop index if exists "public"."idx_webhook_metrics_processed_at";

drop index if exists "public"."idx_webhook_metrics_project_type";

drop index if exists "public"."idx_whatsapp_agents_project";

drop index if exists "public"."idx_whatsapp_agents_status";

drop index if exists "public"."idx_whatsapp_agents_user";

drop index if exists "public"."idx_whatsapp_conversations_assigned";

drop index if exists "public"."idx_whatsapp_conversations_contact";

drop index if exists "public"."idx_whatsapp_conversations_department";

drop index if exists "public"."idx_whatsapp_conversations_project";

drop index if exists "public"."idx_whatsapp_conversations_status";

drop index if exists "public"."idx_whatsapp_departments_project";

drop index if exists "public"."idx_whatsapp_messages_conversation";

drop index if exists "public"."idx_whatsapp_messages_created";

drop index if exists "public"."idx_whatsapp_numbers_project";

drop index if exists "public"."idx_whatsapp_numbers_status";

drop index if exists "public"."launch_products_unique";

drop index if exists "public"."ledger_official_unique_transaction";

drop index if exists "public"."meta_ad_accounts_project_account_unique";

drop index if exists "public"."meta_ad_accounts_project_id_account_id_key";

drop index if exists "public"."meta_adsets_project_adset_unique";

drop index if exists "public"."meta_audience_contacts_unique";

drop index if exists "public"."meta_campaigns_project_campaign_unique";

drop index if exists "public"."meta_insights_project_id_ad_account_id_campaign_id_adset_id_key";

drop index if exists "public"."meta_insights_unique_key";

drop index if exists "public"."metric_definitions_metric_key_key";

drop index if exists "public"."offer_mappings_project_provider_codigo_unique";

drop index if exists "public"."orders_provider_unique";

drop index if exists "public"."phase_campaigns_unique";

drop index if exists "public"."plan_features_plan_id_feature_id_key";

drop index if exists "public"."product_revenue_splits_project_id_product_id_partner_type_p_key";

drop index if exists "public"."project_credentials_project_provider_unique";

drop index if exists "public"."project_invites_project_id_email_status_key";

drop index if exists "public"."project_member_feature_permis_project_id_user_id_feature_id_key";

drop index if exists "public"."project_settings_project_id_key";

drop index if exists "public"."project_tracking_settings_project_id_key";

drop index if exists "public"."projects_public_code_key";

drop index if exists "public"."provider_order_map_unique";

drop index if exists "public"."quiz_results_session_id_key";

drop index if exists "public"."quizzes_project_slug_unique";

drop index if exists "public"."role_template_feature_permissio_role_template_id_feature_id_key";

drop index if exists "public"."role_template_feature_permissions_pkey";

drop index if exists "public"."sales_core_events_project_provider_version_unique";

drop index if exists "public"."sales_history_import_batches_pkey";

drop index if exists "public"."semantic_profiles_pkey";

drop index if exists "public"."social_comments_unique";

drop index if exists "public"."social_listening_sync_logs_pkey";

drop index if exists "public"."social_posts_unique";

drop index if exists "public"."subscriptions_user_id_key";

drop index if exists "public"."survey_ai_knowledge_base_pkey";

drop index if exists "public"."survey_insights_daily_pkey";

drop index if exists "public"."survey_questions_pkey";

drop index if exists "public"."survey_response_analysis_pkey";

drop index if exists "public"."survey_responses_pkey";

drop index if exists "public"."survey_webhook_keys_api_key_key";

drop index if exists "public"."survey_webhook_keys_pkey";

drop index if exists "public"."surveys_pkey";

drop index if exists "public"."surveys_project_id_slug_key";

drop index if exists "public"."system_events_pkey";

drop index if exists "public"."system_learnings_pkey";

drop index if exists "public"."terms_versions_pkey";

drop index if exists "public"."terms_versions_version_key";

drop index if exists "public"."unique_page_per_project";

drop index if exists "public"."unique_project_survey_kb";

drop index if exists "public"."unique_response_analysis";

drop index if exists "public"."unique_sales_history_transaction";

drop index if exists "public"."unique_survey_insights_daily";

drop index if exists "public"."unique_system_template_name";

drop index if exists "public"."whatsapp_agents_project_id_user_id_key";

drop index if exists "public"."whatsapp_conversations_project_id_remote_jid_key";

drop index if exists "public"."whatsapp_departments_project_id_name_key";

drop index if exists "public"."whatsapp_instances_instance_name_key";

drop index if exists "public"."whatsapp_instances_pkey";

drop index if exists "public"."whatsapp_numbers_phone_number_unique";

drop index if exists "public"."whatsapp_numbers_project_id_phone_number_key";

drop index if exists "public"."idx_crm_contacts_email";

drop index if exists "public"."idx_crm_contacts_status";

drop index if exists "public"."idx_crm_transactions_status";

drop index if exists "public"."idx_orders_status";

drop index if exists "public"."idx_social_comments_sentiment";

drop table "public"."funnel_optimization_suggestions";

drop table "public"."funnel_performance";

drop table "public"."role_template_feature_permissions";

drop table "public"."sales_history_import_batches";

drop table "public"."semantic_profiles";

drop table "public"."social_listening_sync_logs";

drop table "public"."survey_ai_knowledge_base";

drop table "public"."survey_insights_daily";

drop table "public"."survey_questions";

drop table "public"."survey_response_analysis";

drop table "public"."survey_responses";

drop table "public"."survey_webhook_keys";

drop table "public"."surveys";

drop table "public"."system_events";

drop table "public"."system_learnings";

drop table "public"."terms_versions";

drop table "public"."whatsapp_instances";

alter table "public"."project_member_permissions" alter column "crm" drop default;

alter table "public"."project_member_permissions" alter column "meta_ads" drop default;

alter table "public"."project_member_permissions" alter column "social_listening" drop default;

alter table "public"."project_members" alter column "role" drop default;

alter type "public"."quiz_type" rename to "quiz_type__old_version_to_be_dropped";

create type "public"."quiz_type" as enum ('lead_capture', 'segmentation', 'assessment', 'recommendation');


  create table "public"."funnel_offers" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "funnel_id" uuid not null,
    "offer_code" text not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."funnel_score_history" (
    "id" uuid not null default gen_random_uuid(),
    "funnel_id" uuid not null,
    "project_id" uuid not null,
    "score" numeric not null default 0,
    "components" jsonb,
    "calculated_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."funnel_score_history" enable row level security;


  create table "public"."integration_connections" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "provider_slug" text not null,
    "display_name" text,
    "auth_type" public.integration_auth_type not null,
    "status" public.connection_status not null default 'disconnected'::public.connection_status,
    "config_data" jsonb not null default '{}'::jsonb,
    "credentials_encrypted" jsonb,
    "external_account_id" text,
    "external_account_name" text,
    "last_sync_at" timestamp with time zone,
    "last_error_at" timestamp with time zone,
    "last_error_message" text,
    "is_primary" boolean not null default false,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."integration_connections" enable row level security;


  create table "public"."integration_oauth_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "connection_id" uuid not null,
    "project_id" uuid not null,
    "access_token_encrypted" text not null,
    "refresh_token_encrypted" text,
    "token_type" text not null default 'Bearer'::text,
    "expires_at" timestamp with time zone,
    "refresh_expires_at" timestamp with time zone,
    "scopes" text[] default '{}'::text[],
    "external_user_id" text,
    "external_user_name" text,
    "is_current" boolean not null default true,
    "issued_at" timestamp with time zone default now(),
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."integration_oauth_tokens" enable row level security;


  create table "public"."integration_providers" (
    "slug" text not null,
    "name" text not null,
    "category" public.integration_category not null,
    "auth_types" public.integration_auth_type[] not null default '{}'::public.integration_auth_type[],
    "capabilities" jsonb not null default '{}'::jsonb,
    "is_active" boolean not null default true,
    "config_schema" jsonb,
    "icon_url" text,
    "docs_url" text,
    "description" text,
    "display_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."integration_providers" enable row level security;


  create table "public"."integration_sync_logs" (
    "id" uuid not null default gen_random_uuid(),
    "connection_id" uuid not null,
    "project_id" uuid not null,
    "sync_type" public.sync_type not null,
    "status" public.sync_status not null default 'started'::public.sync_status,
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "records_processed" integer not null default 0,
    "records_created" integer not null default 0,
    "records_updated" integer not null default 0,
    "records_skipped" integer not null default 0,
    "records_failed" integer not null default 0,
    "error_code" text,
    "error_message" text,
    "error_details" jsonb,
    "metadata" jsonb default '{}'::jsonb,
    "triggered_by" public.sync_trigger not null default 'system'::public.sync_trigger,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."integration_sync_logs" enable row level security;


  create table "public"."meta_campaign_links" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "funnel_id" uuid not null,
    "campaign_id" text not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."whatsapp_contact_notes" (
    "id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid not null,
    "project_id" uuid not null,
    "content" text not null,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."whatsapp_contact_notes" enable row level security;


  create table "public"."whatsapp_quick_replies" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "title" text not null,
    "content" text not null,
    "shortcut" text,
    "category" text,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."whatsapp_quick_replies" enable row level security;

alter table "public"."project_member_permissions" alter column crm type "public"."permission_level" using crm::text::"public"."permission_level";

alter table "public"."project_member_permissions" alter column meta_ads type "public"."permission_level" using meta_ads::text::"public"."permission_level";

alter table "public"."project_member_permissions" alter column social_listening type "public"."permission_level" using social_listening::text::"public"."permission_level";

alter table "public"."project_members" alter column role type "public"."project_role" using role::text::"public"."project_role";

alter table "public"."project_member_permissions" alter column "crm" set default 'none'::public.permission_level;

alter table "public"."project_member_permissions" alter column "meta_ads" set default 'none'::public.permission_level;

alter table "public"."project_member_permissions" alter column "social_listening" set default 'none'::public.permission_level;

alter table "public"."project_members" alter column "role" set default 'operator'::public.project_role;

drop type "public"."quiz_type__old_version_to_be_dropped";

alter table "public"."admin_audit_logs" alter column "details" drop default;

alter table "public"."admin_audit_logs" alter column "target_id" set data type text using "target_id"::text;

alter table "public"."admin_notification_settings" alter column "is_enabled" drop not null;

alter table "public"."agent_decisions_log" alter column "confidence" drop not null;

alter table "public"."agent_decisions_log" alter column "decision_data" drop not null;

alter table "public"."agent_decisions_log" alter column "explanation" drop not null;

alter table "public"."agent_decisions_log" alter column "reward_score" drop default;

alter table "public"."agent_decisions_log" alter column "risk_score" drop default;

alter table "public"."agent_decisions_log" alter column "status" drop not null;

alter table "public"."ai_agents" alter column "allowed_actions" drop not null;

alter table "public"."ai_agents" alter column "boundaries" drop not null;

alter table "public"."ai_agents" alter column "confidence_threshold" drop not null;

alter table "public"."ai_agents" alter column "is_active" drop not null;

alter table "public"."ai_agents" alter column "max_actions_per_day" drop default;

alter table "public"."ai_agents" alter column "require_human_approval" drop not null;

alter table "public"."ai_agents" alter column "trigger_on" set default '{}'::jsonb;

alter table "public"."ai_agents" alter column "trigger_on" drop not null;

alter table "public"."ai_knowledge_base" alter column "commercial_keywords" drop default;

alter table "public"."ai_knowledge_base" alter column "custom_categories" drop default;

alter table "public"."ai_knowledge_base" alter column "faqs" drop default;

alter table "public"."ai_knowledge_base" alter column "min_intent_score_for_crm" drop default;

alter table "public"."ai_knowledge_base" alter column "min_intent_score_for_crm" set data type numeric using "min_intent_score_for_crm"::numeric;

alter table "public"."ai_knowledge_base" alter column "praise_keywords" drop default;

alter table "public"."ai_knowledge_base" alter column "spam_keywords" drop default;

alter table "public"."ai_knowledge_base" alter column "tone_of_voice" drop default;

alter table "public"."ai_project_quotas" alter column "current_daily_usage" drop not null;

alter table "public"."ai_project_quotas" alter column "current_monthly_usage" drop not null;

alter table "public"."ai_project_quotas" alter column "daily_limit" drop not null;

alter table "public"."ai_project_quotas" alter column "is_unlimited" drop not null;

alter table "public"."ai_project_quotas" alter column "last_daily_reset" drop not null;

alter table "public"."ai_project_quotas" alter column "last_monthly_reset" drop not null;

alter table "public"."ai_project_quotas" alter column "lovable_credits_limit" drop default;

alter table "public"."ai_project_quotas" alter column "monthly_limit" drop not null;

alter table "public"."ai_project_quotas" alter column "provider_preference" set default 'lovable'::text;

alter table "public"."ai_project_quotas" alter column "provider_preference" drop not null;

alter table "public"."ai_usage_tracking" alter column "cost_estimate" drop default;

alter table "public"."ai_usage_tracking" alter column "cost_estimate" set data type numeric using "cost_estimate"::numeric;

alter table "public"."ai_usage_tracking" alter column "input_tokens" drop default;

alter table "public"."ai_usage_tracking" alter column "items_processed" drop default;

alter table "public"."ai_usage_tracking" alter column "output_tokens" drop default;

alter table "public"."ai_usage_tracking" alter column "success" drop default;

alter table "public"."automation_executions" alter column "execution_log" drop not null;

alter table "public"."automation_executions" alter column "started_at" drop not null;

alter table "public"."automation_executions" alter column "status" drop not null;

alter table "public"."automation_flow_nodes" alter column "config" drop not null;

alter table "public"."automation_flow_nodes" alter column "position_x" drop not null;

alter table "public"."automation_flow_nodes" alter column "position_x" set data type numeric using "position_x"::numeric;

alter table "public"."automation_flow_nodes" alter column "position_y" drop not null;

alter table "public"."automation_flow_nodes" alter column "position_y" set data type numeric using "position_y"::numeric;

alter table "public"."automation_flows" alter column "is_active" drop not null;

alter table "public"."automation_flows" alter column "trigger_config" drop not null;

alter table "public"."automation_flows" alter column "trigger_type" set default 'manual'::text;

alter table "public"."automation_flows" alter column "trigger_type" drop not null;

alter table "public"."automation_flows" alter column "viewport" drop not null;

alter table "public"."automation_message_templates" alter column "content_type" drop not null;

alter table "public"."automation_message_templates" alter column "variables" drop not null;

alter table "public"."comment_metrics_daily" alter column "avg_intent_score" set data type numeric using "avg_intent_score"::numeric;

alter table "public"."comment_metrics_daily" alter column "avg_sentiment_score" set data type numeric using "avg_sentiment_score"::numeric;

alter table "public"."contact_identity_events" alter column "confidence_score" drop default;

alter table "public"."contact_identity_events" alter column "is_declared" set default false;

alter table "public"."contact_identity_events" alter column "metadata" drop default;

alter table "public"."contact_identity_events" alter column "recorded_at" drop not null;

alter table "public"."contact_identity_events" alter column "source_id" set data type text using "source_id"::text;

alter table "public"."contact_memory" alter column "confidence" drop not null;

alter table "public"."contact_memory" alter column "confidence" set data type numeric using "confidence"::numeric;

alter table "public"."contact_memory" alter column "content" drop not null;

alter table "public"."contact_memory" alter column "is_contradicted" drop not null;

alter table "public"."contact_memory" alter column "is_locked" drop not null;

alter table "public"."contact_memory" alter column "last_reinforced_at" drop not null;

alter table "public"."contact_memory" alter column "reinforcement_count" set default 0;

alter table "public"."contact_memory" alter column "reinforcement_count" drop not null;

alter table "public"."contact_memory" alter column "source_id" set data type text using "source_id"::text;

alter table "public"."contact_predictions" alter column "confidence" set default 0;

alter table "public"."contact_predictions" alter column "confidence" drop not null;

alter table "public"."contact_predictions" alter column "confidence" set data type numeric using "confidence"::numeric;

alter table "public"."contact_predictions" alter column "explanation" drop not null;

alter table "public"."contact_predictions" alter column "is_active" drop not null;

alter table "public"."contact_predictions" alter column "recommended_actions" set default '{}'::jsonb;

alter table "public"."contact_predictions" alter column "recommended_actions" drop not null;

alter table "public"."contact_predictions" alter column "risk_level" set default 'low'::text;

alter table "public"."contact_predictions" alter column "risk_level" drop not null;

alter table "public"."contact_predictions" alter column "urgency_score" set default 0;

alter table "public"."contact_predictions" alter column "urgency_score" drop not null;

alter table "public"."contact_predictions" alter column "urgency_score" set data type numeric using "urgency_score"::numeric;

alter table "public"."contact_profile_history" alter column "confidence_delta" drop not null;

alter table "public"."contact_profile_history" alter column "confidence_delta" set data type numeric using "confidence_delta"::numeric;

alter table "public"."contact_profile_history" alter column "delta_intent_vector" drop not null;

alter table "public"."contact_profile_history" alter column "delta_trait_vector" drop not null;

alter table "public"."contact_profile_history" alter column "entropy_delta" drop not null;

alter table "public"."contact_profile_history" alter column "entropy_delta" set data type numeric using "entropy_delta"::numeric;

alter table "public"."contact_profile_history" alter column "profile_snapshot" drop not null;

alter table "public"."contact_profile_history" alter column "source_id" set data type text using "source_id"::text;

alter table "public"."contact_profiles" alter column "confidence_score" drop not null;

alter table "public"."contact_profiles" alter column "confidence_score" set data type numeric using "confidence_score"::numeric;

alter table "public"."contact_profiles" alter column "entropy_score" drop not null;

alter table "public"."contact_profiles" alter column "entropy_score" set data type numeric using "entropy_score"::numeric;

alter table "public"."contact_profiles" alter column "intent_vector" drop not null;

alter table "public"."contact_profiles" alter column "last_updated_at" drop not null;

alter table "public"."contact_profiles" alter column "signal_sources" set default '{}'::jsonb;

alter table "public"."contact_profiles" alter column "signal_sources" drop not null;

alter table "public"."contact_profiles" alter column "total_signals" drop not null;

alter table "public"."contact_profiles" alter column "trait_vector" drop not null;

alter table "public"."contact_profiles" alter column "volatility_score" drop not null;

alter table "public"."contact_profiles" alter column "volatility_score" set data type numeric using "volatility_score"::numeric;

alter table "public"."crm_activities" alter column "metadata" drop default;

alter table "public"."crm_activities_tasks" alter column "activity_type" drop not null;

alter table "public"."crm_activities_tasks" alter column "priority" drop not null;

alter table "public"."crm_activities_tasks" alter column "status" drop not null;

alter table "public"."crm_cadence_steps" alter column "activity_type" drop not null;

alter table "public"."crm_cadence_steps" alter column "delay_days" drop not null;

alter table "public"."crm_cadence_steps" alter column "delay_hours" drop not null;

alter table "public"."crm_cadence_steps" alter column "priority" drop not null;

alter table "public"."crm_cadence_steps" alter column "step_order" drop not null;

alter table "public"."crm_cadences" alter column "is_active" drop not null;

alter table "public"."crm_cadences" alter column "trigger_on" set default 'manual'::text;

alter table "public"."crm_cadences" alter column "trigger_on" drop not null;

alter table "public"."crm_contact_cadences" alter column "current_step" drop not null;

alter table "public"."crm_contact_cadences" alter column "started_at" drop not null;

alter table "public"."crm_contact_cadences" alter column "status" drop not null;

alter table "public"."crm_contact_interactions" alter column "interacted_at" drop not null;

alter table "public"."crm_contact_interactions" alter column "interaction_type" drop not null;

alter table "public"."crm_contact_interactions" alter column "metadata" drop default;

alter table "public"."crm_contacts" add column "assigned_to" uuid;

alter table "public"."crm_contacts" add column "score" integer default 0;

alter table "public"."crm_contacts" alter column "custom_fields" drop default;

alter table "public"."crm_contacts" alter column "email" drop not null;

alter table "public"."crm_contacts" alter column "first_seen_at" drop not null;

alter table "public"."crm_contacts" alter column "is_team_member" drop default;

alter table "public"."crm_contacts" alter column "last_activity_at" drop not null;

alter table "public"."crm_contacts" alter column "source" drop not null;

alter table "public"."crm_contacts" alter column "status" drop not null;

alter table "public"."crm_recovery_activities" drop column "created_by";

alter table "public"."crm_recovery_activities" drop column "delivered_at";

alter table "public"."crm_recovery_activities" drop column "message";

alter table "public"."crm_recovery_activities" drop column "read_at";

alter table "public"."crm_recovery_activities" drop column "replied_at";

alter table "public"."crm_recovery_activities" drop column "sent_at";

alter table "public"."crm_recovery_activities" drop column "status";

alter table "public"."crm_recovery_activities" add column "activity_type" text not null default 'note'::text;

alter table "public"."crm_recovery_activities" add column "description" text;

alter table "public"."crm_recovery_activities" add column "performed_by" uuid;

alter table "public"."crm_recovery_activities" add column "result" text;

alter table "public"."crm_recovery_activities" alter column "metadata" drop default;

alter table "public"."crm_transactions" drop column "utm_ad";

alter table "public"."crm_transactions" drop column "utm_term";

alter table "public"."crm_transactions" alter column "funnel_id" set data type uuid using "funnel_id"::uuid;

alter table "public"."crm_transactions" alter column "product_name" drop not null;

alter table "public"."crm_transactions" alter column "status" set default 'pending'::text;

alter table "public"."crm_transactions" alter column "transaction_date" set default now();

alter table "public"."crm_webhook_keys" drop column "allowed_sources";

alter table "public"."crm_webhook_keys" drop column "api_key";

alter table "public"."crm_webhook_keys" drop column "default_funnel_id";

alter table "public"."crm_webhook_keys" drop column "default_tags";

alter table "public"."crm_webhook_keys" drop column "field_mappings";

alter table "public"."crm_webhook_keys" drop column "last_used_at";

alter table "public"."crm_webhook_keys" drop column "name";

alter table "public"."crm_webhook_keys" drop column "usage_count";

alter table "public"."crm_webhook_keys" add column "provider" text not null;

alter table "public"."crm_webhook_keys" add column "webhook_key" text not null;

alter table "public"."crm_webhook_keys" alter column "is_active" drop not null;

alter table "public"."crm_webhook_keys" disable row level security;

alter table "public"."encryption_keys" drop column "rotated_at";

alter table "public"."event_dispatch_rules" drop column "is_enabled";

alter table "public"."event_dispatch_rules" drop column "payload_mapping";

alter table "public"."event_dispatch_rules" drop column "provider";

alter table "public"."event_dispatch_rules" drop column "provider_event_name";

alter table "public"."event_dispatch_rules" drop column "system_event";

alter table "public"."event_dispatch_rules" add column "event_type" text not null;

alter table "public"."event_dispatch_rules" add column "is_active" boolean default true;

alter table "public"."event_dispatch_rules" add column "target_config" jsonb;

alter table "public"."event_dispatch_rules" add column "target_type" text not null;

alter table "public"."event_dispatch_rules" disable row level security;

alter table "public"."experience_templates" disable row level security;

alter table "public"."feature_overrides" alter column "target_type" set data type public.feature_target_type using "target_type"::text::public.feature_target_type;

alter table "public"."feature_overrides" disable row level security;

alter table "public"."features" disable row level security;

alter table "public"."finance_ledger" add column "created_at" timestamp with time zone not null default now();

alter table "public"."finance_ledger" alter column "amount" set default 0;

alter table "public"."finance_ledger" alter column "amount" drop not null;

alter table "public"."finance_ledger" alter column "amount" set data type numeric using "amount"::numeric;

alter table "public"."finance_ledger" alter column "event_type" drop not null;

alter table "public"."finance_ledger" alter column "occurred_at" drop not null;

alter table "public"."finance_ledger" alter column "project_id" drop not null;

alter table "public"."finance_ledger" alter column "provider" drop default;

alter table "public"."finance_ledger" alter column "provider" drop not null;

alter table "public"."finance_ledger" alter column "transaction_id" drop not null;

alter table "public"."finance_sync_runs" drop column "apis_synced";

alter table "public"."finance_sync_runs" drop column "created_by";

alter table "public"."finance_sync_runs" drop column "end_date";

alter table "public"."finance_sync_runs" drop column "errors";

alter table "public"."finance_sync_runs" drop column "events_created";

alter table "public"."finance_sync_runs" drop column "events_skipped";

alter table "public"."finance_sync_runs" drop column "start_date";

alter table "public"."finance_sync_runs" add column "created_at" timestamp with time zone not null default now();

alter table "public"."finance_sync_runs" add column "provider" text;

alter table "public"."finance_sync_runs" add column "records_processed" integer default 0;

alter table "public"."finance_sync_runs" alter column "project_id" drop not null;

alter table "public"."finance_sync_runs" alter column "status" set default 'pending'::text;

alter table "public"."finance_sync_runs" disable row level security;

alter table "public"."funnel_changes" drop column "anotacoes";

alter table "public"."funnel_changes" drop column "codigo_oferta";

alter table "public"."funnel_changes" drop column "data_alteracao";

alter table "public"."funnel_changes" drop column "descricao";

alter table "public"."funnel_changes" drop column "id_funil";

alter table "public"."funnel_changes" drop column "tipo_alteracao";

alter table "public"."funnel_changes" drop column "updated_at";

alter table "public"."funnel_changes" drop column "valor_anterior";

alter table "public"."funnel_changes" drop column "valor_novo";

alter table "public"."funnel_changes" add column "change_type" text not null;

alter table "public"."funnel_changes" add column "changed_at" timestamp with time zone not null default now();

alter table "public"."funnel_changes" add column "changed_by" uuid;

alter table "public"."funnel_changes" add column "description" text;

alter table "public"."funnel_changes" add column "funnel_id" uuid not null;

alter table "public"."funnel_changes" add column "metadata" jsonb;

alter table "public"."funnel_changes" alter column "project_id" set not null;

alter table "public"."funnel_changes" disable row level security;

alter table "public"."funnel_experiments" drop column "confidence_threshold";

alter table "public"."funnel_experiments" drop column "control_config";

alter table "public"."funnel_experiments" drop column "description";

alter table "public"."funnel_experiments" drop column "funnel_performance_id";

alter table "public"."funnel_experiments" drop column "min_sample_size";

alter table "public"."funnel_experiments" drop column "suggestion_id";

alter table "public"."funnel_experiments" drop column "traffic_split";

alter table "public"."funnel_experiments" drop column "variant_config";

alter table "public"."funnel_experiments" drop column "winner";

alter table "public"."funnel_experiments" add column "funnel_id" uuid not null;

alter table "public"."funnel_experiments" add column "hypothesis" text;

alter table "public"."funnel_experiments" alter column "results" drop default;

alter table "public"."funnel_experiments" alter column "status" drop not null;

alter table "public"."funnel_experiments" disable row level security;

alter table "public"."funnel_meta_accounts" alter column "meta_account_id" drop not null;

alter table "public"."funnel_meta_accounts" disable row level security;

alter table "public"."funnel_thresholds" drop column "category";

alter table "public"."funnel_thresholds" drop column "description";

alter table "public"."funnel_thresholds" drop column "threshold_key";

alter table "public"."funnel_thresholds" drop column "threshold_value";

alter table "public"."funnel_thresholds" add column "critical_value" numeric;

alter table "public"."funnel_thresholds" add column "direction" text default 'above'::text;

alter table "public"."funnel_thresholds" add column "metric_key" text not null;

alter table "public"."funnel_thresholds" add column "warning_value" numeric;

alter table "public"."funnel_thresholds" alter column "project_id" set not null;

alter table "public"."funnel_thresholds" disable row level security;

alter table "public"."hotmart_backfill_runs" drop column "end_date";

alter table "public"."hotmart_backfill_runs" drop column "errors";

alter table "public"."hotmart_backfill_runs" drop column "events_created";

alter table "public"."hotmart_backfill_runs" drop column "events_skipped";

alter table "public"."hotmart_backfill_runs" drop column "executed_by";

alter table "public"."hotmart_backfill_runs" drop column "start_date";

alter table "public"."hotmart_backfill_runs" drop column "total_sales_found";

alter table "public"."hotmart_backfill_runs" add column "metadata" jsonb;

alter table "public"."hotmart_backfill_runs" add column "records_processed" integer default 0;

alter table "public"."hotmart_backfill_runs" alter column "started_at" drop not null;

alter table "public"."hotmart_backfill_runs" alter column "status" set default 'pending'::text;

alter table "public"."hotmart_backfill_runs" alter column "status" drop not null;

alter table "public"."hotmart_product_plans" add column "currency" text default 'BRL'::text;

alter table "public"."hotmart_product_plans" add column "plan_name" text;

alter table "public"."hotmart_product_plans" add column "price" numeric;

alter table "public"."hotmart_product_plans" add column "project_id" uuid;

alter table "public"."hotmart_product_plans" add column "recurrence" text;

alter table "public"."hotmart_product_plans" alter column "is_active" drop not null;

alter table "public"."hotmart_product_plans" alter column "plan_id" drop not null;

alter table "public"."hotmart_product_plans" alter column "plan_id" set data type text using "plan_id"::text;

alter table "public"."hotmart_sales" drop column "due_date";

alter table "public"."hotmart_sales" drop column "exchange_rate";

alter table "public"."hotmart_sales" drop column "free_period";

alter table "public"."hotmart_sales" drop column "has_coproduction";

alter table "public"."hotmart_sales" drop column "invoice_number";

alter table "public"."hotmart_sales" drop column "items_quantity";

alter table "public"."hotmart_sales" drop column "origin";

alter table "public"."hotmart_sales" drop column "original_price";

alter table "public"."hotmart_sales" drop column "producer_document";

alter table "public"."hotmart_sales" drop column "producer_name";

alter table "public"."hotmart_sales" drop column "product_currency";

alter table "public"."hotmart_sales" drop column "received_value";

alter table "public"."hotmart_sales" drop column "sale_attribution_type";

alter table "public"."hotmart_sales" drop column "shipping_value";

alter table "public"."hotmart_sales" alter column "is_upgrade" drop default;

alter table "public"."hotmart_sales" alter column "last_synced_at" drop default;

alter table "public"."hotmart_sales" alter column "net_revenue" set data type numeric using "net_revenue"::numeric;

alter table "public"."hotmart_sales" alter column "offer_price" set data type numeric using "offer_price"::numeric;

alter table "public"."hotmart_sales" alter column "product_name" drop not null;

alter table "public"."hotmart_sales" alter column "product_price" set data type numeric using "product_price"::numeric;

alter table "public"."hotmart_sales" alter column "project_id" drop not null;

alter table "public"."hotmart_sales" alter column "recurrence" set data type text using "recurrence"::text;

alter table "public"."hotmart_sales" alter column "sale_category" drop default;

alter table "public"."hotmart_sales" alter column "status" drop not null;

alter table "public"."hotmart_sales" alter column "total_price" set data type numeric using "total_price"::numeric;

alter table "public"."hotmart_sales" alter column "transaction_id" drop not null;

alter table "public"."launch_phases" drop column "campaign_name_pattern";

alter table "public"."launch_phases" drop column "is_active";

alter table "public"."launch_phases" drop column "notes";

alter table "public"."launch_phases" drop column "phase_order";

alter table "public"."launch_phases" drop column "primary_metric";

alter table "public"."launch_phases" add column "config" jsonb default '{}'::jsonb;

alter table "public"."launch_phases" add column "status" text default 'planned'::text;

alter table "public"."launch_products" drop column "lot_name";

alter table "public"."launch_products" drop column "offer_mapping_id";

alter table "public"."launch_products" drop column "product_type";

alter table "public"."launch_products" add column "currency" text default 'BRL'::text;

alter table "public"."launch_products" add column "position_type" text;

alter table "public"."launch_products" add column "price" numeric;

alter table "public"."launch_products" add column "product_code" text;

alter table "public"."launch_products" add column "product_name" text not null;

alter table "public"."launch_products" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."ledger_events" add column "description" text;

alter table "public"."ledger_events" add column "event_date" timestamp with time zone default now();

alter table "public"."ledger_events" add column "metadata" jsonb default '{}'::jsonb;

alter table "public"."ledger_events" alter column "confidence_level" drop default;

alter table "public"."ledger_events" alter column "currency" drop not null;

alter table "public"."ledger_events" alter column "provider" drop not null;

alter table "public"."ledger_events" alter column "reference_period" set data type text using "reference_period"::text;

alter table "public"."ledger_events" alter column "source_origin" drop default;

alter table "public"."ledger_events" alter column "source_type" drop default;

alter table "public"."ledger_import_batches" drop column "divergence_count";

alter table "public"."ledger_import_batches" drop column "error_message";

alter table "public"."ledger_import_batches" drop column "error_rows";

alter table "public"."ledger_import_batches" drop column "file_size";

alter table "public"."ledger_import_batches" drop column "imported_at";

alter table "public"."ledger_import_batches" drop column "imported_rows";

alter table "public"."ledger_import_batches" drop column "new_transactions_count";

alter table "public"."ledger_import_batches" drop column "period_end";

alter table "public"."ledger_import_batches" drop column "period_start";

alter table "public"."ledger_import_batches" drop column "reconciled_count";

alter table "public"."ledger_import_batches" drop column "skipped_rows";

alter table "public"."ledger_import_batches" drop column "total_affiliate_commissions";

alter table "public"."ledger_import_batches" drop column "total_coproducer_commissions";

alter table "public"."ledger_import_batches" drop column "total_gross";

alter table "public"."ledger_import_batches" drop column "total_net";

alter table "public"."ledger_import_batches" drop column "total_platform_fees";

alter table "public"."ledger_import_batches" drop column "total_rows";

alter table "public"."ledger_import_batches" drop column "total_taxes";

alter table "public"."ledger_import_batches" add column "completed_at" timestamp with time zone;

alter table "public"."ledger_import_batches" add column "errors" jsonb;

alter table "public"."ledger_import_batches" add column "records_imported" integer default 0;

alter table "public"."ledger_import_batches" add column "records_skipped" integer default 0;

alter table "public"."ledger_import_batches" add column "records_total" integer default 0;

alter table "public"."ledger_import_batches" add column "source" text not null;

alter table "public"."ledger_import_batches" alter column "created_at" set not null;

alter table "public"."ledger_import_batches" alter column "file_name" drop not null;

alter table "public"."ledger_import_batches" alter column "status" set default 'pending'::text;

alter table "public"."ledger_official" drop column "affiliate_code";

alter table "public"."ledger_official" drop column "affiliate_commission";

alter table "public"."ledger_official" drop column "affiliate_name";

alter table "public"."ledger_official" drop column "buyer_email";

alter table "public"."ledger_official" drop column "buyer_name";

alter table "public"."ledger_official" drop column "confirmation_date";

alter table "public"."ledger_official" drop column "coproducer_commission";

alter table "public"."ledger_official" drop column "coproducer_name";

alter table "public"."ledger_official" drop column "divergence_amount";

alter table "public"."ledger_official" drop column "divergence_csv_value";

alter table "public"."ledger_official" drop column "divergence_notes";

alter table "public"."ledger_official" drop column "divergence_type";

alter table "public"."ledger_official" drop column "divergence_webhook_value";

alter table "public"."ledger_official" drop column "exchange_rate";

alter table "public"."ledger_official" drop column "gross_value";

alter table "public"."ledger_official" drop column "has_divergence";

alter table "public"."ledger_official" drop column "import_batch_id";

alter table "public"."ledger_official" drop column "imported_at";

alter table "public"."ledger_official" drop column "imported_by";

alter table "public"."ledger_official" drop column "installments";

alter table "public"."ledger_official" drop column "is_reconciled";

alter table "public"."ledger_official" drop column "net_value";

alter table "public"."ledger_official" drop column "net_value_brl";

alter table "public"."ledger_official" drop column "offer_code";

alter table "public"."ledger_official" drop column "offer_name";

alter table "public"."ledger_official" drop column "offer_price";

alter table "public"."ledger_official" drop column "original_currency";

alter table "public"."ledger_official" drop column "payment_method";

alter table "public"."ledger_official" drop column "payment_type";

alter table "public"."ledger_official" drop column "payout_date";

alter table "public"."ledger_official" drop column "payout_id";

alter table "public"."ledger_official" drop column "platform_fee";

alter table "public"."ledger_official" drop column "product_code";

alter table "public"."ledger_official" drop column "product_name";

alter table "public"."ledger_official" drop column "product_price";

alter table "public"."ledger_official" drop column "raw_csv_row";

alter table "public"."ledger_official" drop column "reconciled_at";

alter table "public"."ledger_official" drop column "reconciled_by";

alter table "public"."ledger_official" drop column "sale_date";

alter table "public"."ledger_official" drop column "source_file_name";

alter table "public"."ledger_official" drop column "source_row_number";

alter table "public"."ledger_official" drop column "status";

alter table "public"."ledger_official" drop column "taxes";

alter table "public"."ledger_official" drop column "updated_at";

alter table "public"."ledger_official" add column "amount" numeric not null default 0;

alter table "public"."ledger_official" add column "batch_id" uuid;

alter table "public"."ledger_official" add column "currency" text default 'BRL'::text;

alter table "public"."ledger_official" add column "event_type" text not null;

alter table "public"."ledger_official" add column "occurred_at" timestamp with time zone;

alter table "public"."ledger_official" add column "provider" text;

alter table "public"."ledger_official" add column "reference_period" date;

alter table "public"."ledger_official" add column "source_type" text default 'official'::text;

alter table "public"."ledger_official" alter column "created_at" set not null;

alter table "public"."ledger_official" alter column "transaction_id" drop not null;

alter table "public"."meta_ad_accounts" drop column "timezone_name";

alter table "public"."meta_ad_accounts" add column "timezone" text default 'America/Sao_Paulo'::text;

alter table "public"."meta_ad_accounts" alter column "currency" set default 'BRL'::text;

alter table "public"."meta_ad_accounts" alter column "project_id" drop not null;

alter table "public"."meta_ad_audiences" drop column "error_message";

alter table "public"."meta_ad_audiences" drop column "estimated_size";

alter table "public"."meta_ad_audiences" drop column "last_sync_at";

alter table "public"."meta_ad_audiences" drop column "meta_audience_id";

alter table "public"."meta_ad_audiences" drop column "segment_config";

alter table "public"."meta_ad_audiences" drop column "segment_type";

alter table "public"."meta_ad_audiences" drop column "sync_frequency";

alter table "public"."meta_ad_audiences" add column "approximate_count" integer;

alter table "public"."meta_ad_audiences" add column "audience_id" text;

alter table "public"."meta_ad_audiences" add column "audience_type" text default 'custom'::text;

alter table "public"."meta_ad_audiences" add column "description" text;

alter table "public"."meta_ad_audiences" add column "subtype" text;

alter table "public"."meta_ad_audiences" alter column "ad_account_id" drop not null;

alter table "public"."meta_ad_audiences" alter column "ad_account_id" set data type uuid using "ad_account_id"::uuid;

alter table "public"."meta_ad_audiences" alter column "status" drop default;

alter table "public"."meta_ad_audiences" alter column "status" drop not null;

alter table "public"."meta_ads" drop column "created_time";

alter table "public"."meta_ads" add column "name" text;

alter table "public"."meta_ads" alter column "ad_account_id" set default ''::text;

alter table "public"."meta_ads" alter column "adset_id" drop not null;

alter table "public"."meta_ads" alter column "campaign_id" drop not null;

alter table "public"."meta_ads" alter column "project_id" drop not null;

alter table "public"."meta_adsets" drop column "created_time";

alter table "public"."meta_adsets" drop column "daily_budget";

alter table "public"."meta_adsets" drop column "end_time";

alter table "public"."meta_adsets" drop column "lifetime_budget";

alter table "public"."meta_adsets" drop column "start_time";

alter table "public"."meta_adsets" drop column "targeting";

alter table "public"."meta_adsets" add column "name" text;

alter table "public"."meta_adsets" alter column "ad_account_id" set default ''::text;

alter table "public"."meta_adsets" alter column "campaign_id" drop not null;

alter table "public"."meta_adsets" alter column "project_id" drop not null;

alter table "public"."meta_audience_contacts" drop column "email_hash";

alter table "public"."meta_audience_contacts" drop column "first_name_hash";

alter table "public"."meta_audience_contacts" drop column "last_name_hash";

alter table "public"."meta_audience_contacts" drop column "phone_hash";

alter table "public"."meta_audience_contacts" drop column "removed_at";

alter table "public"."meta_audience_contacts" drop column "synced_at";

alter table "public"."meta_audience_contacts" add column "added_at" timestamp with time zone default now();

alter table "public"."meta_audience_contacts" add column "created_at" timestamp with time zone not null default now();

alter table "public"."meta_audience_contacts" add column "status" text default 'pending'::text;

alter table "public"."meta_audience_contacts" disable row level security;

alter table "public"."meta_audience_sync_logs" drop column "contacts_added";

alter table "public"."meta_audience_sync_logs" drop column "contacts_removed";

alter table "public"."meta_audience_sync_logs" drop column "contacts_total";

alter table "public"."meta_audience_sync_logs" drop column "duration_ms";

alter table "public"."meta_audience_sync_logs" drop column "errors";

alter table "public"."meta_audience_sync_logs" drop column "executed_at";

alter table "public"."meta_audience_sync_logs" add column "action" text not null;

alter table "public"."meta_audience_sync_logs" add column "completed_at" timestamp with time zone;

alter table "public"."meta_audience_sync_logs" add column "contacts_count" integer default 0;

alter table "public"."meta_audience_sync_logs" add column "created_at" timestamp with time zone not null default now();

alter table "public"."meta_audience_sync_logs" add column "error_message" text;

alter table "public"."meta_audience_sync_logs" add column "project_id" uuid not null;

alter table "public"."meta_audience_sync_logs" alter column "status" set default 'pending'::text;

alter table "public"."meta_audience_sync_logs" alter column "status" drop not null;

alter table "public"."meta_campaigns" drop column "created_time";

alter table "public"."meta_campaigns" drop column "daily_budget";

alter table "public"."meta_campaigns" drop column "lifetime_budget";

alter table "public"."meta_campaigns" drop column "start_time";

alter table "public"."meta_campaigns" drop column "stop_time";

alter table "public"."meta_campaigns" add column "name" text;

alter table "public"."meta_campaigns" alter column "ad_account_id" drop not null;

alter table "public"."meta_campaigns" alter column "project_id" drop not null;

alter table "public"."meta_insights" alter column "ad_account_id" drop not null;

alter table "public"."meta_insights" alter column "date_start" drop not null;

alter table "public"."meta_insights" alter column "date_stop" drop not null;

alter table "public"."meta_insights" alter column "project_id" drop not null;

alter table "public"."meta_lookalike_audiences" drop column "error_message";

alter table "public"."meta_lookalike_audiences" drop column "meta_lookalike_id";

alter table "public"."meta_lookalike_audiences" drop column "percentage";

alter table "public"."meta_lookalike_audiences" add column "lookalike_audience_id" text;

alter table "public"."meta_lookalike_audiences" add column "project_id" uuid not null;

alter table "public"."meta_lookalike_audiences" add column "ratio" numeric;

alter table "public"."meta_lookalike_audiences" alter column "country" drop default;

alter table "public"."meta_lookalike_audiences" alter column "country" drop not null;

alter table "public"."meta_lookalike_audiences" alter column "name" drop not null;

alter table "public"."meta_lookalike_audiences" alter column "source_audience_id" drop not null;

alter table "public"."meta_lookalike_audiences" alter column "status" drop default;

alter table "public"."meta_lookalike_audiences" alter column "status" drop not null;

alter table "public"."meta_lookalike_audiences" disable row level security;

alter table "public"."metric_definitions" drop column "display_order";

alter table "public"."metric_definitions" drop column "metric_key";

alter table "public"."metric_definitions" drop column "metric_name";

alter table "public"."metric_definitions" add column "key" text not null;

alter table "public"."metric_definitions" add column "name" text not null;

alter table "public"."metric_definitions" alter column "category" drop default;

alter table "public"."metric_definitions" alter column "category" drop not null;

alter table "public"."metric_definitions" disable row level security;

alter table "public"."notifications" add column "project_id" uuid;

alter table "public"."notifications" alter column "is_read" drop not null;

alter table "public"."notifications" alter column "message" drop not null;

alter table "public"."notifications" alter column "metadata" drop default;

alter table "public"."notifications" alter column "type" drop not null;

alter table "public"."order_items" add column "offer_code" text;

alter table "public"."order_items" add column "product_code" text;

alter table "public"."order_items" add column "project_id" uuid not null;

alter table "public"."order_items" alter column "item_type" drop default;

alter table "public"."order_items" alter column "item_type" drop not null;

alter table "public"."orders" add column "cancelled_at" timestamp with time zone;

alter table "public"."orders" add column "coupon" text;

alter table "public"."orders" add column "customer_paid_brl" numeric;

alter table "public"."orders" add column "metadata" jsonb default '{}'::jsonb;

alter table "public"."orders" add column "net_revenue" numeric default 0;

alter table "public"."orders" add column "order_date" timestamp with time zone default now();

alter table "public"."orders" add column "platform" text default 'hotmart'::text;

alter table "public"."orders" add column "refunded_at" timestamp with time zone;

alter table "public"."orders" add column "src" text;

alter table "public"."orders" add column "utm_ad" text;

alter table "public"."orders" add column "utm_content" text;

alter table "public"."orders" add column "utm_medium" text;

alter table "public"."orders" add column "utm_term" text;

alter table "public"."orders" alter column "currency" drop not null;

alter table "public"."orders" alter column "gross_base" drop default;

alter table "public"."orders" alter column "ledger_status" drop default;

alter table "public"."orders" alter column "producer_net" drop default;

alter table "public"."orders" alter column "producer_net_brl" set data type numeric using "producer_net_brl"::numeric;

alter table "public"."orders" alter column "provider" set default 'hotmart'::text;

alter table "public"."orders" alter column "provider" drop not null;

alter table "public"."orders" alter column "provider_order_id" drop not null;

alter table "public"."path_events" drop column "conversion_value";

alter table "public"."path_events" drop column "event_data";

alter table "public"."path_events" drop column "experiment_id";

alter table "public"."path_events" drop column "funnel_performance_id";

alter table "public"."path_events" drop column "path_signature";

alter table "public"."path_events" drop column "time_in_path";

alter table "public"."path_events" drop column "variant";

alter table "public"."path_events" add column "metadata" jsonb;

alter table "public"."path_events" add column "page_name" text;

alter table "public"."path_events" add column "page_url" text;

alter table "public"."path_events" disable row level security;

alter table "public"."personalization_contexts" drop column "channel";

alter table "public"."personalization_contexts" drop column "current_intent";

alter table "public"."personalization_contexts" drop column "dominant_trait";

alter table "public"."personalization_contexts" drop column "excluded_memory_types";

alter table "public"."personalization_contexts" drop column "expires_at";

alter table "public"."personalization_contexts" drop column "human_override";

alter table "public"."personalization_contexts" drop column "memory_signals";

alter table "public"."personalization_contexts" drop column "personalization_depth";

alter table "public"."personalization_contexts" drop column "prediction_signals";

alter table "public"."personalization_contexts" drop column "profile_snapshot";

alter table "public"."personalization_contexts" drop column "session_id";

alter table "public"."personalization_contexts" add column "context_data" jsonb default '{}'::jsonb;

alter table "public"."personalization_contexts" add column "context_type" text not null;

alter table "public"."personalization_logs" drop column "applied";

alter table "public"."personalization_logs" drop column "channel";

alter table "public"."personalization_logs" drop column "content_original";

alter table "public"."personalization_logs" drop column "content_personalized";

alter table "public"."personalization_logs" drop column "context_id";

alter table "public"."personalization_logs" drop column "directives";

alter table "public"."personalization_logs" drop column "outcome";

alter table "public"."personalization_logs" drop column "outcome_data";

alter table "public"."personalization_logs" drop column "session_id";

alter table "public"."personalization_logs" drop column "tokens_resolved";

alter table "public"."personalization_logs" add column "action_data" jsonb default '{}'::jsonb;

alter table "public"."personalization_logs" add column "action_type" text not null;

alter table "public"."personalization_logs" disable row level security;

alter table "public"."phase_campaigns" alter column "campaign_id" drop not null;

alter table "public"."phase_campaigns" alter column "campaign_id" set data type uuid using "campaign_id"::uuid;

alter table "public"."phase_campaigns" disable row level security;

alter table "public"."plan_features" alter column "updated_at" drop not null;

alter table "public"."plan_features" disable row level security;

alter table "public"."plans" add column "currency" text default 'BRL'::text;

alter table "public"."plans" add column "features" jsonb default '{}'::jsonb;

alter table "public"."plans" add column "interval" text default 'monthly'::text;

alter table "public"."plans" add column "price" numeric default 0;

alter table "public"."plans" add column "slug" text;

alter table "public"."plans" add column "sort_order" integer default 0;

alter table "public"."plans" alter column "created_at" set not null;

alter table "public"."plans" alter column "is_public" drop not null;

alter table "public"."plans" alter column "max_members" drop not null;

alter table "public"."plans" alter column "max_projects" drop not null;

alter table "public"."plans" alter column "max_users_per_project" drop not null;

alter table "public"."plans" alter column "type" set default 'free'::character varying;

alter table "public"."plans" alter column "type" drop not null;

alter table "public"."plans" alter column "type" set data type character varying(255) using "type"::character varying(255);

alter table "public"."plans" alter column "updated_at" set not null;

alter table "public"."product_revenue_splits" add column "description" text;

alter table "public"."product_revenue_splits" add column "financial_core_start_date" date;

alter table "public"."product_revenue_splits" add column "offer_code" text;

alter table "public"."product_revenue_splits" add column "product_code" text not null;

alter table "public"."product_revenue_splits" add column "split_type" text default 'percentage'::text;

alter table "public"."product_revenue_splits" add column "split_value" numeric default 0;

alter table "public"."product_revenue_splits" alter column "is_active" drop not null;

alter table "public"."product_revenue_splits" alter column "partner_type" drop not null;

alter table "public"."product_revenue_splits" alter column "percentage" set default 0;

alter table "public"."product_revenue_splits" alter column "percentage" drop not null;

alter table "public"."product_revenue_splits" alter column "percentage" set data type numeric using "percentage"::numeric;

alter table "public"."product_revenue_splits" alter column "product_id" drop not null;

alter table "public"."profiles" alter column "account_activated" set not null;

alter table "public"."profiles" alter column "can_create_projects" set not null;

alter table "public"."profiles" alter column "is_active" set not null;

alter table "public"."profiles" alter column "max_projects" set not null;

alter table "public"."profiles" alter column "onboarding_completed" set not null;

alter table "public"."profiles" alter column "signup_source" set default 'organic'::text;

alter table "public"."profiles" alter column "whatsapp_opt_in" set not null;

alter table "public"."project_credentials" drop column "hotmart_access_token";

alter table "public"."project_credentials" drop column "hotmart_connected_at";

alter table "public"."project_credentials" drop column "hotmart_expires_at";

alter table "public"."project_credentials" drop column "hotmart_refresh_token";

alter table "public"."project_credentials" drop column "hotmart_user_id";

alter table "public"."project_invites" drop column "permissions_analise";

alter table "public"."project_invites" drop column "permissions_automacoes";

alter table "public"."project_invites" drop column "permissions_chat_ao_vivo";

alter table "public"."project_invites" drop column "permissions_configuracoes";

alter table "public"."project_invites" drop column "permissions_crm";

alter table "public"."project_invites" drop column "permissions_dashboard";

alter table "public"."project_invites" drop column "permissions_insights";

alter table "public"."project_invites" drop column "permissions_lancamentos";

alter table "public"."project_invites" drop column "permissions_meta_ads";

alter table "public"."project_invites" drop column "permissions_ofertas";

alter table "public"."project_invites" drop column "permissions_pesquisas";

alter table "public"."project_invites" drop column "permissions_social_listening";

alter table "public"."project_invites" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."project_invites" alter column "status" set default 'pending'::text;

alter table "public"."project_invites" alter column "status" set data type text using "status"::text;

alter table "public"."project_member_feature_permissions" drop column "project_id";

alter table "public"."project_member_feature_permissions" drop column "updated_at";

alter table "public"."project_member_feature_permissions" drop column "user_id";

alter table "public"."project_member_feature_permissions" add column "member_id" uuid not null;

alter table "public"."project_member_feature_permissions" alter column "permission_level" set default 'view'::text;

alter table "public"."project_member_feature_permissions" alter column "permission_level" drop not null;

alter table "public"."project_member_permissions" drop column "analise";

alter table "public"."project_member_permissions" drop column "automacoes";

alter table "public"."project_member_permissions" drop column "chat_ao_vivo";

alter table "public"."project_member_permissions" drop column "configuracoes";

alter table "public"."project_member_permissions" drop column "dashboard";

alter table "public"."project_member_permissions" drop column "insights";

alter table "public"."project_member_permissions" drop column "lancamentos";

alter table "public"."project_member_permissions" drop column "ofertas";

alter table "public"."project_member_permissions" drop column "pesquisas";

alter table "public"."project_member_permissions" add column "automations" public.permission_level not null default 'none'::public.permission_level;

alter table "public"."project_member_permissions" add column "financeiro" public.permission_level not null default 'none'::public.permission_level;

alter table "public"."project_member_permissions" add column "settings" public.permission_level not null default 'none'::public.permission_level;

alter table "public"."project_member_permissions" add column "whatsapp" public.permission_level not null default 'none'::public.permission_level;

alter table "public"."project_member_permissions" alter column "crm" set default 'view'::public.permission_level;

alter table "public"."project_member_permissions" alter column "meta_ads" set default 'view'::public.permission_level;

alter table "public"."project_member_permissions" alter column "social_listening" set default 'view'::public.permission_level;

alter table "public"."project_member_permissions" alter column "social_listening" set not null;

alter table "public"."project_members" drop column "joined_at";

alter table "public"."project_members" drop column "role_template_id";

alter table "public"."project_members" alter column "project_id" drop not null;

alter table "public"."project_members" alter column "role" drop not null;

alter table "public"."project_members" alter column "user_id" drop not null;

alter table "public"."project_modules" alter column "is_enabled" set default true;

alter table "public"."project_modules" alter column "is_enabled" drop not null;

alter table "public"."project_settings" alter column "financial_core_start_date" drop not null;

alter table "public"."project_tracking_settings" drop column "enable_browser_events";

alter table "public"."project_tracking_settings" drop column "enable_server_events";

alter table "public"."project_tracking_settings" drop column "gtag_id";

alter table "public"."project_tracking_settings" drop column "meta_pixel_id";

alter table "public"."project_tracking_settings" drop column "tiktok_pixel_id";

alter table "public"."project_tracking_settings" add column "is_active" boolean default true;

alter table "public"."project_tracking_settings" add column "tracking_key" text not null;

alter table "public"."project_tracking_settings" add column "tracking_value" text;

alter table "public"."project_tracking_settings" disable row level security;

alter table "public"."projects" alter column "created_at" drop not null;

alter table "public"."projects" alter column "max_members" drop not null;

alter table "public"."projects" alter column "public_code" drop not null;

alter table "public"."projects" alter column "public_code" set data type text using "public_code"::text;

alter table "public"."projects" alter column "updated_at" drop not null;

alter table "public"."projects" alter column "user_id" drop not null;

alter table "public"."provider_event_log" add column "error_stack" text;

alter table "public"."provider_event_log" alter column "created_at" drop not null;

alter table "public"."provider_event_log" alter column "provider_event_id" drop not null;

alter table "public"."provider_event_log" alter column "raw_payload" drop default;

alter table "public"."provider_event_log" alter column "raw_payload" drop not null;

alter table "public"."provider_event_log" alter column "received_at" drop not null;

alter table "public"."provider_event_log" alter column "status" drop default;

alter table "public"."provider_event_log" alter column "status" drop not null;

alter table "public"."provider_event_log" disable row level security;

alter table "public"."provider_order_map" drop column "provider_transaction_id";

alter table "public"."provider_order_map" add column "provider_order_id" text not null;

alter table "public"."provider_order_map" alter column "order_id" drop not null;

alter table "public"."provider_order_map" disable row level security;

alter table "public"."quiz_answers" drop column "answer_text";

alter table "public"."quiz_answers" drop column "answer_value";

alter table "public"."quiz_answers" add column "text_answer" text;

alter table "public"."quiz_answers" disable row level security;

alter table "public"."quiz_events" drop column "contact_id";

alter table "public"."quiz_events" drop column "event_name";

alter table "public"."quiz_events" drop column "payload";

alter table "public"."quiz_events" add column "event_data" jsonb default '{}'::jsonb;

alter table "public"."quiz_events" add column "event_type" text not null;

alter table "public"."quiz_events" add column "quiz_id" uuid not null;

alter table "public"."quiz_events" alter column "session_id" drop not null;

alter table "public"."quiz_options" drop column "end_quiz";

alter table "public"."quiz_options" drop column "intent_vector";

alter table "public"."quiz_options" drop column "label";

alter table "public"."quiz_options" drop column "next_block_id";

alter table "public"."quiz_options" drop column "next_question_id";

alter table "public"."quiz_options" drop column "order_index";

alter table "public"."quiz_options" drop column "traits_vector";

alter table "public"."quiz_options" drop column "value";

alter table "public"."quiz_options" drop column "weight";

alter table "public"."quiz_options" add column "image_url" text;

alter table "public"."quiz_options" add column "intent_tags" jsonb default '{}'::jsonb;

alter table "public"."quiz_options" add column "option_order" integer default 0;

alter table "public"."quiz_options" add column "option_text" text not null;

alter table "public"."quiz_options" add column "score_value" numeric default 0;

alter table "public"."quiz_options" add column "trait_tags" jsonb default '{}'::jsonb;

alter table "public"."quiz_options" disable row level security;

alter table "public"."quiz_outcome_logs" drop column "actions_executed";

alter table "public"."quiz_outcome_logs" drop column "contact_id";

alter table "public"."quiz_outcome_logs" drop column "decision_trace";

alter table "public"."quiz_outcome_logs" drop column "evaluation_time_ms";

alter table "public"."quiz_outcome_logs" drop column "project_id";

alter table "public"."quiz_outcome_logs" drop column "quiz_session_id";

alter table "public"."quiz_outcome_logs" add column "action_data" jsonb;

alter table "public"."quiz_outcome_logs" add column "action_type" text;

alter table "public"."quiz_outcome_logs" add column "executed_at" timestamp with time zone default now();

alter table "public"."quiz_outcome_logs" add column "result_id" uuid not null;

alter table "public"."quiz_outcome_logs" alter column "outcome_id" set not null;

alter table "public"."quiz_outcome_logs" disable row level security;

alter table "public"."quiz_outcomes" drop column "actions";

alter table "public"."quiz_outcomes" drop column "conditions";

alter table "public"."quiz_outcomes" drop column "end_screen_override";

alter table "public"."quiz_outcomes" drop column "is_active";

alter table "public"."quiz_outcomes" drop column "priority";

alter table "public"."quiz_outcomes" drop column "updated_at";

alter table "public"."quiz_outcomes" add column "cta_text" text;

alter table "public"."quiz_outcomes" add column "cta_url" text;

alter table "public"."quiz_outcomes" add column "image_url" text;

alter table "public"."quiz_outcomes" add column "max_score" numeric;

alter table "public"."quiz_outcomes" add column "min_score" numeric;

alter table "public"."quiz_outcomes" add column "outcome_order" integer default 0;

alter table "public"."quiz_outcomes" add column "redirect_url" text;

alter table "public"."quiz_outcomes" add column "trait_match" jsonb default '{}'::jsonb;

alter table "public"."quiz_outcomes" disable row level security;

alter table "public"."quiz_question_conditions" drop column "condition_payload";

alter table "public"."quiz_question_conditions" drop column "group_id";

alter table "public"."quiz_question_conditions" drop column "is_active";

alter table "public"."quiz_question_conditions" drop column "logical_operator";

alter table "public"."quiz_question_conditions" drop column "order_index";

alter table "public"."quiz_question_conditions" drop column "updated_at";

alter table "public"."quiz_question_conditions" add column "depends_on_option_id" uuid;

alter table "public"."quiz_question_conditions" add column "depends_on_question_id" uuid;

alter table "public"."quiz_question_conditions" alter column "condition_type" set default 'show_if'::text;

alter table "public"."quiz_question_conditions" alter column "condition_type" drop not null;

alter table "public"."quiz_questions" drop column "dynamic_weight_rules";

alter table "public"."quiz_questions" drop column "is_hidden";

alter table "public"."quiz_questions" drop column "order_index";

alter table "public"."quiz_questions" drop column "subtitle";

alter table "public"."quiz_questions" drop column "title";

alter table "public"."quiz_questions" drop column "type";

alter table "public"."quiz_questions" drop column "visibility_type";

alter table "public"."quiz_questions" add column "question_order" integer default 0;

alter table "public"."quiz_questions" add column "question_text" text not null;

alter table "public"."quiz_questions" add column "question_type" text default 'single_choice'::text;

alter table "public"."quiz_questions" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."quiz_questions" alter column "is_required" drop not null;

alter table "public"."quiz_questions" disable row level security;

alter table "public"."quiz_results" drop column "confidence_score";

alter table "public"."quiz_results" drop column "decision_path";

alter table "public"."quiz_results" drop column "entropy_score";

alter table "public"."quiz_results" drop column "flow_type";

alter table "public"."quiz_results" drop column "questions_answered";

alter table "public"."quiz_results" drop column "questions_skipped";

alter table "public"."quiz_results" drop column "semantic_interpretation";

alter table "public"."quiz_results" drop column "semantic_profile_id";

alter table "public"."quiz_results" add column "contact_id" uuid;

alter table "public"."quiz_results" add column "outcome_id" uuid;

alter table "public"."quiz_results" add column "quiz_id" uuid not null;

alter table "public"."quiz_sessions" drop column "accumulated_vectors";

alter table "public"."quiz_sessions" drop column "current_question_id";

alter table "public"."quiz_sessions" drop column "decision_path";

alter table "public"."quiz_sessions" drop column "flow_metadata";

alter table "public"."quiz_sessions" drop column "injected_question_ids";

alter table "public"."quiz_sessions" drop column "ip_hash";

alter table "public"."quiz_sessions" drop column "skipped_question_ids";

alter table "public"."quiz_sessions" drop column "user_agent";

alter table "public"."quiz_sessions" drop column "utm_data";

alter table "public"."quiz_sessions" drop column "visited_question_ids";

alter table "public"."quiz_sessions" add column "metadata" jsonb default '{}'::jsonb;

alter table "public"."quiz_sessions" alter column "started_at" drop not null;

alter table "public"."quiz_sessions" alter column "status" set default 'in_progress'::text;

alter table "public"."quiz_sessions" alter column "status" drop not null;

alter table "public"."quiz_sessions" alter column "status" set data type text using "status"::text;

alter table "public"."quizzes" drop column "adaptive_config";

alter table "public"."quizzes" drop column "allow_anonymous";

alter table "public"."quizzes" drop column "completion_config";

alter table "public"."quizzes" drop column "enable_pixel_events";

alter table "public"."quizzes" drop column "end_screen_config";

alter table "public"."quizzes" drop column "flow_type";

alter table "public"."quizzes" drop column "identity_settings";

alter table "public"."quizzes" drop column "pixel_event_overrides";

alter table "public"."quizzes" drop column "requires_identification";

alter table "public"."quizzes" drop column "start_screen_config";

alter table "public"."quizzes" drop column "theme_config";

alter table "public"."quizzes" drop column "type";

alter table "public"."quizzes" add column "config" jsonb default '{}'::jsonb;

alter table "public"."quizzes" add column "created_by" uuid;

alter table "public"."quizzes" add column "quiz_type" public.quiz_type default 'segmentation'::public.quiz_type;

alter table "public"."quizzes" add column "status" public.quiz_status default 'draft'::public.quiz_status;

alter table "public"."quizzes" alter column "is_active" drop not null;

alter table "public"."recommendation_logs" drop column "action_data";

alter table "public"."recommendation_logs" drop column "action_type";

alter table "public"."recommendation_logs" drop column "outcome";

alter table "public"."recommendation_logs" drop column "outcome_data";

alter table "public"."recommendation_logs" drop column "outcome_recorded_at";

alter table "public"."recommendation_logs" drop column "performed_by";

alter table "public"."recommendation_logs" drop column "prediction_id";

alter table "public"."recommendation_logs" add column "recommendation_data" jsonb;

alter table "public"."recommendation_logs" add column "recommendation_type" text not null;

alter table "public"."recommendation_logs" add column "status" text default 'pending'::text;

alter table "public"."recommendation_logs" alter column "contact_id" drop not null;

alter table "public"."recommendation_logs" disable row level security;

alter table "public"."role_templates" add column "is_system" boolean default false;

alter table "public"."role_templates" add column "permissions" jsonb not null default '{}'::jsonb;

alter table "public"."role_templates" alter column "base_role" drop default;

alter table "public"."role_templates" alter column "base_role" set data type text using "base_role"::text;

alter table "public"."role_templates" alter column "created_at" set not null;

alter table "public"."role_templates" alter column "icon" drop default;

alter table "public"."role_templates" alter column "perm_analise" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_analise" set data type text using "perm_analise"::text;

alter table "public"."role_templates" alter column "perm_automacoes" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_automacoes" set data type text using "perm_automacoes"::text;

alter table "public"."role_templates" alter column "perm_chat_ao_vivo" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_chat_ao_vivo" set data type text using "perm_chat_ao_vivo"::text;

alter table "public"."role_templates" alter column "perm_configuracoes" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_configuracoes" set data type text using "perm_configuracoes"::text;

alter table "public"."role_templates" alter column "perm_crm" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_crm" set data type text using "perm_crm"::text;

alter table "public"."role_templates" alter column "perm_dashboard" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_dashboard" set data type text using "perm_dashboard"::text;

alter table "public"."role_templates" alter column "perm_insights" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_insights" set data type text using "perm_insights"::text;

alter table "public"."role_templates" alter column "perm_lancamentos" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_lancamentos" set data type text using "perm_lancamentos"::text;

alter table "public"."role_templates" alter column "perm_meta_ads" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_meta_ads" set data type text using "perm_meta_ads"::text;

alter table "public"."role_templates" alter column "perm_ofertas" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_ofertas" set data type text using "perm_ofertas"::text;

alter table "public"."role_templates" alter column "perm_pesquisas" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_pesquisas" set data type text using "perm_pesquisas"::text;

alter table "public"."role_templates" alter column "perm_social_listening" set default 'none'::text;

alter table "public"."role_templates" alter column "perm_social_listening" set data type text using "perm_social_listening"::text;

alter table "public"."role_templates" alter column "whatsapp_auto_create_agent" set default false;

alter table "public"."role_templates" alter column "whatsapp_visibility_mode" set default 'own'::text;

alter table "public"."role_templates" disable row level security;

alter table "public"."sales_core_events" add column "funnel_id" uuid;

alter table "public"."sales_core_events" alter column "gross_amount" set data type numeric using "gross_amount"::numeric;

alter table "public"."sales_core_events" alter column "net_amount" set data type numeric using "net_amount"::numeric;

alter table "public"."sales_history_orders" drop column "affiliate_code";

alter table "public"."sales_history_orders" drop column "affiliate_commission";

alter table "public"."sales_history_orders" drop column "affiliate_name";

alter table "public"."sales_history_orders" drop column "buyer_email";

alter table "public"."sales_history_orders" drop column "buyer_name";

alter table "public"."sales_history_orders" drop column "confirmation_date";

alter table "public"."sales_history_orders" drop column "coproducer_commission";

alter table "public"."sales_history_orders" drop column "coproducer_name";

alter table "public"."sales_history_orders" drop column "exchange_rate";

alter table "public"."sales_history_orders" drop column "gross_value";

alter table "public"."sales_history_orders" drop column "import_batch_id";

alter table "public"."sales_history_orders" drop column "imported_by";

alter table "public"."sales_history_orders" drop column "installments";

alter table "public"."sales_history_orders" drop column "net_value";

alter table "public"."sales_history_orders" drop column "net_value_brl";

alter table "public"."sales_history_orders" drop column "offer_code";

alter table "public"."sales_history_orders" drop column "offer_name";

alter table "public"."sales_history_orders" drop column "order_date";

alter table "public"."sales_history_orders" drop column "original_currency";

alter table "public"."sales_history_orders" drop column "payment_method";

alter table "public"."sales_history_orders" drop column "payment_type";

alter table "public"."sales_history_orders" drop column "payout_date";

alter table "public"."sales_history_orders" drop column "payout_id";

alter table "public"."sales_history_orders" drop column "platform_fee";

alter table "public"."sales_history_orders" drop column "product_code";

alter table "public"."sales_history_orders" drop column "product_name";

alter table "public"."sales_history_orders" drop column "provider";

alter table "public"."sales_history_orders" drop column "provider_transaction_id";

alter table "public"."sales_history_orders" drop column "status";

alter table "public"."sales_history_orders" drop column "taxes";

alter table "public"."sales_history_orders" drop column "updated_at";

alter table "public"."sales_history_orders" add column "raw_data" jsonb default '{}'::jsonb;

alter table "public"."sales_history_orders" alter column "imported_at" drop not null;

alter table "public"."sales_history_orders" alter column "source" drop not null;

alter table "public"."social_comments" drop column "ai_error";

alter table "public"."social_comments" drop column "ai_processed_at";

alter table "public"."social_comments" drop column "ai_processing_status";

alter table "public"."social_comments" drop column "ai_suggested_reply";

alter table "public"."social_comments" drop column "ai_summary";

alter table "public"."social_comments" drop column "author_id";

alter table "public"."social_comments" drop column "author_profile_picture";

alter table "public"."social_comments" drop column "classification_key";

alter table "public"."social_comments" drop column "comment_id_meta";

alter table "public"."social_comments" drop column "is_own_account";

alter table "public"."social_comments" drop column "manually_classified";

alter table "public"."social_comments" drop column "platform";

alter table "public"."social_comments" drop column "replied_by";

alter table "public"."social_comments" drop column "reply_count";

alter table "public"."social_comments" drop column "reply_sent_at";

alter table "public"."social_comments" drop column "reply_status";

alter table "public"."social_comments" add column "ai_analysis" jsonb;

alter table "public"."social_comments" add column "author_platform_id" text;

alter table "public"."social_comments" add column "author_profile_pic" text;

alter table "public"."social_comments" add column "contact_id" uuid;

alter table "public"."social_comments" add column "platform_comment_id" text;

alter table "public"."social_comments" add column "reply_text" text;

alter table "public"."social_comments" add column "sentiment_score" numeric;

alter table "public"."social_comments" alter column "classification" set data type text using "classification"::text;

alter table "public"."social_comments" alter column "comment_timestamp" drop not null;

alter table "public"."social_comments" alter column "intent_score" set data type numeric using "intent_score"::numeric;

alter table "public"."social_comments" alter column "text" drop not null;

alter table "public"."social_listening_pages" drop column "instagram_account_id";

alter table "public"."social_listening_pages" drop column "last_synced_at";

alter table "public"."social_listening_pages" drop column "page_access_token";

alter table "public"."social_listening_pages" add column "access_token" text;

alter table "public"."social_listening_pages" alter column "is_active" drop not null;

alter table "public"."social_listening_pages" alter column "page_name" drop not null;

alter table "public"."social_listening_pages" alter column "platform" set default 'instagram'::text;

alter table "public"."social_listening_pages" alter column "platform" drop not null;

alter table "public"."social_listening_pages" alter column "platform" set data type text using "platform"::text;

alter table "public"."social_posts" drop column "ad_id";

alter table "public"."social_posts" drop column "ad_name";

alter table "public"."social_posts" drop column "ad_status";

alter table "public"."social_posts" drop column "adset_id";

alter table "public"."social_posts" drop column "adset_name";

alter table "public"."social_posts" drop column "campaign_id";

alter table "public"."social_posts" drop column "campaign_name";

alter table "public"."social_posts" drop column "caption";

alter table "public"."social_posts" drop column "impressions";

alter table "public"."social_posts" drop column "is_ad";

alter table "public"."social_posts" drop column "last_synced_at";

alter table "public"."social_posts" drop column "likes_count";

alter table "public"."social_posts" drop column "media_type";

alter table "public"."social_posts" drop column "meta_ad_id";

alter table "public"."social_posts" drop column "meta_campaign_id";

alter table "public"."social_posts" drop column "page_id";

alter table "public"."social_posts" drop column "page_name";

alter table "public"."social_posts" drop column "post_id_meta";

alter table "public"."social_posts" drop column "published_at";

alter table "public"."social_posts" drop column "reach";

alter table "public"."social_posts" drop column "shares_count";

alter table "public"."social_posts" add column "is_monitored" boolean default true;

alter table "public"."social_posts" add column "like_count" integer default 0;

alter table "public"."social_posts" add column "platform_post_id" text;

alter table "public"."social_posts" add column "share_count" integer default 0;

alter table "public"."social_posts" add column "timestamp" timestamp with time zone;

alter table "public"."social_posts" alter column "platform" set default 'instagram'::text;

alter table "public"."social_posts" alter column "platform" drop not null;

alter table "public"."social_posts" alter column "platform" set data type text using "platform"::text;

alter table "public"."social_posts" alter column "post_type" drop default;

alter table "public"."social_posts" alter column "post_type" drop not null;

alter table "public"."social_posts" alter column "post_type" set data type text using "post_type"::text;

alter table "public"."spend_core_events" alter column "spend_amount" set data type numeric using "spend_amount"::numeric;

alter table "public"."subscriptions" add column "cancelled_at" timestamp with time zone;

alter table "public"."subscriptions" add column "metadata" jsonb default '{}'::jsonb;

alter table "public"."subscriptions" add column "platform" text default 'hotmart'::text;

alter table "public"."subscriptions" add column "project_id" uuid;

alter table "public"."subscriptions" alter column "created_at" set not null;

alter table "public"."subscriptions" alter column "origin" set default 'web'::character varying;

alter table "public"."subscriptions" alter column "origin" drop not null;

alter table "public"."subscriptions" alter column "origin" set data type character varying(255) using "origin"::character varying(255);

alter table "public"."subscriptions" alter column "plan_id" drop not null;

alter table "public"."subscriptions" alter column "status" set default 'active'::text;

alter table "public"."subscriptions" alter column "status" drop not null;

alter table "public"."subscriptions" alter column "status" set data type text using "status"::text;

alter table "public"."subscriptions" alter column "updated_at" set not null;

alter table "public"."terms_acceptances" drop column "acceptance_method";

alter table "public"."terms_acceptances" drop column "scrolled_to_end";

alter table "public"."terms_acceptances" drop column "time_spent_seconds";

alter table "public"."terms_acceptances" alter column "accepted_at" drop not null;

alter table "public"."user_activity_logs" drop column "ip_address";

alter table "public"."webhook_metrics" drop column "payload_size";

alter table "public"."webhook_metrics" add column "metadata" jsonb;

alter table "public"."webhook_metrics" alter column "processed_at" drop not null;

alter table "public"."webhook_metrics" alter column "success" drop not null;

alter table "public"."whatsapp_agent_departments" alter column "is_primary" drop not null;

alter table "public"."whatsapp_agents" drop column "display_name";

alter table "public"."whatsapp_agents" drop column "is_supervisor";

alter table "public"."whatsapp_agents" drop column "visibility_mode";

alter table "public"."whatsapp_agents" drop column "work_hours";

alter table "public"."whatsapp_agents" add column "avatar_url" text;

alter table "public"."whatsapp_agents" add column "email" text;

alter table "public"."whatsapp_agents" add column "name" text not null;

alter table "public"."whatsapp_agents" alter column "is_active" drop not null;

alter table "public"."whatsapp_agents" alter column "max_concurrent_chats" drop not null;

alter table "public"."whatsapp_agents" alter column "status" set default 'offline'::text;

alter table "public"."whatsapp_agents" alter column "status" drop not null;

alter table "public"."whatsapp_agents" alter column "status" set data type text using "status"::text;

alter table "public"."whatsapp_agents" alter column "user_id" drop not null;

alter table "public"."whatsapp_conversations" drop column "first_response_at";

alter table "public"."whatsapp_conversations" drop column "queued_at";

alter table "public"."whatsapp_conversations" drop column "remote_jid";

alter table "public"."whatsapp_conversations" add column "close_reason" text;

alter table "public"."whatsapp_conversations" add column "closed_at" timestamp with time zone;

alter table "public"."whatsapp_conversations" add column "closed_by" uuid;

alter table "public"."whatsapp_conversations" add column "contact_avatar_url" text;

alter table "public"."whatsapp_conversations" add column "contact_name" text;

alter table "public"."whatsapp_conversations" add column "is_bot_active" boolean default false;

alter table "public"."whatsapp_conversations" add column "last_message_preview" text;

alter table "public"."whatsapp_conversations" add column "metadata" jsonb default '{}'::jsonb;

alter table "public"."whatsapp_conversations" add column "phone_number" text not null;

alter table "public"."whatsapp_conversations" add column "priority" text default 'normal'::text;

alter table "public"."whatsapp_conversations" add column "subject" text;

alter table "public"."whatsapp_conversations" alter column "contact_id" drop not null;

alter table "public"."whatsapp_conversations" alter column "last_message_at" set default now();

alter table "public"."whatsapp_conversations" alter column "status" set default 'pending'::text;

alter table "public"."whatsapp_conversations" alter column "status" drop not null;

alter table "public"."whatsapp_departments" drop column "color";

alter table "public"."whatsapp_departments" alter column "is_active" drop not null;

alter table "public"."whatsapp_messages" drop column "content_type";

alter table "public"."whatsapp_messages" drop column "error_message";

alter table "public"."whatsapp_messages" drop column "sent_by";

alter table "public"."whatsapp_messages" drop column "updated_at";

alter table "public"."whatsapp_messages" drop column "whatsapp_number_id";

alter table "public"."whatsapp_messages" add column "delivered_at" timestamp with time zone;

alter table "public"."whatsapp_messages" add column "is_from_bot" boolean default false;

alter table "public"."whatsapp_messages" add column "media_filename" text;

alter table "public"."whatsapp_messages" add column "message_type" text default 'text'::text;

alter table "public"."whatsapp_messages" add column "project_id" uuid not null;

alter table "public"."whatsapp_messages" add column "read_at" timestamp with time zone;

alter table "public"."whatsapp_messages" add column "sender_id" uuid;

alter table "public"."whatsapp_messages" add column "sender_name" text;

alter table "public"."whatsapp_messages" add column "sent_at" timestamp with time zone default now();

alter table "public"."whatsapp_messages" alter column "direction" set default 'incoming'::text;

alter table "public"."whatsapp_messages" alter column "status" set default 'sent'::text;

alter table "public"."whatsapp_messages" alter column "status" drop not null;

alter table "public"."whatsapp_numbers" drop column "label";

alter table "public"."whatsapp_numbers" drop column "priority";

alter table "public"."whatsapp_numbers" drop column "status";

alter table "public"."whatsapp_numbers" drop column "webhook_secret";

alter table "public"."whatsapp_numbers" add column "api_key" text;

alter table "public"."whatsapp_numbers" add column "api_url" text;

alter table "public"."whatsapp_numbers" add column "display_name" text;

alter table "public"."whatsapp_numbers" add column "instance_name" text;

alter table "public"."whatsapp_numbers" add column "is_active" boolean default true;

alter table "public"."whatsapp_numbers" add column "is_connected" boolean default false;

alter table "public"."whatsapp_numbers" add column "last_connected_at" timestamp with time zone;

alter table "public"."whatsapp_numbers" add column "qr_code" text;

alter table "public"."whatsapp_numbers" alter column "provider" drop not null;

CREATE UNIQUE INDEX comment_metrics_daily_project_id_post_id_metric_date_key ON public.comment_metrics_daily USING btree (project_id, post_id, metric_date);

CREATE UNIQUE INDEX contact_profiles_contact_id_key ON public.contact_profiles USING btree (contact_id);

CREATE UNIQUE INDEX funnel_offers_pkey ON public.funnel_offers USING btree (id);

CREATE UNIQUE INDEX funnel_score_history_pkey ON public.funnel_score_history USING btree (id);

CREATE INDEX idx_connections_project_provider ON public.integration_connections USING btree (project_id, provider_slug);

CREATE INDEX idx_connections_project_status ON public.integration_connections USING btree (project_id, status);

CREATE INDEX idx_connections_provider_slug ON public.integration_connections USING btree (provider_slug);

CREATE INDEX idx_crm_activities_contact ON public.crm_activities USING btree (contact_id);

CREATE INDEX idx_crm_contacts_pipeline ON public.crm_contacts USING btree (pipeline_stage_id);

CREATE INDEX idx_crm_contacts_project ON public.crm_contacts USING btree (project_id);

CREATE INDEX idx_crm_transactions_contact ON public.crm_transactions USING btree (contact_id);

CREATE INDEX idx_crm_transactions_project ON public.crm_transactions USING btree (project_id);

CREATE INDEX idx_hotmart_sales_project ON public.hotmart_sales USING btree (project_id);

CREATE UNIQUE INDEX idx_hotmart_sales_transaction ON public.hotmart_sales USING btree (transaction_id);

CREATE INDEX idx_ledger_project ON public.ledger_events USING btree (project_id);

CREATE UNIQUE INDEX idx_meta_insights_upsert_conflict ON public.meta_insights USING btree (project_id, ad_account_id, campaign_id, adset_id, ad_id, date_start, date_stop);

CREATE INDEX idx_oauth_tokens_connection_current ON public.integration_oauth_tokens USING btree (connection_id, is_current);

CREATE INDEX idx_oauth_tokens_expires ON public.integration_oauth_tokens USING btree (expires_at) WHERE (is_current = true);

CREATE INDEX idx_oauth_tokens_project ON public.integration_oauth_tokens USING btree (project_id);

CREATE INDEX idx_orders_contact ON public.orders USING btree (contact_id);

CREATE INDEX idx_orders_project ON public.orders USING btree (project_id);

CREATE INDEX idx_project_invites_email ON public.project_invites USING btree (email);

CREATE INDEX idx_project_invites_project ON public.project_invites USING btree (project_id);

CREATE INDEX idx_project_invites_status ON public.project_invites USING btree (status);

CREATE INDEX idx_provider_event_log_event ON public.provider_event_log USING btree (provider_event_id);

CREATE INDEX idx_provider_event_log_project ON public.provider_event_log USING btree (project_id);

CREATE INDEX idx_sync_logs_connection_started ON public.integration_sync_logs USING btree (connection_id, started_at DESC);

CREATE INDEX idx_sync_logs_project_status ON public.integration_sync_logs USING btree (project_id, status);

CREATE INDEX idx_sync_logs_project_type_started ON public.integration_sync_logs USING btree (project_id, sync_type, started_at DESC);

CREATE INDEX idx_user_activity_user ON public.user_activity_logs USING btree (user_id);

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);

CREATE INDEX idx_wa_conv_phone ON public.whatsapp_conversations USING btree (phone_number);

CREATE INDEX idx_wa_conv_project ON public.whatsapp_conversations USING btree (project_id);

CREATE INDEX idx_wa_conv_status ON public.whatsapp_conversations USING btree (project_id, status);

CREATE INDEX idx_wa_msg_conv ON public.whatsapp_messages USING btree (conversation_id);

CREATE INDEX idx_wa_msg_project ON public.whatsapp_messages USING btree (project_id);

CREATE INDEX idx_webhook_metrics_project ON public.webhook_metrics USING btree (project_id, processed_at);

CREATE UNIQUE INDEX integration_connections_pkey ON public.integration_connections USING btree (id);

CREATE UNIQUE INDEX integration_oauth_tokens_pkey ON public.integration_oauth_tokens USING btree (id);

CREATE UNIQUE INDEX integration_providers_pkey ON public.integration_providers USING btree (slug);

CREATE UNIQUE INDEX integration_sync_logs_pkey ON public.integration_sync_logs USING btree (id);

CREATE UNIQUE INDEX meta_ad_accounts_project_account_uidx ON public.meta_ad_accounts USING btree (project_id, account_id);

CREATE UNIQUE INDEX meta_campaign_links_pkey ON public.meta_campaign_links USING btree (id);

CREATE UNIQUE INDEX metric_definitions_key_key ON public.metric_definitions USING btree (key);

CREATE UNIQUE INDEX orders_project_id_provider_order_id_key ON public.orders USING btree (project_id, provider_order_id);

CREATE UNIQUE INDEX social_comments_project_id_platform_comment_id_key ON public.social_comments USING btree (project_id, platform_comment_id);

CREATE UNIQUE INDEX social_listening_pages_project_id_page_id_key ON public.social_listening_pages USING btree (project_id, page_id);

CREATE UNIQUE INDEX social_posts_project_id_platform_post_id_key ON public.social_posts USING btree (project_id, platform_post_id);

CREATE UNIQUE INDEX terms_acceptances_user_id_terms_version_key ON public.terms_acceptances USING btree (user_id, terms_version);

CREATE UNIQUE INDEX unique_provider_event ON public.provider_event_log USING btree (project_id, provider, provider_event_id);

CREATE UNIQUE INDEX uq_connection_account ON public.integration_connections USING btree (project_id, provider_slug, external_account_id);

CREATE UNIQUE INDEX whatsapp_contact_notes_pkey ON public.whatsapp_contact_notes USING btree (id);

CREATE UNIQUE INDEX whatsapp_numbers_phone_number_key ON public.whatsapp_numbers USING btree (phone_number);

CREATE UNIQUE INDEX whatsapp_quick_replies_pkey ON public.whatsapp_quick_replies USING btree (id);

CREATE INDEX idx_crm_contacts_email ON public.crm_contacts USING btree (project_id, email);

CREATE INDEX idx_crm_contacts_status ON public.crm_contacts USING btree (project_id, status);

CREATE INDEX idx_crm_transactions_status ON public.crm_transactions USING btree (project_id, status);

CREATE INDEX idx_orders_status ON public.orders USING btree (project_id, status);

CREATE INDEX idx_social_comments_sentiment ON public.social_comments USING btree (sentiment);

alter table "public"."funnel_offers" add constraint "funnel_offers_pkey" PRIMARY KEY using index "funnel_offers_pkey";

alter table "public"."funnel_score_history" add constraint "funnel_score_history_pkey" PRIMARY KEY using index "funnel_score_history_pkey";

alter table "public"."integration_connections" add constraint "integration_connections_pkey" PRIMARY KEY using index "integration_connections_pkey";

alter table "public"."integration_oauth_tokens" add constraint "integration_oauth_tokens_pkey" PRIMARY KEY using index "integration_oauth_tokens_pkey";

alter table "public"."integration_providers" add constraint "integration_providers_pkey" PRIMARY KEY using index "integration_providers_pkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_pkey" PRIMARY KEY using index "integration_sync_logs_pkey";

alter table "public"."meta_campaign_links" add constraint "meta_campaign_links_pkey" PRIMARY KEY using index "meta_campaign_links_pkey";

alter table "public"."whatsapp_contact_notes" add constraint "whatsapp_contact_notes_pkey" PRIMARY KEY using index "whatsapp_contact_notes_pkey";

alter table "public"."whatsapp_quick_replies" add constraint "whatsapp_quick_replies_pkey" PRIMARY KEY using index "whatsapp_quick_replies_pkey";

alter table "public"."comment_metrics_daily" add constraint "comment_metrics_daily_project_id_post_id_metric_date_key" UNIQUE using index "comment_metrics_daily_project_id_post_id_metric_date_key";

alter table "public"."contact_profiles" add constraint "contact_profiles_contact_id_key" UNIQUE using index "contact_profiles_contact_id_key";

alter table "public"."funnel_changes" add constraint "funnel_changes_funnel_id_fkey" FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) not valid;

alter table "public"."funnel_changes" validate constraint "funnel_changes_funnel_id_fkey";

alter table "public"."funnel_experiments" add constraint "funnel_experiments_funnel_id_fkey" FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) not valid;

alter table "public"."funnel_experiments" validate constraint "funnel_experiments_funnel_id_fkey";

alter table "public"."funnel_score_history" add constraint "funnel_score_history_funnel_id_fkey" FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) not valid;

alter table "public"."funnel_score_history" validate constraint "funnel_score_history_funnel_id_fkey";

alter table "public"."funnel_score_history" add constraint "funnel_score_history_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."funnel_score_history" validate constraint "funnel_score_history_project_id_fkey";

alter table "public"."hotmart_product_plans" add constraint "hotmart_product_plans_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."hotmart_product_plans" validate constraint "hotmart_product_plans_project_id_fkey";

alter table "public"."integration_connections" add constraint "integration_connections_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."integration_connections" validate constraint "integration_connections_created_by_fkey";

alter table "public"."integration_connections" add constraint "integration_connections_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."integration_connections" validate constraint "integration_connections_project_id_fkey";

alter table "public"."integration_connections" add constraint "integration_connections_provider_slug_fkey" FOREIGN KEY (provider_slug) REFERENCES public.integration_providers(slug) ON DELETE RESTRICT not valid;

alter table "public"."integration_connections" validate constraint "integration_connections_provider_slug_fkey";

alter table "public"."integration_connections" add constraint "uq_connection_account" UNIQUE using index "uq_connection_account";

alter table "public"."integration_oauth_tokens" add constraint "integration_oauth_tokens_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE not valid;

alter table "public"."integration_oauth_tokens" validate constraint "integration_oauth_tokens_connection_id_fkey";

alter table "public"."integration_oauth_tokens" add constraint "integration_oauth_tokens_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."integration_oauth_tokens" validate constraint "integration_oauth_tokens_project_id_fkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_connection_id_fkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_created_by_fkey";

alter table "public"."integration_sync_logs" add constraint "integration_sync_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."integration_sync_logs" validate constraint "integration_sync_logs_project_id_fkey";

alter table "public"."ledger_official" add constraint "ledger_official_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.ledger_import_batches(id) not valid;

alter table "public"."ledger_official" validate constraint "ledger_official_batch_id_fkey";

alter table "public"."meta_ad_audiences" add constraint "meta_ad_audiences_ad_account_id_fkey" FOREIGN KEY (ad_account_id) REFERENCES public.meta_ad_accounts(id) not valid;

alter table "public"."meta_ad_audiences" validate constraint "meta_ad_audiences_ad_account_id_fkey";

alter table "public"."meta_audience_sync_logs" add constraint "meta_audience_sync_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."meta_audience_sync_logs" validate constraint "meta_audience_sync_logs_project_id_fkey";

alter table "public"."meta_lookalike_audiences" add constraint "meta_lookalike_audiences_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."meta_lookalike_audiences" validate constraint "meta_lookalike_audiences_project_id_fkey";

alter table "public"."metric_definitions" add constraint "metric_definitions_key_key" UNIQUE using index "metric_definitions_key_key";

alter table "public"."notifications" add constraint "notifications_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."notifications" validate constraint "notifications_project_id_fkey";

alter table "public"."order_items" add constraint "order_items_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_project_id_fkey";

alter table "public"."orders" add constraint "orders_project_id_provider_order_id_key" UNIQUE using index "orders_project_id_provider_order_id_key";

alter table "public"."phase_campaigns" add constraint "phase_campaigns_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.meta_campaigns(id) not valid;

alter table "public"."phase_campaigns" validate constraint "phase_campaigns_campaign_id_fkey";

alter table "public"."project_invites" add constraint "project_invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text]))) not valid;

alter table "public"."project_invites" validate constraint "project_invites_status_check";

alter table "public"."project_member_feature_permissions" add constraint "project_member_feature_permissions_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.project_members(id) not valid;

alter table "public"."project_member_feature_permissions" validate constraint "project_member_feature_permissions_member_id_fkey";

alter table "public"."provider_event_log" add constraint "unique_provider_event" UNIQUE using index "unique_provider_event";

alter table "public"."quiz_events" add constraint "quiz_events_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) not valid;

alter table "public"."quiz_events" validate constraint "quiz_events_quiz_id_fkey";

alter table "public"."quiz_outcome_logs" add constraint "quiz_outcome_logs_result_id_fkey" FOREIGN KEY (result_id) REFERENCES public.quiz_results(id) not valid;

alter table "public"."quiz_outcome_logs" validate constraint "quiz_outcome_logs_result_id_fkey";

alter table "public"."quiz_question_conditions" add constraint "quiz_question_conditions_depends_on_option_id_fkey" FOREIGN KEY (depends_on_option_id) REFERENCES public.quiz_options(id) not valid;

alter table "public"."quiz_question_conditions" validate constraint "quiz_question_conditions_depends_on_option_id_fkey";

alter table "public"."quiz_question_conditions" add constraint "quiz_question_conditions_depends_on_question_id_fkey" FOREIGN KEY (depends_on_question_id) REFERENCES public.quiz_questions(id) not valid;

alter table "public"."quiz_question_conditions" validate constraint "quiz_question_conditions_depends_on_question_id_fkey";

alter table "public"."quiz_results" add constraint "quiz_results_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."quiz_results" validate constraint "quiz_results_contact_id_fkey";

alter table "public"."quiz_results" add constraint "quiz_results_outcome_id_fkey" FOREIGN KEY (outcome_id) REFERENCES public.quiz_outcomes(id) not valid;

alter table "public"."quiz_results" validate constraint "quiz_results_outcome_id_fkey";

alter table "public"."quiz_results" add constraint "quiz_results_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) not valid;

alter table "public"."quiz_results" validate constraint "quiz_results_quiz_id_fkey";

alter table "public"."social_comments" add constraint "social_comments_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."social_comments" validate constraint "social_comments_contact_id_fkey";

alter table "public"."social_comments" add constraint "social_comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public.social_comments(id) not valid;

alter table "public"."social_comments" validate constraint "social_comments_parent_comment_id_fkey";

alter table "public"."social_comments" add constraint "social_comments_project_id_platform_comment_id_key" UNIQUE using index "social_comments_project_id_platform_comment_id_key";

alter table "public"."social_listening_pages" add constraint "social_listening_pages_project_id_page_id_key" UNIQUE using index "social_listening_pages_project_id_page_id_key";

alter table "public"."social_posts" add constraint "social_posts_project_id_platform_post_id_key" UNIQUE using index "social_posts_project_id_platform_post_id_key";

alter table "public"."subscriptions" add constraint "subscriptions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_project_id_fkey";

alter table "public"."terms_acceptances" add constraint "terms_acceptances_user_id_terms_version_key" UNIQUE using index "terms_acceptances_user_id_terms_version_key";

alter table "public"."whatsapp_contact_notes" add constraint "whatsapp_contact_notes_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_contact_notes" validate constraint "whatsapp_contact_notes_conversation_id_fkey";

alter table "public"."whatsapp_contact_notes" add constraint "whatsapp_contact_notes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_contact_notes" validate constraint "whatsapp_contact_notes_project_id_fkey";

alter table "public"."whatsapp_messages" add constraint "whatsapp_messages_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_messages" validate constraint "whatsapp_messages_project_id_fkey";

alter table "public"."whatsapp_numbers" add constraint "whatsapp_numbers_phone_number_key" UNIQUE using index "whatsapp_numbers_phone_number_key";

alter table "public"."whatsapp_quick_replies" add constraint "whatsapp_quick_replies_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."whatsapp_quick_replies" validate constraint "whatsapp_quick_replies_project_id_fkey";

alter table "public"."agent_decisions_log" add constraint "agent_decisions_log_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."agent_decisions_log" validate constraint "agent_decisions_log_contact_id_fkey";

alter table "public"."agent_decisions_log" add constraint "agent_decisions_log_prediction_id_fkey" FOREIGN KEY (prediction_id) REFERENCES public.contact_predictions(id) not valid;

alter table "public"."agent_decisions_log" validate constraint "agent_decisions_log_prediction_id_fkey";

alter table "public"."automation_executions" add constraint "automation_executions_current_node_id_fkey" FOREIGN KEY (current_node_id) REFERENCES public.automation_flow_nodes(id) not valid;

alter table "public"."automation_executions" validate constraint "automation_executions_current_node_id_fkey";

alter table "public"."automation_flows" add constraint "automation_flows_folder_id_fkey" FOREIGN KEY (folder_id) REFERENCES public.automation_folders(id) not valid;

alter table "public"."automation_flows" validate constraint "automation_flows_folder_id_fkey";

alter table "public"."automation_folders" add constraint "automation_folders_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.automation_folders(id) not valid;

alter table "public"."automation_folders" validate constraint "automation_folders_parent_id_fkey";

alter table "public"."crm_activities" add constraint "crm_activities_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.crm_transactions(id) not valid;

alter table "public"."crm_activities" validate constraint "crm_activities_transaction_id_fkey";

alter table "public"."crm_cadences" add constraint "crm_cadences_trigger_stage_id_fkey" FOREIGN KEY (trigger_stage_id) REFERENCES public.crm_pipeline_stages(id) not valid;

alter table "public"."crm_cadences" validate constraint "crm_cadences_trigger_stage_id_fkey";

alter table "public"."crm_contacts" add constraint "crm_contacts_pipeline_stage_id_fkey" FOREIGN KEY (pipeline_stage_id) REFERENCES public.crm_pipeline_stages(id) not valid;

alter table "public"."crm_contacts" validate constraint "crm_contacts_pipeline_stage_id_fkey";

alter table "public"."crm_contacts" add constraint "crm_contacts_recovery_stage_id_fkey" FOREIGN KEY (recovery_stage_id) REFERENCES public.crm_recovery_stages(id) not valid;

alter table "public"."crm_contacts" validate constraint "crm_contacts_recovery_stage_id_fkey";

alter table "public"."crm_recovery_activities" add constraint "crm_recovery_activities_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."crm_recovery_activities" validate constraint "crm_recovery_activities_contact_id_fkey";

alter table "public"."crm_recovery_activities" add constraint "crm_recovery_activities_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."crm_recovery_activities" validate constraint "crm_recovery_activities_project_id_fkey";

alter table "public"."crm_recovery_activities" add constraint "crm_recovery_activities_stage_id_fkey" FOREIGN KEY (stage_id) REFERENCES public.crm_recovery_stages(id) not valid;

alter table "public"."crm_recovery_activities" validate constraint "crm_recovery_activities_stage_id_fkey";

alter table "public"."crm_webhook_keys" add constraint "crm_webhook_keys_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."crm_webhook_keys" validate constraint "crm_webhook_keys_project_id_fkey";

alter table "public"."economic_days" add constraint "economic_days_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."economic_days" validate constraint "economic_days_project_id_fkey";

alter table "public"."event_dispatch_rules" add constraint "event_dispatch_rules_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."event_dispatch_rules" validate constraint "event_dispatch_rules_project_id_fkey";

alter table "public"."experience_templates" add constraint "experience_templates_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."experience_templates" validate constraint "experience_templates_project_id_fkey";

alter table "public"."experience_themes" add constraint "experience_themes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."experience_themes" validate constraint "experience_themes_project_id_fkey";

alter table "public"."feature_overrides" add constraint "feature_overrides_feature_id_fkey" FOREIGN KEY (feature_id) REFERENCES public.features(id) not valid;

alter table "public"."feature_overrides" validate constraint "feature_overrides_feature_id_fkey";

alter table "public"."finance_ledger" add constraint "finance_ledger_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."finance_ledger" validate constraint "finance_ledger_project_id_fkey";

alter table "public"."finance_sync_runs" add constraint "finance_sync_runs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."finance_sync_runs" validate constraint "finance_sync_runs_project_id_fkey";

alter table "public"."funnel_changes" add constraint "funnel_changes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."funnel_changes" validate constraint "funnel_changes_project_id_fkey";

alter table "public"."funnel_experiments" add constraint "funnel_experiments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."funnel_experiments" validate constraint "funnel_experiments_project_id_fkey";

alter table "public"."funnel_meta_accounts" add constraint "funnel_meta_accounts_funnel_id_fkey" FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) not valid;

alter table "public"."funnel_meta_accounts" validate constraint "funnel_meta_accounts_funnel_id_fkey";

alter table "public"."funnel_meta_accounts" add constraint "funnel_meta_accounts_meta_account_id_fkey" FOREIGN KEY (meta_account_id) REFERENCES public.meta_ad_accounts(id) not valid;

alter table "public"."funnel_meta_accounts" validate constraint "funnel_meta_accounts_meta_account_id_fkey";

alter table "public"."funnel_meta_accounts" add constraint "funnel_meta_accounts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."funnel_meta_accounts" validate constraint "funnel_meta_accounts_project_id_fkey";

alter table "public"."funnel_thresholds" add constraint "funnel_thresholds_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."funnel_thresholds" validate constraint "funnel_thresholds_project_id_fkey";

alter table "public"."funnels" add constraint "funnels_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."funnels" validate constraint "funnels_project_id_fkey";

alter table "public"."hotmart_backfill_runs" add constraint "hotmart_backfill_runs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."hotmart_backfill_runs" validate constraint "hotmart_backfill_runs_project_id_fkey";

alter table "public"."launch_phases" add constraint "launch_phases_funnel_id_fkey" FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) not valid;

alter table "public"."launch_phases" validate constraint "launch_phases_funnel_id_fkey";

alter table "public"."launch_phases" add constraint "launch_phases_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."launch_phases" validate constraint "launch_phases_project_id_fkey";

alter table "public"."launch_products" add constraint "launch_products_funnel_id_fkey" FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) not valid;

alter table "public"."launch_products" validate constraint "launch_products_funnel_id_fkey";

alter table "public"."launch_products" add constraint "launch_products_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."launch_products" validate constraint "launch_products_project_id_fkey";

alter table "public"."ledger_import_batches" add constraint "ledger_import_batches_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ledger_import_batches" validate constraint "ledger_import_batches_project_id_fkey";

alter table "public"."ledger_official" add constraint "ledger_official_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."ledger_official" validate constraint "ledger_official_project_id_fkey";

alter table "public"."meta_ad_accounts" add constraint "meta_ad_accounts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."meta_ad_accounts" validate constraint "meta_ad_accounts_project_id_fkey";

alter table "public"."meta_ad_audiences" add constraint "meta_ad_audiences_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."meta_ad_audiences" validate constraint "meta_ad_audiences_project_id_fkey";

alter table "public"."meta_ads" add constraint "meta_ads_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."meta_ads" validate constraint "meta_ads_project_id_fkey";

alter table "public"."meta_adsets" add constraint "meta_adsets_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."meta_adsets" validate constraint "meta_adsets_project_id_fkey";

alter table "public"."meta_audience_contacts" add constraint "meta_audience_contacts_audience_id_fkey" FOREIGN KEY (audience_id) REFERENCES public.meta_ad_audiences(id) not valid;

alter table "public"."meta_audience_contacts" validate constraint "meta_audience_contacts_audience_id_fkey";

alter table "public"."meta_audience_contacts" add constraint "meta_audience_contacts_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."meta_audience_contacts" validate constraint "meta_audience_contacts_contact_id_fkey";

alter table "public"."meta_audience_sync_logs" add constraint "meta_audience_sync_logs_audience_id_fkey" FOREIGN KEY (audience_id) REFERENCES public.meta_ad_audiences(id) not valid;

alter table "public"."meta_audience_sync_logs" validate constraint "meta_audience_sync_logs_audience_id_fkey";

alter table "public"."meta_campaigns" add constraint "meta_campaigns_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."meta_campaigns" validate constraint "meta_campaigns_project_id_fkey";

alter table "public"."meta_insights" add constraint "meta_insights_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."meta_insights" validate constraint "meta_insights_project_id_fkey";

alter table "public"."meta_lookalike_audiences" add constraint "meta_lookalike_audiences_source_audience_id_fkey" FOREIGN KEY (source_audience_id) REFERENCES public.meta_ad_audiences(id) not valid;

alter table "public"."meta_lookalike_audiences" validate constraint "meta_lookalike_audiences_source_audience_id_fkey";

alter table "public"."offer_mappings" add constraint "offer_mappings_funnel_id_fkey" FOREIGN KEY (funnel_id) REFERENCES public.funnels(id) not valid;

alter table "public"."offer_mappings" validate constraint "offer_mappings_funnel_id_fkey";

alter table "public"."offer_mappings" add constraint "offer_mappings_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."offer_mappings" validate constraint "offer_mappings_project_id_fkey";

alter table "public"."orders" add constraint "orders_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."orders" validate constraint "orders_contact_id_fkey";

alter table "public"."path_events" add constraint "path_events_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."path_events" validate constraint "path_events_contact_id_fkey";

alter table "public"."path_events" add constraint "path_events_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."path_events" validate constraint "path_events_project_id_fkey";

alter table "public"."personalization_contexts" add constraint "personalization_contexts_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."personalization_contexts" validate constraint "personalization_contexts_contact_id_fkey";

alter table "public"."personalization_contexts" add constraint "personalization_contexts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."personalization_contexts" validate constraint "personalization_contexts_project_id_fkey";

alter table "public"."personalization_logs" add constraint "personalization_logs_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."personalization_logs" validate constraint "personalization_logs_contact_id_fkey";

alter table "public"."personalization_logs" add constraint "personalization_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."personalization_logs" validate constraint "personalization_logs_project_id_fkey";

alter table "public"."phase_campaigns" add constraint "phase_campaigns_phase_id_fkey" FOREIGN KEY (phase_id) REFERENCES public.launch_phases(id) not valid;

alter table "public"."phase_campaigns" validate constraint "phase_campaigns_phase_id_fkey";

alter table "public"."phase_campaigns" add constraint "phase_campaigns_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."phase_campaigns" validate constraint "phase_campaigns_project_id_fkey";

alter table "public"."plan_features" add constraint "plan_features_feature_id_fkey" FOREIGN KEY (feature_id) REFERENCES public.features(id) not valid;

alter table "public"."plan_features" validate constraint "plan_features_feature_id_fkey";

alter table "public"."plan_features" add constraint "plan_features_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.plans(id) not valid;

alter table "public"."plan_features" validate constraint "plan_features_plan_id_fkey";

alter table "public"."project_invites" add constraint "project_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) not valid;

alter table "public"."project_invites" validate constraint "project_invites_invited_by_fkey";

alter table "public"."project_member_feature_permissions" add constraint "project_member_feature_permissions_feature_id_fkey" FOREIGN KEY (feature_id) REFERENCES public.features(id) not valid;

alter table "public"."project_member_feature_permissions" validate constraint "project_member_feature_permissions_feature_id_fkey";

alter table "public"."project_member_permissions" add constraint "project_member_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."project_member_permissions" validate constraint "project_member_permissions_user_id_fkey";

alter table "public"."project_modules" add constraint "project_modules_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_modules" validate constraint "project_modules_project_id_fkey";

alter table "public"."project_settings" add constraint "project_settings_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_settings" validate constraint "project_settings_project_id_fkey";

alter table "public"."project_tracking_settings" add constraint "project_tracking_settings_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."project_tracking_settings" validate constraint "project_tracking_settings_project_id_fkey";

alter table "public"."provider_order_map" add constraint "provider_order_map_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) not valid;

alter table "public"."provider_order_map" validate constraint "provider_order_map_order_id_fkey";

alter table "public"."provider_order_map" add constraint "provider_order_map_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."provider_order_map" validate constraint "provider_order_map_project_id_fkey";

alter table "public"."quiz_answers" add constraint "quiz_answers_option_id_fkey" FOREIGN KEY (option_id) REFERENCES public.quiz_options(id) not valid;

alter table "public"."quiz_answers" validate constraint "quiz_answers_option_id_fkey";

alter table "public"."quiz_answers" add constraint "quiz_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) not valid;

alter table "public"."quiz_answers" validate constraint "quiz_answers_question_id_fkey";

alter table "public"."quiz_events" add constraint "quiz_events_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."quiz_events" validate constraint "quiz_events_project_id_fkey";

alter table "public"."quiz_events" add constraint "quiz_events_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(id) not valid;

alter table "public"."quiz_events" validate constraint "quiz_events_session_id_fkey";

alter table "public"."quiz_outcome_logs" add constraint "quiz_outcome_logs_outcome_id_fkey" FOREIGN KEY (outcome_id) REFERENCES public.quiz_outcomes(id) not valid;

alter table "public"."quiz_outcome_logs" validate constraint "quiz_outcome_logs_outcome_id_fkey";

alter table "public"."quiz_results" add constraint "quiz_results_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."quiz_results" validate constraint "quiz_results_project_id_fkey";

alter table "public"."quiz_results" add constraint "quiz_results_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.quiz_sessions(id) not valid;

alter table "public"."quiz_results" validate constraint "quiz_results_session_id_fkey";

alter table "public"."quiz_sessions" add constraint "quiz_sessions_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."quiz_sessions" validate constraint "quiz_sessions_contact_id_fkey";

alter table "public"."quiz_sessions" add constraint "quiz_sessions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."quiz_sessions" validate constraint "quiz_sessions_project_id_fkey";

alter table "public"."quiz_sessions" add constraint "quiz_sessions_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) not valid;

alter table "public"."quiz_sessions" validate constraint "quiz_sessions_quiz_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."quizzes" validate constraint "quizzes_project_id_fkey";

alter table "public"."recommendation_logs" add constraint "recommendation_logs_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."recommendation_logs" validate constraint "recommendation_logs_contact_id_fkey";

alter table "public"."recommendation_logs" add constraint "recommendation_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."recommendation_logs" validate constraint "recommendation_logs_project_id_fkey";

alter table "public"."sales_core_events" add constraint "sales_core_events_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."sales_core_events" validate constraint "sales_core_events_project_id_fkey";

alter table "public"."spend_core_events" add constraint "spend_core_events_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."spend_core_events" validate constraint "spend_core_events_project_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

alter table "public"."whatsapp_agents" add constraint "whatsapp_agents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."whatsapp_agents" validate constraint "whatsapp_agents_user_id_fkey";

alter table "public"."whatsapp_conversations" add constraint "whatsapp_conversations_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.whatsapp_agents(id) not valid;

alter table "public"."whatsapp_conversations" validate constraint "whatsapp_conversations_assigned_to_fkey";

alter table "public"."whatsapp_conversations" add constraint "whatsapp_conversations_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) not valid;

alter table "public"."whatsapp_conversations" validate constraint "whatsapp_conversations_contact_id_fkey";

alter table "public"."whatsapp_conversations" add constraint "whatsapp_conversations_whatsapp_number_id_fkey" FOREIGN KEY (whatsapp_number_id) REFERENCES public.whatsapp_numbers(id) not valid;

alter table "public"."whatsapp_conversations" validate constraint "whatsapp_conversations_whatsapp_number_id_fkey";

set check_function_bodies = off;

create or replace view "public"."finance_core_view" as  WITH ranked_sales AS (
         SELECT hs.id,
            hs.project_id,
            hs.transaction_id,
            COALESCE(hs.total_price, (0)::numeric) AS gross_amount,
            hs.net_revenue AS net_amount,
                CASE
                    WHEN (COALESCE(hs.net_revenue, (0)::numeric) = (0)::numeric) THEN true
                    ELSE false
                END AS is_net_pending,
            hs.total_price_brl,
            hs.status AS hotmart_status,
                CASE
                    WHEN (hs.status = 'COMPLETE'::text) THEN 1
                    WHEN (hs.status = 'APPROVED'::text) THEN 2
                    ELSE 99
                END AS status_priority,
                CASE
                    WHEN (hs.status = ANY (ARRAY['APPROVED'::text, 'COMPLETE'::text])) THEN true
                    ELSE false
                END AS is_valid_sale,
                CASE
                    WHEN (hs.status = ANY (ARRAY['CANCELLED'::text, 'REFUNDED'::text, 'CHARGEBACK'::text])) THEN true
                    ELSE false
                END AS is_cancelled,
            ((hs.sale_date AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text) AS economic_timestamp,
            date(((hs.sale_date AT TIME ZONE 'UTC'::text) AT TIME ZONE 'America/Sao_Paulo'::text)) AS economic_day,
            hs.sale_date AS occurred_at,
            hs.confirmation_date,
            hs.product_code,
            hs.product_name,
            hs.offer_code,
            hs.offer_currency AS currency,
            hs.buyer_email,
            hs.buyer_name,
            hs.buyer_phone,
            hs.buyer_phone_ddd,
            hs.buyer_document,
            hs.buyer_city,
            hs.buyer_state,
            hs.buyer_country,
            hs.payment_method,
            hs.payment_type,
            hs.installment_number AS installments,
            hs.coupon AS coupon_code,
            hs.affiliate_code,
            hs.affiliate_name,
            hs.checkout_origin,
            hs.sale_origin,
            hs.utm_source,
            hs.utm_campaign_id AS utm_campaign,
            hs.utm_adset_name AS utm_adset,
            hs.utm_creative,
            hs.utm_placement,
            hs.meta_campaign_id_extracted AS meta_campaign_id,
            hs.meta_adset_id_extracted AS meta_adset_id,
            hs.meta_ad_id_extracted AS meta_ad_id,
            om.funnel_id,
            om.tipo_posicao,
            om.nome_oferta,
            f.name AS funnel_name,
            f.funnel_type,
            hs.created_at,
            hs.updated_at,
            hs.last_synced_at,
            row_number() OVER (PARTITION BY hs.project_id, hs.transaction_id ORDER BY
                CASE
                    WHEN (hs.status = 'COMPLETE'::text) THEN 1
                    WHEN (hs.status = 'APPROVED'::text) THEN 2
                    ELSE 99
                END, hs.updated_at DESC NULLS LAST, hs.created_at DESC) AS rn
           FROM ((public.hotmart_sales hs
             LEFT JOIN public.offer_mappings om ON (((om.project_id = hs.project_id) AND (om.codigo_oferta = hs.offer_code))))
             LEFT JOIN public.funnels f ON ((f.id = om.funnel_id)))
          WHERE (hs.status = ANY (ARRAY['APPROVED'::text, 'COMPLETE'::text, 'CANCELLED'::text, 'REFUNDED'::text, 'CHARGEBACK'::text]))
        )
 SELECT id,
    project_id,
    transaction_id,
    gross_amount,
    net_amount,
    is_net_pending,
    total_price_brl,
    hotmart_status,
    is_valid_sale,
    is_cancelled,
    economic_timestamp,
    economic_day,
    occurred_at,
    confirmation_date,
    product_code,
    product_name,
    offer_code,
    currency,
    buyer_email,
    buyer_name,
    buyer_phone,
    buyer_phone_ddd,
    buyer_document,
    buyer_city,
    buyer_state,
    buyer_country,
    payment_method,
    payment_type,
    installments,
    coupon_code,
    affiliate_code,
    affiliate_name,
    checkout_origin,
    sale_origin,
    utm_source,
    utm_campaign,
    utm_adset,
    utm_creative,
    utm_placement,
    meta_campaign_id,
    meta_adset_id,
    meta_ad_id,
    funnel_id,
    tipo_posicao,
    nome_oferta,
    funnel_name,
    funnel_type,
    created_at,
    updated_at,
    last_synced_at
   FROM ranked_sales
  WHERE (rn = 1);


CREATE OR REPLACE FUNCTION public.get_active_connection(p_project_id uuid, p_provider_slug text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.integration_connections
  WHERE project_id = p_project_id
    AND provider_slug = p_provider_slug
    AND status = 'active'
  ORDER BY is_primary DESC, created_at ASC
  LIMIT 1;
$function$
;

create or replace view "public"."order_items_resolved" as  SELECT oi.id,
    oi.order_id,
    oi.project_id,
    oi.product_code,
    oi.product_name,
    oi.offer_code,
    oi.offer_name,
    oi.base_price,
    oi.quantity,
    oi.created_at,
    oi.item_type,
    oi.funnel_id,
    oi.provider_product_id,
    oi.provider_offer_id,
    oi.offer_mapping_id,
    oi.funnel_position,
    oi.metadata,
    COALESCE(oi.funnel_id, om.funnel_id) AS resolved_funnel_id,
        CASE
            WHEN (oi.funnel_id IS NOT NULL) THEN 'direct'::text
            WHEN (om.funnel_id IS NOT NULL) THEN 'mapping'::text
            ELSE NULL::text
        END AS resolution_source
   FROM ((public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
     LEFT JOIN public.offer_mappings om ON (((om.codigo_oferta = oi.offer_code) AND (om.project_id = o.project_id))));


CREATE OR REPLACE FUNCTION public.accept_project_invite(p_invite_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invite RECORD;
  v_member_id UUID;
  v_existing_member UUID;
BEGIN
  SELECT * INTO v_invite FROM public.project_invites WHERE id = p_invite_id AND status = 'pending';
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Convite não encontrado ou já respondido');
  END IF;

  SELECT id INTO v_existing_member FROM public.project_members
  WHERE project_id = v_invite.project_id AND user_id = p_user_id;
  IF v_existing_member IS NOT NULL THEN
    UPDATE public.project_invites SET status = 'accepted', responded_at = now() WHERE id = p_invite_id;
    RETURN jsonb_build_object('success', true, 'member_id', v_existing_member, 'project_id', v_invite.project_id);
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (v_invite.project_id, p_user_id, v_invite.role)
  RETURNING id INTO v_member_id;

  UPDATE public.project_invites SET status = 'accepted', responded_at = now() WHERE id = p_invite_id;

  RETURN jsonb_build_object('success', true, 'member_id', v_member_id, 'project_id', v_invite.project_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.aggregate_comment_metrics_daily(p_project_id uuid, p_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO comment_metrics_daily (project_id, post_id, metric_date, total_comments, total_replies, new_comments, positive_count, neutral_count, negative_count, questions_count, commercial_interest_count, complaints_count, praise_count, avg_sentiment_score, avg_intent_score)
  SELECT p_project_id, c.post_id, p_date,
    COUNT(*) FILTER (WHERE c.parent_comment_id IS NULL), COUNT(*) FILTER (WHERE c.parent_comment_id IS NOT NULL),
    COUNT(*) FILTER (WHERE DATE(c.comment_timestamp) = p_date),
    COUNT(*) FILTER (WHERE c.sentiment = 'positive'), COUNT(*) FILTER (WHERE c.sentiment = 'neutral'), COUNT(*) FILTER (WHERE c.sentiment = 'negative'),
    COUNT(*) FILTER (WHERE c.classification = 'question'), COUNT(*) FILTER (WHERE c.classification = 'commercial_interest'),
    COUNT(*) FILTER (WHERE c.classification = 'complaint'), COUNT(*) FILTER (WHERE c.classification = 'praise'),
    CASE WHEN COUNT(*) FILTER (WHERE c.sentiment IS NOT NULL) > 0 THEN
      (COUNT(*) FILTER (WHERE c.sentiment = 'positive') * 1.0 + COUNT(*) FILTER (WHERE c.sentiment = 'neutral') * 0.5) / COUNT(*) FILTER (WHERE c.sentiment IS NOT NULL) * 100 ELSE NULL END,
    AVG(c.intent_score) FILTER (WHERE c.intent_score IS NOT NULL)
  FROM social_comments c WHERE c.project_id = p_project_id AND DATE(c.comment_timestamp) <= p_date AND c.is_deleted = false GROUP BY c.post_id
  ON CONFLICT (project_id, post_id, metric_date) DO UPDATE SET
    total_comments = EXCLUDED.total_comments, total_replies = EXCLUDED.total_replies, new_comments = EXCLUDED.new_comments,
    positive_count = EXCLUDED.positive_count, neutral_count = EXCLUDED.neutral_count, negative_count = EXCLUDED.negative_count,
    questions_count = EXCLUDED.questions_count, commercial_interest_count = EXCLUDED.commercial_interest_count,
    complaints_count = EXCLUDED.complaints_count, praise_count = EXCLUDED.praise_count,
    avg_sentiment_score = EXCLUDED.avg_sentiment_score, avg_intent_score = EXCLUDED.avg_intent_score, updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_invite_to_project(_project_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.count_project_members(_project_id) < COALESCE(
    (SELECT max_members FROM public.projects WHERE id = _project_id), 5)
$function$
;

CREATE OR REPLACE FUNCTION public.can_user_create_project(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND is_active = true) THEN false
      WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id AND can_create_projects = true) THEN false
      WHEN (SELECT max_projects FROM profiles WHERE id = _user_id) = 0 THEN true
      WHEN (SELECT COUNT(*) FROM projects WHERE user_id = _user_id) < (SELECT max_projects FROM profiles WHERE id = _user_id) THEN true
      ELSE false
    END
$function$
;

create or replace view "public"."canonical_sale_events" as  WITH hotmart_mapped AS (
         SELECT (hs.id)::text AS internal_id,
            'hotmart'::text AS platform,
            hs.transaction_id AS external_id,
            hs.project_id,
            hs.buyer_email AS contact_email,
            hs.buyer_name AS contact_name,
            hs.buyer_phone AS contact_phone,
                CASE
                    WHEN (hs.status = ANY (ARRAY['REFUNDED'::text, 'refunded'::text])) THEN 'refund'::text
                    WHEN (hs.status = ANY (ARRAY['CHARGEBACK'::text, 'chargeback'::text, 'CHARGEDBACK'::text])) THEN 'chargeback'::text
                    WHEN (hs.status = ANY (ARRAY['CANCELLED'::text, 'cancelled'::text, 'CANCELED'::text])) THEN 'cancellation'::text
                    WHEN (hs.status = ANY (ARRAY['EXPIRED'::text, 'expired'::text])) THEN 'expiration'::text
                    WHEN (hs.status = ANY (ARRAY['APPROVED'::text, 'approved'::text, 'COMPLETE'::text, 'complete'::text, 'COMPLETED'::text, 'completed'::text])) THEN 'sale'::text
                    ELSE 'pending'::text
                END AS event_type,
                CASE
                    WHEN (hs.status = ANY (ARRAY['APPROVED'::text, 'approved'::text, 'COMPLETE'::text, 'complete'::text, 'COMPLETED'::text, 'completed'::text])) THEN 'confirmed'::text
                    WHEN (hs.status = ANY (ARRAY['REFUNDED'::text, 'refunded'::text, 'CHARGEBACK'::text, 'chargeback'::text, 'CHARGEDBACK'::text, 'CANCELLED'::text, 'cancelled'::text, 'CANCELED'::text])) THEN 'reversed'::text
                    WHEN (hs.status = ANY (ARRAY['EXPIRED'::text, 'expired'::text])) THEN 'expired'::text
                    ELSE 'pending'::text
                END AS canonical_status,
                CASE
                    WHEN (om.tipo_posicao = 'front'::text) THEN 'primary_sale'::text
                    WHEN (om.tipo_posicao = 'order_bump'::text) THEN 'order_bump'::text
                    WHEN (om.tipo_posicao = 'upsell'::text) THEN 'upsell'::text
                    WHEN (om.tipo_posicao = 'downsell'::text) THEN 'downsell'::text
                    ELSE NULL::text
                END AS sale_type,
            COALESCE(hs.total_price, (0)::numeric) AS gross_value_brl,
            COALESCE(hs.net_revenue, (hs.total_price * 0.9), (0)::numeric) AS net_value_brl,
            'BRL'::text AS currency,
            hs.product_code,
            hs.product_name,
            hs.offer_code,
            om.nome_oferta AS offer_name,
            (om.funnel_id)::text AS funnel_id,
            om.tipo_posicao AS funnel_position,
            om.ordem_posicao AS funnel_position_order,
            COALESCE(hs.sale_date, hs.created_at) AS event_timestamp,
            hs.sale_date AS purchase_date,
            hs.confirmation_date,
            hs.created_at AS recorded_at,
            hs.utm_source,
            NULL::text AS utm_medium,
            hs.utm_campaign_id AS utm_campaign,
            NULL::text AS utm_content,
            NULL::text AS utm_term,
            hs.checkout_origin,
            hs.payment_method,
            hs.payment_type,
            hs.installment_number AS installments_number,
            hs.status AS original_status,
            ((hs.recurrence IS NOT NULL) AND ((hs.recurrence)::integer > 0)) AS is_subscription,
            hs.affiliate_name,
            hs.affiliate_code AS affiliate_id,
            row_number() OVER (PARTITION BY hs.project_id, hs.transaction_id, hs.offer_code ORDER BY hs.created_at DESC) AS row_num
           FROM (public.hotmart_sales hs
             LEFT JOIN public.offer_mappings om ON (((om.project_id = hs.project_id) AND ((om.codigo_oferta = hs.offer_code) OR (om.id_produto = hs.product_code)))))
        ), crm_mapped AS (
         SELECT (ct.id)::text AS internal_id,
            ct.platform,
            ct.external_id,
            ct.project_id,
            cc.email AS contact_email,
            cc.name AS contact_name,
            cc.phone AS contact_phone,
                CASE
                    WHEN (ct.status = ANY (ARRAY['refunded'::text, 'REFUNDED'::text])) THEN 'refund'::text
                    WHEN (ct.status = ANY (ARRAY['chargeback'::text, 'CHARGEBACK'::text])) THEN 'chargeback'::text
                    WHEN (ct.status = ANY (ARRAY['cancelled'::text, 'CANCELLED'::text, 'canceled'::text, 'CANCELED'::text])) THEN 'cancellation'::text
                    WHEN (ct.status = ANY (ARRAY['expired'::text, 'EXPIRED'::text])) THEN 'expiration'::text
                    WHEN (ct.status = ANY (ARRAY['approved'::text, 'APPROVED'::text, 'completed'::text, 'COMPLETED'::text, 'paid'::text, 'PAID'::text])) THEN 'sale'::text
                    ELSE 'pending'::text
                END AS event_type,
                CASE
                    WHEN (ct.status = ANY (ARRAY['approved'::text, 'APPROVED'::text, 'completed'::text, 'COMPLETED'::text, 'paid'::text, 'PAID'::text])) THEN 'confirmed'::text
                    WHEN (ct.status = ANY (ARRAY['refunded'::text, 'REFUNDED'::text, 'chargeback'::text, 'CHARGEBACK'::text, 'cancelled'::text, 'CANCELLED'::text])) THEN 'reversed'::text
                    WHEN (ct.status = ANY (ARRAY['expired'::text, 'EXPIRED'::text])) THEN 'expired'::text
                    ELSE 'pending'::text
                END AS canonical_status,
            NULL::text AS sale_type,
            COALESCE(ct.total_price_brl, ct.total_price, (0)::numeric) AS gross_value_brl,
            COALESCE(ct.net_revenue, (ct.total_price_brl * 0.9), (0)::numeric) AS net_value_brl,
            'BRL'::text AS currency,
            ct.product_code,
            ct.product_name,
            ct.offer_code,
            ct.offer_name,
            (ct.funnel_id)::text AS funnel_id,
            NULL::text AS funnel_position,
            NULL::integer AS funnel_position_order,
            COALESCE(ct.transaction_date, ct.created_at) AS event_timestamp,
            ct.transaction_date AS purchase_date,
            ct.confirmation_date,
            ct.created_at AS recorded_at,
            ct.utm_source,
            ct.utm_medium,
            ct.utm_campaign,
            ct.utm_content,
            NULL::text AS utm_term,
            NULL::text AS checkout_origin,
            ct.payment_method,
            ct.payment_type,
            ct.installment_number AS installments_number,
            ct.status AS original_status,
            false AS is_subscription,
            ct.affiliate_name,
            ct.affiliate_code AS affiliate_id,
            row_number() OVER (PARTITION BY ct.project_id, ct.external_id, ct.offer_code ORDER BY ct.created_at DESC) AS row_num
           FROM (public.crm_transactions ct
             LEFT JOIN public.crm_contacts cc ON ((cc.id = ct.contact_id)))
          WHERE (ct.platform <> 'hotmart'::text)
        )
 SELECT hotmart_mapped.internal_id,
    hotmart_mapped.platform,
    hotmart_mapped.external_id,
    hotmart_mapped.project_id,
    hotmart_mapped.contact_email,
    hotmart_mapped.contact_name,
    hotmart_mapped.contact_phone,
    hotmart_mapped.event_type,
    hotmart_mapped.canonical_status,
    hotmart_mapped.sale_type,
    hotmart_mapped.gross_value_brl,
    hotmart_mapped.net_value_brl,
    hotmart_mapped.currency,
    hotmart_mapped.product_code,
    hotmart_mapped.product_name,
    hotmart_mapped.offer_code,
    hotmart_mapped.offer_name,
    hotmart_mapped.funnel_id,
    hotmart_mapped.funnel_position,
    hotmart_mapped.funnel_position_order,
    hotmart_mapped.event_timestamp,
    hotmart_mapped.purchase_date,
    hotmart_mapped.confirmation_date,
    hotmart_mapped.recorded_at,
    hotmart_mapped.utm_source,
    hotmart_mapped.utm_medium,
    hotmart_mapped.utm_campaign,
    hotmart_mapped.utm_content,
    hotmart_mapped.utm_term,
    hotmart_mapped.checkout_origin,
    hotmart_mapped.payment_method,
    hotmart_mapped.payment_type,
    hotmart_mapped.installments_number,
    hotmart_mapped.original_status,
    hotmart_mapped.is_subscription,
    hotmart_mapped.affiliate_name,
    hotmart_mapped.affiliate_id,
    hotmart_mapped.row_num
   FROM hotmart_mapped
  WHERE (hotmart_mapped.row_num = 1)
UNION ALL
 SELECT crm_mapped.internal_id,
    crm_mapped.platform,
    crm_mapped.external_id,
    crm_mapped.project_id,
    crm_mapped.contact_email,
    crm_mapped.contact_name,
    crm_mapped.contact_phone,
    crm_mapped.event_type,
    crm_mapped.canonical_status,
    crm_mapped.sale_type,
    crm_mapped.gross_value_brl,
    crm_mapped.net_value_brl,
    crm_mapped.currency,
    crm_mapped.product_code,
    crm_mapped.product_name,
    crm_mapped.offer_code,
    crm_mapped.offer_name,
    crm_mapped.funnel_id,
    crm_mapped.funnel_position,
    crm_mapped.funnel_position_order,
    crm_mapped.event_timestamp,
    crm_mapped.purchase_date,
    crm_mapped.confirmation_date,
    crm_mapped.recorded_at,
    crm_mapped.utm_source,
    crm_mapped.utm_medium,
    crm_mapped.utm_campaign,
    crm_mapped.utm_content,
    crm_mapped.utm_term,
    crm_mapped.checkout_origin,
    crm_mapped.payment_method,
    crm_mapped.payment_type,
    crm_mapped.installments_number,
    crm_mapped.original_status,
    crm_mapped.is_subscription,
    crm_mapped.affiliate_name,
    crm_mapped.affiliate_id,
    crm_mapped.row_num
   FROM crm_mapped
  WHERE (crm_mapped.row_num = 1);


CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_metrics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN DELETE FROM webhook_metrics WHERE processed_at < now() - interval '7 days'; END;
$function$
;

create or replace view "public"."contact_quiz_latest_results" as  WITH ranked_results AS (
         SELECT qr.id AS result_id,
            qr.session_id,
            qs.quiz_id,
            qs.contact_id,
            qs.project_id,
            qr.traits_vector,
            qr.intent_vector,
            qr.normalized_score,
            qr.raw_score,
            qr.summary,
            qr.created_at AS result_created_at,
            q.name AS quiz_name,
            q.quiz_type,
            row_number() OVER (PARTITION BY qs.contact_id, qs.quiz_id ORDER BY qr.created_at DESC) AS rn
           FROM ((public.quiz_results qr
             JOIN public.quiz_sessions qs ON ((qs.id = qr.session_id)))
             JOIN public.quizzes q ON ((q.id = qs.quiz_id)))
          WHERE ((qs.contact_id IS NOT NULL) AND (qs.status = 'completed'::text))
        )
 SELECT result_id,
    session_id,
    quiz_id,
    contact_id,
    project_id,
    traits_vector,
    intent_vector,
    normalized_score,
    raw_score,
    summary,
    result_created_at,
    quiz_name,
    quiz_type
   FROM ranked_results
  WHERE (rn = 1);


create or replace view "public"."contact_social_insights" as  SELECT c.id AS contact_id,
    c.project_id,
    c.name AS contact_name,
    c.email,
    c.instagram,
    count(sc.id) AS total_comments,
    count(
        CASE
            WHEN (sc.sentiment = 'positive'::public.comment_sentiment) THEN 1
            ELSE NULL::integer
        END) AS positive_comments,
    count(
        CASE
            WHEN (sc.sentiment = 'negative'::public.comment_sentiment) THEN 1
            ELSE NULL::integer
        END) AS negative_comments,
    count(
        CASE
            WHEN (sc.sentiment = 'neutral'::public.comment_sentiment) THEN 1
            ELSE NULL::integer
        END) AS neutral_comments,
    count(
        CASE
            WHEN (sc.classification = 'commercial_interest'::text) THEN 1
            ELSE NULL::integer
        END) AS commercial_interest_count,
    count(
        CASE
            WHEN (sc.classification = 'question'::text) THEN 1
            ELSE NULL::integer
        END) AS questions_count,
    round(avg(sc.intent_score), 1) AS avg_intent_score,
    max(sc.comment_timestamp) AS last_comment_at
   FROM (public.crm_contacts c
     LEFT JOIN public.social_comments sc ON (((sc.crm_contact_id = c.id) AND (sc.is_deleted = false))))
  GROUP BY c.id, c.project_id, c.name, c.email, c.instagram;


CREATE OR REPLACE FUNCTION public.count_project_members(_project_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER FROM public.project_members WHERE project_id = _project_id
$function$
;

CREATE OR REPLACE FUNCTION public.create_member_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'owner' THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO public.project_member_permissions (project_id, user_id)
  VALUES (NEW.project_id, NEW.user_id)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_team_member_contact(p_project_id uuid, p_user_id uuid, p_email text, p_name text, p_phone text DEFAULT NULL::text, p_phone_ddd text DEFAULT NULL::text, p_phone_country_code text DEFAULT '55'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.crm_contacts (project_id, email, name, phone, phone_ddd, phone_country_code, source, status, tags)
  VALUES (p_project_id, LOWER(TRIM(p_email)), p_name, p_phone, p_phone_ddd, p_phone_country_code, 'team', 'team', ARRAY['Equipe'])
  ON CONFLICT (project_id, email) DO UPDATE SET
    tags = CASE 
      WHEN NOT ('Equipe' = ANY(COALESCE(crm_contacts.tags, ARRAY[]::text[])))
      THEN array_append(COALESCE(crm_contacts.tags, ARRAY[]::text[]), 'Equipe')
      ELSE crm_contacts.tags
    END,
    updated_at = now();
END;
$function$
;

create or replace view "public"."crm_contact_attribution_view" as  WITH first_orders AS (
         SELECT DISTINCT ON ((lower(o.buyer_email)), o.project_id) o.id AS order_id,
            o.project_id,
            lower(o.buyer_email) AS buyer_email,
            o.buyer_name,
            o.ordered_at,
            o.raw_payload
           FROM public.orders o
          WHERE (o.status = ANY (ARRAY['approved'::text, 'completed'::text, 'APPROVED'::text, 'COMPLETE'::text]))
          ORDER BY (lower(o.buyer_email)), o.project_id, o.ordered_at
        )
 SELECT project_id,
    buyer_email,
    buyer_name,
    ordered_at AS first_order_at,
    split_part(((((raw_payload -> 'data'::text) -> 'purchase'::text) -> 'origin'::text) ->> 'sck'::text), '|'::text, 1) AS utm_source,
    split_part(((((raw_payload -> 'data'::text) -> 'purchase'::text) -> 'origin'::text) ->> 'sck'::text), '|'::text, 2) AS meta_campaign_id,
    split_part(((((raw_payload -> 'data'::text) -> 'purchase'::text) -> 'origin'::text) ->> 'sck'::text), '|'::text, 3) AS meta_adset_id,
    split_part(((((raw_payload -> 'data'::text) -> 'purchase'::text) -> 'origin'::text) ->> 'sck'::text), '|'::text, 4) AS utm_placement,
    split_part(((((raw_payload -> 'data'::text) -> 'purchase'::text) -> 'origin'::text) ->> 'sck'::text), '|'::text, 5) AS meta_ad_id,
    ((((raw_payload -> 'data'::text) -> 'purchase'::text) -> 'origin'::text) ->> 'sck'::text) AS raw_sck,
    ((((raw_payload -> 'data'::text) -> 'purchase'::text) -> 'origin'::text) ->> 'xcod'::text) AS raw_xcod
   FROM first_orders fo;


create or replace view "public"."crm_contact_orders_metrics_view" as  SELECT c.id AS contact_id,
    c.email AS contact_email,
    c.name AS contact_name,
    c.project_id,
    (COALESCE(count(DISTINCT o.id), (0)::bigint))::integer AS orders_count,
    (COALESCE(count(oi.id), (0)::bigint))::integer AS items_count,
    COALESCE(sum(o.customer_paid), (0)::numeric) AS total_customer_paid,
    COALESCE(sum(o.producer_net), (0)::numeric) AS total_producer_net,
        CASE
            WHEN (count(DISTINCT o.id) > 0) THEN round((sum(o.customer_paid) / (count(DISTINCT o.id))::numeric), 2)
            ELSE (0)::numeric
        END AS avg_ticket,
    min(o.ordered_at) AS first_order_at,
    max(o.ordered_at) AS last_order_at,
        CASE
            WHEN (max(o.ordered_at) IS NOT NULL) THEN (EXTRACT(day FROM (now() - max(o.ordered_at))))::integer
            ELSE NULL::integer
        END AS days_since_last_order,
    (count(DISTINCT o.id) > 1) AS is_repeat_customer,
    ( SELECT oi2.product_name
           FROM (public.orders o2
             JOIN public.order_items oi2 ON ((oi2.order_id = o2.id)))
          WHERE ((o2.buyer_email = c.email) AND (o2.project_id = c.project_id) AND (o2.status = 'approved'::text))
          ORDER BY o2.ordered_at
         LIMIT 1) AS first_product,
    ( SELECT oi2.product_name
           FROM (public.orders o2
             JOIN public.order_items oi2 ON ((oi2.order_id = o2.id)))
          WHERE ((o2.buyer_email = c.email) AND (o2.project_id = c.project_id) AND (o2.status = 'approved'::text))
          ORDER BY o2.ordered_at DESC
         LIMIT 1) AS last_product,
    ( SELECT o2.utm_source
           FROM public.orders o2
          WHERE ((o2.buyer_email = c.email) AND (o2.project_id = c.project_id) AND (o2.status = 'approved'::text) AND (o2.utm_source IS NOT NULL))
          ORDER BY o2.ordered_at
         LIMIT 1) AS first_utm_source,
    ( SELECT jsonb_object_agg(breakdown.provider, jsonb_build_object('count', breakdown.order_count, 'revenue', breakdown.revenue)) AS jsonb_object_agg
           FROM ( SELECT o2.provider,
                    count(DISTINCT o2.id) AS order_count,
                    sum(o2.customer_paid) AS revenue
                   FROM public.orders o2
                  WHERE ((o2.buyer_email = c.email) AND (o2.project_id = c.project_id) AND (o2.status = 'approved'::text))
                  GROUP BY o2.provider) breakdown) AS provider_breakdown
   FROM ((public.crm_contacts c
     LEFT JOIN public.orders o ON (((o.buyer_email = c.email) AND (o.project_id = c.project_id) AND (o.status = 'approved'::text))))
     LEFT JOIN public.order_items oi ON ((oi.order_id = o.id)))
  GROUP BY c.id, c.email, c.name, c.project_id;


create or replace view "public"."crm_contact_revenue_view" as  SELECT project_id,
    lower(buyer_email) AS buyer_email,
    max(buyer_name) AS buyer_name,
    count(DISTINCT id) AS total_orders,
    sum(customer_paid) AS total_customer_paid,
    sum(producer_net) AS total_producer_net,
    min(ordered_at) AS first_purchase_at,
    max(ordered_at) AS last_purchase_at,
    round(avg(customer_paid), 2) AS average_ticket
   FROM public.orders o
  WHERE (status = ANY (ARRAY['approved'::text, 'completed'::text, 'APPROVED'::text, 'COMPLETE'::text]))
  GROUP BY project_id, (lower(buyer_email));


create or replace view "public"."crm_customer_intelligence_overview" as  WITH orders_metrics AS (
         SELECT o.project_id,
            count(DISTINCT o.id) AS total_orders,
            count(DISTINCT o.buyer_email) AS unique_customers,
            sum(o.customer_paid) AS total_revenue
           FROM public.orders o
          WHERE (o.status = 'approved'::text)
          GROUP BY o.project_id
        ), repeat_customers AS (
         SELECT x.project_id,
            count(*) AS repeat_count
           FROM ( SELECT orders.project_id,
                    orders.buyer_email
                   FROM public.orders
                  WHERE (orders.status = 'approved'::text)
                  GROUP BY orders.project_id, orders.buyer_email
                 HAVING (count(*) >= 2)) x
          GROUP BY x.project_id
        )
 SELECT c.project_id,
    (( SELECT count(*) AS count
           FROM public.crm_contacts
          WHERE (crm_contacts.project_id = c.project_id)))::integer AS total_contacts,
    (COALESCE(om.unique_customers, (0)::bigint))::integer AS total_customers,
    ((( SELECT count(*) AS count
           FROM public.crm_contacts
          WHERE (crm_contacts.project_id = c.project_id)) - COALESCE(om.unique_customers, (0)::bigint)))::integer AS total_leads,
    0 AS total_prospects,
    COALESCE(om.total_revenue, (0)::numeric) AS total_revenue,
        CASE
            WHEN (om.unique_customers > 0) THEN round((om.total_revenue / (om.unique_customers)::numeric), 2)
            ELSE (0)::numeric
        END AS avg_ltv,
        CASE
            WHEN (om.total_orders > 0) THEN round((om.total_revenue / (om.total_orders)::numeric), 2)
            ELSE (0)::numeric
        END AS avg_ticket,
    (COALESCE(om.total_orders, (0)::bigint))::integer AS total_orders,
        CASE
            WHEN (om.unique_customers > 0) THEN round(((om.total_orders)::numeric / (om.unique_customers)::numeric), 2)
            ELSE (0)::numeric
        END AS avg_orders_per_customer,
    (COALESCE(rc.repeat_count, (0)::bigint))::integer AS repeat_customers_count,
        CASE
            WHEN (om.unique_customers > 0) THEN round((((COALESCE(rc.repeat_count, (0)::bigint))::numeric / (om.unique_customers)::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS repeat_rate_percent
   FROM ((( SELECT DISTINCT crm_contacts.project_id
           FROM public.crm_contacts) c
     LEFT JOIN orders_metrics om ON ((om.project_id = c.project_id)))
     LEFT JOIN repeat_customers rc ON ((rc.project_id = c.project_id)));


create or replace view "public"."crm_journey_orders_view" as  SELECT o.id AS order_id,
    o.provider_order_id,
    o.project_id,
    c.id AS contact_id,
    COALESCE(c.name, o.buyer_name) AS contact_name,
    o.buyer_email AS contact_email,
    o.ordered_at,
    COALESCE(o.customer_paid, (0)::numeric) AS customer_paid,
    COALESCE(o.producer_net, (0)::numeric) AS producer_net,
    o.currency,
    o.provider,
    o.utm_source,
    o.utm_campaign,
    o.utm_adset,
    o.utm_placement,
    o.utm_creative,
    (( SELECT count(*) AS count
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)))::integer AS items_count,
    o.status,
    ( SELECT COALESCE(jsonb_agg(jsonb_build_object('item_type', oi.item_type, 'product_name', oi.product_name, 'offer_name', oi.offer_name, 'base_price', oi.base_price, 'funnel_id', oi.funnel_id) ORDER BY
                CASE oi.item_type
                    WHEN 'main'::text THEN 0
                    WHEN 'bump'::text THEN 1
                    ELSE 2
                END), '[]'::jsonb) AS "coalesce"
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)) AS products_detail,
    ( SELECT oi.product_name
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)
          ORDER BY
                CASE oi.item_type
                    WHEN 'main'::text THEN 0
                    WHEN 'bump'::text THEN 1
                    ELSE 2
                END
         LIMIT 1) AS main_product_name,
    ( SELECT oi.funnel_id
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)
          ORDER BY
                CASE oi.item_type
                    WHEN 'main'::text THEN 0
                    WHEN 'bump'::text THEN 1
                    ELSE 2
                END
         LIMIT 1) AS main_funnel_id,
    row_number() OVER (PARTITION BY o.buyer_email, o.project_id ORDER BY o.ordered_at) AS purchase_sequence
   FROM (public.orders o
     LEFT JOIN public.crm_contacts c ON (((c.email = o.buyer_email) AND (c.project_id = o.project_id))))
  WHERE (o.status = 'approved'::text);


create or replace view "public"."crm_order_automation_events_view" as  SELECT o.id AS order_id,
    o.provider_order_id,
    o.project_id,
    c.id AS contact_id,
    COALESCE(c.name, o.buyer_name) AS contact_name,
    o.buyer_email AS contact_email,
    c.phone AS contact_phone,
        CASE
            WHEN (row_number() OVER (PARTITION BY o.buyer_email, o.project_id ORDER BY o.ordered_at) = 1) THEN 'first_order'::text
            ELSE 'repeat_order'::text
        END AS event_type,
    (row_number() OVER (PARTITION BY o.buyer_email, o.project_id ORDER BY o.ordered_at))::integer AS order_sequence,
    COALESCE(o.customer_paid, (0)::numeric) AS order_value,
    COALESCE(o.producer_net, (0)::numeric) AS producer_net,
    o.currency,
    o.ordered_at,
    o.created_at,
    (( SELECT count(*) AS count
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)))::integer AS items_count,
    ( SELECT oi.product_name
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)
          ORDER BY oi.base_price DESC NULLS LAST
         LIMIT 1) AS main_product_name,
    o.utm_source,
    o.utm_campaign,
    o.utm_adset,
    o.provider,
    o.status,
    ( SELECT oi.funnel_id
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)
          ORDER BY oi.base_price DESC NULLS LAST
         LIMIT 1) AS funnel_id
   FROM (public.orders o
     LEFT JOIN public.crm_contacts c ON (((c.email = o.buyer_email) AND (c.project_id = o.project_id))))
  WHERE (o.status = 'approved'::text)
  ORDER BY o.ordered_at DESC;


create or replace view "public"."crm_order_items_view" as  SELECT oi.id AS item_id,
    oi.order_id,
    o.project_id,
    o.buyer_email,
    o.buyer_name,
    oi.item_type,
    oi.product_name,
    oi.provider_product_id,
    oi.provider_offer_id,
    oi.base_price,
    COALESCE(oi.funnel_id, om.funnel_id) AS funnel_id,
    f.name AS funnel_name
   FROM (((public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
     LEFT JOIN public.offer_mappings om ON (((om.codigo_oferta = oi.provider_offer_id) AND (om.project_id = o.project_id))))
     LEFT JOIN public.funnels f ON ((f.id = COALESCE(oi.funnel_id, om.funnel_id))))
  WHERE (o.status = ANY (ARRAY['approved'::text, 'completed'::text, 'APPROVED'::text, 'COMPLETE'::text]));


create or replace view "public"."crm_orders_view" as  SELECT id AS order_id,
    project_id,
    provider_order_id,
    buyer_email,
    buyer_name,
    ordered_at,
    approved_at,
    status,
    customer_paid,
    producer_net,
    ( SELECT count(*) AS count
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)) AS item_count,
    (EXISTS ( SELECT 1
           FROM public.order_items oi
          WHERE ((oi.order_id = o.id) AND (oi.item_type <> 'main'::text)))) AS has_bump,
    (EXISTS ( SELECT 1
           FROM public.order_items oi
          WHERE ((oi.order_id = o.id) AND (oi.item_type = 'upsell'::text)))) AS has_upsell,
    COALESCE(( SELECT oi.funnel_id
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)
         LIMIT 1), ( SELECT om.funnel_id
           FROM (public.order_items oi
             JOIN public.offer_mappings om ON (((om.codigo_oferta = oi.provider_offer_id) AND (om.project_id = o.project_id))))
          WHERE (oi.order_id = o.id)
         LIMIT 1)) AS funnel_id,
    ( SELECT f.name
           FROM public.funnels f
          WHERE (f.id = COALESCE(( SELECT oi.funnel_id
                   FROM public.order_items oi
                  WHERE (oi.order_id = o.id)
                 LIMIT 1), ( SELECT om.funnel_id
                   FROM (public.order_items oi
                     JOIN public.offer_mappings om ON (((om.codigo_oferta = oi.provider_offer_id) AND (om.project_id = o.project_id))))
                  WHERE (oi.order_id = o.id)
                 LIMIT 1)))) AS funnel_name
   FROM public.orders o
  WHERE (status = ANY (ARRAY['approved'::text, 'completed'::text, 'APPROVED'::text, 'COMPLETE'::text]));


create or replace view "public"."crm_recovery_orders_view" as  SELECT id AS order_id,
    project_id,
    provider_order_id,
    buyer_email,
    buyer_name,
    ordered_at,
    status,
    customer_paid,
    producer_net,
    (COALESCE(( SELECT count(*) AS count
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)), (0)::bigint))::integer AS item_count,
    ( SELECT oi.product_name
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)
          ORDER BY oi.base_price DESC
         LIMIT 1) AS main_product_name,
    COALESCE(( SELECT oi.funnel_id
           FROM public.order_items oi
          WHERE ((oi.order_id = o.id) AND (oi.funnel_id IS NOT NULL))
         LIMIT 1), ( SELECT om.funnel_id
           FROM (public.order_items oi
             JOIN public.offer_mappings om ON (((om.codigo_oferta = oi.provider_offer_id) AND (om.project_id = o.project_id))))
          WHERE ((oi.order_id = o.id) AND (om.funnel_id IS NOT NULL))
         LIMIT 1)) AS funnel_id,
    ( SELECT f.name
           FROM public.funnels f
          WHERE (f.id = COALESCE(( SELECT oi.funnel_id
                   FROM public.order_items oi
                  WHERE ((oi.order_id = o.id) AND (oi.funnel_id IS NOT NULL))
                 LIMIT 1), ( SELECT om.funnel_id
                   FROM (public.order_items oi
                     JOIN public.offer_mappings om ON (((om.codigo_oferta = oi.provider_offer_id) AND (om.project_id = o.project_id))))
                  WHERE ((oi.order_id = o.id) AND (om.funnel_id IS NOT NULL))
                 LIMIT 1)))) AS funnel_name,
        CASE
            WHEN (status = ANY (ARRAY['cancelled'::text, 'CANCELLED'::text])) THEN 'Cancelado'::text
            WHEN (status = ANY (ARRAY['chargeback'::text, 'CHARGEBACK'::text])) THEN 'Chargeback'::text
            WHEN (status = ANY (ARRAY['refunded'::text, 'REFUNDED'::text])) THEN 'Reembolsado'::text
            WHEN (status = ANY (ARRAY['abandoned'::text, 'ABANDONED'::text])) THEN 'Carrinho Abandonado'::text
            WHEN (status = ANY (ARRAY['pending'::text, 'PENDING'::text, 'expired'::text, 'EXPIRED'::text])) THEN 'Pendente'::text
            ELSE status
        END AS recovery_category
   FROM public.orders o
  WHERE (status <> ALL (ARRAY['approved'::text, 'completed'::text, 'APPROVED'::text, 'COMPLETE'::text]))
  ORDER BY ordered_at DESC;


CREATE OR REPLACE FUNCTION public.decrypt_sensitive(p_encrypted_data text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_key text; v_decoded text; v_parts text[]; v_data text; v_checksum text;
BEGIN
  IF p_encrypted_data IS NULL OR p_encrypted_data = '' THEN RETURN p_encrypted_data; END IF;
  IF NOT p_encrypted_data LIKE 'ENC:%' THEN RETURN p_encrypted_data; END IF;
  v_key := public.get_encryption_key('default');
  BEGIN
    v_decoded := convert_from(decode(substring(p_encrypted_data from 5), 'base64'), 'UTF8');
    v_parts := string_to_array(v_decoded, '::');
    v_data := v_parts[1];
    v_checksum := v_parts[2];
    IF v_checksum = md5(v_data || v_key) THEN RETURN v_data; ELSE RETURN '[DECRYPTION_FAILED]'; END IF;
  EXCEPTION WHEN OTHERS THEN RETURN p_encrypted_data;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.detect_auto_recovery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_recovery_stage_id uuid; v_previous_cancellation RECORD; v_current_tags text[];
BEGIN
  IF NEW.status NOT IN ('APPROVED', 'COMPLETE') THEN RETURN NEW; END IF;
  SELECT * INTO v_previous_cancellation FROM public.crm_transactions t
  WHERE t.contact_id = NEW.contact_id AND t.status IN ('CANCELLED', 'REFUNDED', 'CHARGEBACK')
    AND t.transaction_date < NEW.transaction_date
    AND ((t.offer_code IS NOT NULL AND t.offer_code = NEW.offer_code) OR (t.product_code IS NOT NULL AND t.product_code = NEW.product_code AND (t.offer_code IS NULL OR NEW.offer_code IS NULL)))
  ORDER BY t.transaction_date DESC LIMIT 1;
  IF v_previous_cancellation IS NOT NULL THEN
    SELECT id INTO v_recovery_stage_id FROM public.crm_recovery_stages WHERE project_id = NEW.project_id AND is_recovered = true LIMIT 1;
    SELECT tags INTO v_current_tags FROM public.crm_contacts WHERE id = NEW.contact_id;
    UPDATE public.crm_contacts SET 
      tags = CASE WHEN 'Recuperado (auto)' = ANY(COALESCE(v_current_tags, ARRAY[]::text[])) THEN v_current_tags ELSE array_append(COALESCE(v_current_tags, ARRAY[]::text[]), 'Recuperado (auto)') END,
      recovery_stage_id = COALESCE(v_recovery_stage_id, recovery_stage_id), recovery_updated_at = now(), updated_at = now()
    WHERE id = NEW.contact_id;
    INSERT INTO public.crm_activities (contact_id, project_id, activity_type, description, metadata)
    VALUES (NEW.contact_id, NEW.project_id, 'auto_recovery',
      'Cliente recuperado automaticamente! Comprou "' || NEW.product_name || '" após ' || 
      CASE v_previous_cancellation.status WHEN 'CANCELLED' THEN 'cancelamento' WHEN 'REFUNDED' THEN 'reembolso' WHEN 'CHARGEBACK' THEN 'chargeback' ELSE 'perda' END || ' anterior.',
      jsonb_build_object('recovery_type', 'automatic', 'original_cancellation_id', v_previous_cancellation.id, 'original_status', v_previous_cancellation.status, 'recovery_transaction_id', NEW.id, 'product_name', NEW.product_name));
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_contact_document()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.document IS NOT NULL AND NEW.document != '' 
     AND NOT NEW.document LIKE 'ENC:%'
     AND (OLD IS NULL OR NEW.document IS DISTINCT FROM OLD.document) THEN
    NEW.document_encrypted := public.encrypt_sensitive(NEW.document);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_project_credentials()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.client_secret IS NOT NULL AND NEW.client_secret != '' AND NOT NEW.client_secret LIKE 'ENC:%' THEN
    NEW.client_secret_encrypted := public.encrypt_sensitive(NEW.client_secret);
    NEW.client_secret := NULL;
  END IF;
  IF NEW.basic_auth IS NOT NULL AND NEW.basic_auth != '' AND NOT NEW.basic_auth LIKE 'ENC:%' THEN
    NEW.basic_auth_encrypted := public.encrypt_sensitive(NEW.basic_auth);
    NEW.basic_auth := NULL;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_sensitive(p_data text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_key text; v_encoded text;
BEGIN
  IF p_data IS NULL OR p_data = '' THEN RETURN p_data; END IF;
  v_key := public.get_encryption_key('default');
  v_encoded := 'ENC:' || encode(convert_to(p_data || '::' || md5(p_data || v_key), 'UTF8'), 'base64');
  RETURN v_encoded;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.extract_name_parts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.first_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.first_name := TRIM(SPLIT_PART(NEW.name, ' ', 1));
  END IF;
  
  IF NEW.last_name IS NULL AND NEW.name IS NOT NULL AND POSITION(' ' IN NEW.name) > 0 THEN
    NEW.last_name := TRIM(SUBSTRING(NEW.name FROM POSITION(' ' IN NEW.name) + 1));
  END IF;
  
  RETURN NEW;
END;
$function$
;

create or replace view "public"."finance_ledger_summary" as  SELECT fl.project_id,
    fl.transaction_id,
    fl.provider,
    hs.product_name,
    hs.product_code,
    hs.offer_code,
    hs.buyer_name,
    hs.buyer_email,
    hs.buyer_phone_country_code,
    hs.buyer_phone_ddd,
    hs.buyer_phone,
    hs.payment_method,
    hs.payment_type,
    hs.recurrence,
    hs.is_upgrade,
    hs.subscriber_code,
    om.funnel_id,
    f.name AS funnel_name,
    min(fl.occurred_at) AS first_event_at,
    max(fl.occurred_at) AS last_event_at,
    ((min(fl.occurred_at) AT TIME ZONE 'America/Sao_Paulo'::text))::date AS economic_day,
    sum(
        CASE
            WHEN (fl.event_type = ANY (ARRAY['credit'::text, 'producer'::text])) THEN fl.amount
            ELSE (0)::numeric
        END) AS producer_gross,
    sum(
        CASE
            WHEN (fl.event_type = 'affiliate'::text) THEN abs(fl.amount)
            ELSE (0)::numeric
        END) AS affiliate_cost,
    sum(
        CASE
            WHEN (fl.event_type = 'coproducer'::text) THEN abs(fl.amount)
            ELSE (0)::numeric
        END) AS coproducer_cost,
    sum(
        CASE
            WHEN (fl.event_type = ANY (ARRAY['platform_fee'::text, 'tax'::text])) THEN abs(fl.amount)
            ELSE (0)::numeric
        END) AS platform_cost,
    sum(
        CASE
            WHEN (fl.event_type = ANY (ARRAY['refund'::text, 'chargeback'::text])) THEN abs(fl.amount)
            ELSE (0)::numeric
        END) AS refunds,
    (sum(
        CASE
            WHEN (fl.event_type = ANY (ARRAY['credit'::text, 'producer'::text])) THEN fl.amount
            ELSE (0)::numeric
        END) - sum(
        CASE
            WHEN (fl.event_type = ANY (ARRAY['affiliate'::text, 'coproducer'::text, 'platform_fee'::text, 'tax'::text, 'refund'::text, 'chargeback'::text])) THEN abs(fl.amount)
            ELSE (0)::numeric
        END)) AS net_revenue,
    fl.provider AS provider_source,
    count(*) AS event_count,
    hs.utm_source,
    hs.utm_medium,
    hs.utm_campaign_id AS utm_campaign,
    hs.utm_adset_name AS utm_adset,
    hs.utm_placement,
    hs.utm_creative,
    hs.meta_campaign_id_extracted AS meta_campaign_id,
    hs.meta_adset_id_extracted AS meta_adset_id,
    hs.meta_ad_id_extracted AS meta_ad_id,
    hs.checkout_origin,
    hs.status AS hotmart_status,
    hs.sale_category,
    COALESCE(hs.utm_term, hs.utm_placement) AS utm_term,
    COALESCE(hs.utm_content, hs.utm_creative) AS utm_content,
    COALESCE(hs.raw_checkout_origin, hs.checkout_origin) AS raw_checkout_origin
   FROM (((public.finance_ledger fl
     LEFT JOIN public.hotmart_sales hs ON (((fl.transaction_id = hs.transaction_id) AND (fl.project_id = hs.project_id))))
     LEFT JOIN public.offer_mappings om ON (((hs.offer_code = om.codigo_oferta) AND (hs.project_id = om.project_id))))
     LEFT JOIN public.funnels f ON ((om.funnel_id = f.id)))
  GROUP BY fl.project_id, fl.transaction_id, fl.provider, hs.product_name, hs.product_code, hs.offer_code, hs.buyer_name, hs.buyer_email, hs.buyer_phone_country_code, hs.buyer_phone_ddd, hs.buyer_phone, hs.payment_method, hs.payment_type, hs.recurrence, hs.is_upgrade, hs.subscriber_code, om.funnel_id, f.name, hs.utm_source, hs.utm_medium, hs.utm_campaign_id, hs.utm_adset_name, hs.utm_placement, hs.utm_creative, hs.utm_term, hs.utm_content, hs.raw_checkout_origin, hs.checkout_origin, hs.meta_campaign_id_extracted, hs.meta_adset_id_extracted, hs.meta_ad_id_extracted, hs.status, hs.sale_category;


create or replace view "public"."finance_tracking_view" as  WITH deduplicated_events AS (
         SELECT sce.project_id,
            (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'::text))[1] AS transaction_id,
            sce.event_type,
            sce.occurred_at,
            sce.contact_id,
            row_number() OVER (PARTITION BY sce.project_id, (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'::text))[1] ORDER BY
                CASE sce.event_type
                    WHEN 'COMPLETE'::text THEN 1
                    WHEN 'APPROVED'::text THEN 2
                    WHEN 'BACKFILL'::text THEN 3
                    ELSE 4
                END, sce.occurred_at DESC) AS rn
           FROM public.sales_core_events sce
          WHERE (sce.provider = 'hotmart'::text)
        )
 SELECT hs.id,
    hs.project_id,
    hs.transaction_id,
    hs.total_price_brl AS gross_amount,
    hs.net_revenue AS net_amount,
    hs.status AS hotmart_status,
    hs.sale_date AS purchase_date,
    ((hs.sale_date AT TIME ZONE 'America/Sao_Paulo'::text))::date AS economic_day,
    hs.product_name,
    hs.product_code,
    hs.offer_code,
    hs.payment_method,
    hs.payment_type,
    hs.buyer_name,
    hs.buyer_email,
    hs.buyer_phone,
    hs.buyer_phone_ddd,
    hs.buyer_phone_country_code,
    om.funnel_id,
    f.name AS funnel_name,
    COALESCE(NULLIF(hs.utm_source, ''::text),
        CASE
            WHEN (hs.checkout_origin ~~* 'meta-ads%'::text) THEN 'facebook'::text
            WHEN ((hs.checkout_origin ~~* 'wpp%'::text) OR (hs.checkout_origin ~~* 'whatsapp%'::text)) THEN 'whatsapp'::text
            WHEN (hs.checkout_origin ~~* 'google%'::text) THEN 'google'::text
            ELSE NULLIF((string_to_array(hs.checkout_origin, '|'::text))[1], ''::text)
        END) AS utm_source,
    COALESCE(NULLIF(hs.utm_campaign_id, ''::text), NULLIF((string_to_array(hs.checkout_origin, '|'::text))[2], ''::text)) AS utm_campaign,
    COALESCE(NULLIF(hs.utm_adset_name, ''::text), NULLIF((string_to_array(hs.checkout_origin, '|'::text))[3], ''::text)) AS utm_adset,
    COALESCE(NULLIF(hs.utm_placement, ''::text), NULLIF((string_to_array(hs.checkout_origin, '|'::text))[4], ''::text)) AS utm_placement,
    COALESCE(NULLIF(hs.utm_creative, ''::text), NULLIF((string_to_array(hs.checkout_origin, '|'::text))[5], ''::text)) AS utm_creative,
    COALESCE(NULLIF(hs.utm_medium, ''::text),
        CASE
            WHEN (hs.checkout_origin ~~* 'meta-ads%'::text) THEN 'paid'::text
            WHEN ((hs.checkout_origin ~~* 'wpp%'::text) OR (hs.checkout_origin ~~* 'whatsapp%'::text)) THEN 'organic'::text
            WHEN (hs.checkout_origin ~~* 'google%'::text) THEN 'paid'::text
            ELSE NULL::text
        END) AS utm_medium,
    hs.meta_campaign_id_extracted AS meta_campaign_id,
    hs.meta_adset_id_extracted AS meta_adset_id,
    hs.meta_ad_id_extracted AS meta_ad_id,
    hs.checkout_origin,
    de.contact_id,
    de.event_type AS webhook_event_type,
    hs.sale_category,
    hs.recurrence,
    hs.created_at,
    hs.updated_at
   FROM (((public.hotmart_sales hs
     LEFT JOIN deduplicated_events de ON (((de.project_id = hs.project_id) AND (de.transaction_id = hs.transaction_id) AND (de.rn = 1))))
     LEFT JOIN public.offer_mappings om ON (((om.project_id = hs.project_id) AND (om.codigo_oferta = hs.offer_code))))
     LEFT JOIN public.funnels f ON ((f.id = om.funnel_id)));


create or replace view "public"."funnel_metrics_daily" as  WITH daily_sales AS (
         SELECT cse.project_id,
            cse.funnel_id,
            date((cse.event_timestamp AT TIME ZONE 'America/Sao_Paulo'::text)) AS metric_date,
            count(*) FILTER (WHERE ((cse.event_type = 'sale'::text) AND (cse.canonical_status = 'confirmed'::text))) AS confirmed_sales,
            count(*) FILTER (WHERE ((cse.event_type = 'sale'::text) AND (cse.canonical_status = 'confirmed'::text) AND (cse.funnel_position = 'front'::text))) AS front_sales,
            count(*) FILTER (WHERE (cse.event_type = 'refund'::text)) AS refunds,
            count(*) FILTER (WHERE (cse.event_type = 'chargeback'::text)) AS chargebacks,
            COALESCE(sum(cse.gross_value_brl) FILTER (WHERE ((cse.event_type = 'sale'::text) AND (cse.canonical_status = 'confirmed'::text))), (0)::numeric) AS gross_revenue,
            COALESCE(sum(cse.net_value_brl) FILTER (WHERE ((cse.event_type = 'sale'::text) AND (cse.canonical_status = 'confirmed'::text))), (0)::numeric) AS net_revenue,
            count(DISTINCT cse.contact_email) FILTER (WHERE ((cse.event_type = 'sale'::text) AND (cse.canonical_status = 'confirmed'::text))) AS unique_buyers
           FROM public.canonical_sale_events cse
          WHERE (cse.funnel_id IS NOT NULL)
          GROUP BY cse.project_id, cse.funnel_id, (date((cse.event_timestamp AT TIME ZONE 'America/Sao_Paulo'::text)))
        ), daily_investment AS (
         SELECT mi.project_id,
            (fma.funnel_id)::text AS funnel_id,
            mi.date_start AS metric_date,
            COALESCE(sum(mi.spend), (0)::numeric) AS investment
           FROM ((public.meta_insights mi
             JOIN public.meta_ad_accounts maa ON (((maa.account_id = mi.ad_account_id) AND (maa.project_id = mi.project_id))))
             JOIN public.funnel_meta_accounts fma ON (((fma.meta_account_id = maa.id) AND (fma.project_id = mi.project_id))))
          GROUP BY mi.project_id, fma.funnel_id, mi.date_start
        )
 SELECT COALESCE(ds.project_id, di.project_id) AS project_id,
    COALESCE(ds.funnel_id, di.funnel_id) AS funnel_id,
    COALESCE(ds.metric_date, di.metric_date) AS metric_date,
    COALESCE(di.investment, (0)::numeric) AS investment,
    COALESCE(ds.confirmed_sales, (0)::bigint) AS confirmed_sales,
    COALESCE(ds.front_sales, (0)::bigint) AS front_sales,
    COALESCE(ds.refunds, (0)::bigint) AS refunds,
    COALESCE(ds.chargebacks, (0)::bigint) AS chargebacks,
    COALESCE(ds.unique_buyers, (0)::bigint) AS unique_buyers,
    COALESCE(ds.gross_revenue, (0)::numeric) AS gross_revenue,
    COALESCE(ds.net_revenue, (0)::numeric) AS net_revenue,
        CASE
            WHEN (COALESCE(ds.confirmed_sales, (0)::bigint) > 0) THEN round((ds.gross_revenue / (ds.confirmed_sales)::numeric), 2)
            ELSE (0)::numeric
        END AS avg_ticket,
        CASE
            WHEN (COALESCE(di.investment, (0)::numeric) > (0)::numeric) THEN round((ds.gross_revenue / di.investment), 2)
            ELSE NULL::numeric
        END AS roas,
        CASE
            WHEN (COALESCE(ds.front_sales, (0)::bigint) > 0) THEN round((di.investment / (ds.front_sales)::numeric), 2)
            ELSE NULL::numeric
        END AS cpa_real,
        CASE
            WHEN (COALESCE(ds.confirmed_sales, (0)::bigint) > 0) THEN round((((ds.refunds)::numeric / (ds.confirmed_sales)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS refund_rate,
        CASE
            WHEN (COALESCE(ds.confirmed_sales, (0)::bigint) > 0) THEN round((((ds.chargebacks)::numeric / (ds.confirmed_sales)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS chargeback_rate
   FROM (daily_sales ds
     FULL JOIN daily_investment di ON (((ds.project_id = di.project_id) AND (ds.funnel_id = di.funnel_id) AND (ds.metric_date = di.metric_date))))
  WHERE (COALESCE(ds.funnel_id, di.funnel_id) IS NOT NULL);


create or replace view "public"."funnel_orders_by_offer" as  SELECT o.project_id,
    oi.provider_offer_id AS offer_code,
    oi.product_name,
    oi.item_type,
    COALESCE(om.funnel_id, oi.funnel_id) AS funnel_id,
    f.name AS funnel_name,
    om.tipo_posicao,
    om.nome_posicao,
    om.ordem_posicao,
    oi.base_price,
    o.id AS order_id,
    ((o.ordered_at AT TIME ZONE 'America/Sao_Paulo'::text))::date AS economic_day
   FROM (((public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
     LEFT JOIN public.offer_mappings om ON (((om.codigo_oferta = oi.provider_offer_id) AND (om.project_id = o.project_id))))
     LEFT JOIN public.funnels f ON ((f.id = COALESCE(om.funnel_id, oi.funnel_id))))
  WHERE ((o.status = ANY (ARRAY['approved'::text, 'completed'::text, 'APPROVED'::text, 'COMPLETE'::text])) AND (oi.provider_offer_id IS NOT NULL));


create or replace view "public"."funnel_orders_view" as  SELECT o.id AS order_id,
    o.provider_order_id AS transaction_id,
    o.project_id,
    oi.funnel_id,
    f.name AS funnel_name,
    o.customer_paid_brl AS customer_paid,
    o.producer_net_brl AS producer_net,
    o.currency,
    count(oi.id) AS order_items_count,
    max(oi.product_name) FILTER (WHERE (oi.item_type = 'main'::text)) AS main_product,
    max(oi.offer_code) FILTER (WHERE (oi.item_type = 'main'::text)) AS main_offer_code,
    bool_or((oi.item_type = 'bump'::text)) AS has_bump,
    bool_or((oi.item_type = 'upsell'::text)) AS has_upsell,
    bool_or((oi.item_type = 'downsell'::text)) AS has_downsell,
    o.buyer_email,
    o.buyer_name,
    o.status,
    o.created_at,
    o.ordered_at,
    date(o.ordered_at) AS economic_day,
    array_agg(oi.offer_code) AS all_offer_codes,
    sum(
        CASE
            WHEN (oi.item_type = 'main'::text) THEN oi.base_price
            ELSE (0)::numeric
        END) AS main_revenue,
    sum(
        CASE
            WHEN (oi.item_type = 'bump'::text) THEN oi.base_price
            ELSE (0)::numeric
        END) AS bump_revenue,
    sum(
        CASE
            WHEN (oi.item_type = 'upsell'::text) THEN oi.base_price
            ELSE (0)::numeric
        END) AS upsell_revenue
   FROM ((public.orders o
     LEFT JOIN public.order_items oi ON ((oi.order_id = o.id)))
     LEFT JOIN public.funnels f ON ((f.id = oi.funnel_id)))
  GROUP BY o.id, o.provider_order_id, o.project_id, oi.funnel_id, f.name, o.customer_paid_brl, o.producer_net_brl, o.currency, o.buyer_email, o.buyer_name, o.status, o.created_at, o.ordered_at;


create or replace view "public"."funnel_spend" as  SELECT s.project_id,
    f.id AS funnel_id,
    s.economic_day,
    sum(s.spend_amount) AS spend,
    count(*) AS record_count
   FROM ((public.spend_core_events s
     JOIN public.meta_campaigns mc ON (((mc.campaign_id = s.campaign_id) AND (mc.project_id = s.project_id))))
     JOIN public.funnels f ON (((f.project_id = s.project_id) AND (f.campaign_name_pattern IS NOT NULL) AND (mc.campaign_name ~~* (('%'::text || f.campaign_name_pattern) || '%'::text)))))
  WHERE (s.is_active = true)
  GROUP BY s.project_id, f.id, s.economic_day;


CREATE OR REPLACE FUNCTION public.generate_project_public_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INT;
BEGIN
  IF NEW.public_code IS NULL THEN
    LOOP
      new_code := 'cm_';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.projects WHERE public_code = new_code);
    END LOOP;
    NEW.public_code := new_code;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_contact_document(p_contact_id uuid, p_project_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_role project_role; v_encrypted_doc text; v_decrypted_doc text; v_plain_doc text;
BEGIN
  v_role := get_user_project_role(auth.uid(), p_project_id);
  IF is_super_admin(auth.uid()) THEN v_role := 'owner'; END IF;
  SELECT document_encrypted, document INTO v_encrypted_doc, v_plain_doc FROM public.crm_contacts WHERE id = p_contact_id AND project_id = p_project_id;
  IF v_role IN ('owner', 'manager') THEN
    IF v_encrypted_doc IS NOT NULL THEN
      v_decrypted_doc := public.decrypt_sensitive(v_encrypted_doc);
      IF v_decrypted_doc != '[DECRYPTION_FAILED]' THEN RETURN v_decrypted_doc; END IF;
    END IF;
    RETURN v_plain_doc;
  ELSE
    v_decrypted_doc := COALESCE(v_plain_doc, '');
    IF length(v_decrypted_doc) > 4 THEN RETURN '***' || right(v_decrypted_doc, 4); END IF;
    RETURN v_decrypted_doc;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_encryption_key(p_key_name text DEFAULT 'default'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_key text;
BEGIN
  SELECT key_value INTO v_key FROM public.encryption_keys WHERE key_name = p_key_name;
  RETURN v_key;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_available_agent(p_project_id uuid, p_department_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_agent_id uuid;
BEGIN
  SELECT wa.id INTO v_agent_id FROM whatsapp_agents wa
  LEFT JOIN whatsapp_agent_departments wad ON wa.id = wad.agent_id
  LEFT JOIN (SELECT assigned_to, COUNT(*) as active_count FROM whatsapp_conversations WHERE status = 'open' AND assigned_to IS NOT NULL GROUP BY assigned_to) conv_counts ON wa.id = conv_counts.assigned_to
  WHERE wa.project_id = p_project_id AND wa.is_active = true AND wa.status = 'online'
    AND COALESCE(conv_counts.active_count, 0) < wa.max_concurrent_chats
    AND (p_department_id IS NULL OR wad.department_id = p_department_id)
  ORDER BY CASE WHEN wad.is_primary THEN 0 ELSE 1 END, COALESCE(conv_counts.active_count, 0), wa.last_activity_at DESC NULLS LAST LIMIT 1;
  RETURN v_agent_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_project_credentials_secure(p_project_id uuid)
 RETURNS TABLE(id uuid, project_id uuid, provider text, client_id text, client_secret text, basic_auth text, is_configured boolean, is_validated boolean, validated_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_project_access(auth.uid(), p_project_id) AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to project credentials';
  END IF;
  IF get_user_project_role(auth.uid(), p_project_id) IN ('owner', 'manager') OR is_super_admin(auth.uid()) THEN
    RETURN QUERY SELECT pc.id, pc.project_id, pc.provider, pc.client_id,
      public.decrypt_sensitive(pc.client_secret_encrypted) as client_secret,
      public.decrypt_sensitive(pc.basic_auth_encrypted) as basic_auth,
      pc.is_configured, pc.is_validated, pc.validated_at, pc.created_at, pc.updated_at
    FROM public.project_credentials pc WHERE pc.project_id = p_project_id;
  ELSE
    RETURN QUERY SELECT pc.id, pc.project_id, pc.provider, pc.client_id,
      '********'::text as client_secret, '********'::text as basic_auth,
      pc.is_configured, pc.is_validated, pc.validated_at, pc.created_at, pc.updated_at
    FROM public.project_credentials pc WHERE pc.project_id = p_project_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_queue_position(p_project_id uuid, p_department_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MAX(queue_position), 0) + 1 FROM whatsapp_conversations
  WHERE project_id = p_project_id AND status = 'pending' AND (p_department_id IS NULL OR department_id = p_department_id);
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_project_role(_user_id uuid, _project_id uuid)
 RETURNS public.project_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.project_members WHERE user_id = _user_id AND project_id = _project_id
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _signup_source TEXT;
  _full_name TEXT;
BEGIN
  _signup_source := COALESCE(
    NEW.raw_user_meta_data->>'signup_source',
    'organic'
  );
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name, signup_source)
  VALUES (NEW.id, NEW.email, _full_name, _signup_source)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_accepted_terms(_user_id uuid, _version text DEFAULT '1.0'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.terms_acceptances WHERE user_id = _user_id AND terms_version = _version)
$function$
;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id AND s.status IN ('active', 'trial')
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (s.is_trial = false OR s.trial_ends_at IS NULL OR s.trial_ends_at > now())
  )
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$
;

CREATE OR REPLACE FUNCTION public.increment_lovable_credits(p_project_id uuid, p_count integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE ai_project_quotas SET lovable_credits_used = COALESCE(lovable_credits_used, 0) + p_count, updated_at = now() WHERE project_id = p_project_id;
  IF NOT FOUND THEN INSERT INTO ai_project_quotas (project_id, lovable_credits_used, lovable_credits_limit, provider_preference) VALUES (p_project_id, p_count, 1000, 'lovable'); END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$function$
;

create or replace view "public"."live_sales_today" as  SELECT fls.project_id,
    om.funnel_id,
    fls.economic_day,
    COALESCE(hs.total_price_brl, (0)::numeric) AS gross_amount,
    fls.net_revenue,
    fls.platform_cost AS platform_fee,
    fls.affiliate_cost,
    fls.coproducer_cost,
    fls.transaction_id,
    fls.hotmart_status AS status,
    fls.product_name,
    fls.offer_code,
    fls.buyer_email,
    fls.utm_source,
    fls.utm_medium,
    fls.utm_campaign,
    fls.utm_term,
    fls.utm_content,
    fls.raw_checkout_origin
   FROM ((public.finance_ledger_summary fls
     LEFT JOIN public.offer_mappings om ON (((fls.offer_code = om.codigo_oferta) AND (fls.project_id = om.project_id))))
     LEFT JOIN public.hotmart_sales hs ON (((fls.transaction_id = hs.transaction_id) AND (fls.project_id = hs.project_id))))
  WHERE ((fls.economic_day = CURRENT_DATE) AND (fls.hotmart_status = ANY (ARRAY['APPROVED'::text, 'COMPLETE'::text])));


create or replace view "public"."live_spend_today" as  SELECT mi.project_id,
    f.id AS funnel_id,
    f.name AS funnel_name,
    mi.date_start AS economic_day,
    sum(mi.spend) AS spend,
    count(*) AS record_count,
    'live'::text AS data_source,
    true AS is_estimated
   FROM ((public.meta_insights mi
     LEFT JOIN public.meta_campaigns mc ON (((mc.campaign_id = mi.campaign_id) AND (mc.project_id = mi.project_id))))
     LEFT JOIN public.funnels f ON (((f.project_id = mi.project_id) AND (f.campaign_name_pattern IS NOT NULL) AND (mc.campaign_name ~~* (('%'::text || f.campaign_name_pattern) || '%'::text)))))
  WHERE (mi.date_start = CURRENT_DATE)
  GROUP BY mi.project_id, f.id, f.name, mi.date_start;


CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_action text, p_entity_type text, p_entity_id text DEFAULT NULL::text, p_entity_name text DEFAULT NULL::text, p_project_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT '{}'::jsonb, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF auth.uid() <> p_user_id AND NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'not allowed'; END IF;
  INSERT INTO public.user_activity_logs (user_id, project_id, action, entity_type, entity_id, entity_name, details, user_agent)
  VALUES (p_user_id, p_project_id, p_action, p_entity_type, NULLIF(p_entity_id, '')::uuid, p_entity_name, COALESCE(p_details, '{}'), p_user_agent);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_phone_number(phone text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cleaned text;
BEGIN
  cleaned := regexp_replace(phone, '[^0-9]', '', 'g');
  IF cleaned LIKE '55%' AND length(cleaned) >= 12 THEN
    RETURN cleaned;
  END IF;
  IF length(cleaned) >= 10 AND length(cleaned) <= 11 THEN
    RETURN '55' || cleaned;
  END IF;
  RETURN cleaned;
END;
$function$
;

create or replace view "public"."orders_view_shadow" as  SELECT o.id,
    o.project_id,
    o.provider,
    o.provider_order_id,
    o.buyer_email,
    o.buyer_name,
    o.contact_id,
    o.status,
    o.currency,
    o.customer_paid,
    o.gross_base,
    o.producer_net,
    o.ordered_at,
    o.approved_at,
    o.completed_at,
    o.created_at,
    COALESCE(sum(
        CASE
            WHEN (le.event_type = 'platform_fee'::text) THEN le.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS platform_fee,
    COALESCE(sum(
        CASE
            WHEN (le.event_type = 'affiliate'::text) THEN le.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS affiliate_cost,
    COALESCE(sum(
        CASE
            WHEN (le.event_type = 'coproducer'::text) THEN le.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS coproducer_cost,
    COALESCE(sum(
        CASE
            WHEN (le.event_type = 'tax'::text) THEN le.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS tax_cost,
    COALESCE(sum(
        CASE
            WHEN (le.event_type = 'refund'::text) THEN le.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS refund_amount,
    COALESCE(sum(
        CASE
            WHEN (le.event_type = 'chargeback'::text) THEN le.amount
            ELSE (0)::numeric
        END), (0)::numeric) AS chargeback_amount,
    ( SELECT count(*) AS count
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)) AS item_count
   FROM (public.orders o
     LEFT JOIN public.ledger_events le ON ((le.order_id = o.id)))
  GROUP BY o.id;


create or replace view "public"."revenue_allocations" as  SELECT e.id AS event_id,
    e.project_id,
    e.economic_day,
    COALESCE((((e.raw_payload -> 'data'::text) -> 'product'::text) ->> 'id'::text), (e.raw_payload ->> 'product_id'::text)) AS product_id,
    COALESCE((((e.raw_payload -> 'data'::text) -> 'product'::text) ->> 'name'::text), (e.raw_payload ->> 'product_name'::text)) AS product_name,
    s.partner_type,
    s.partner_name,
    s.percentage,
    e.net_amount,
    round((e.net_amount * s.percentage), 2) AS allocated_amount,
    'core'::text AS data_source
   FROM (public.sales_core_events e
     JOIN public.product_revenue_splits s ON (((s.product_id = COALESCE((((e.raw_payload -> 'data'::text) -> 'product'::text) ->> 'id'::text), (e.raw_payload ->> 'product_id'::text))) AND (s.project_id = e.project_id) AND (s.is_active = true))))
  WHERE ((e.is_active = true) AND (e.event_type = ANY (ARRAY['purchase'::text, 'subscription'::text, 'upgrade'::text])));


create or replace view "public"."revenue_allocations_daily" as  SELECT project_id,
    economic_day,
    partner_type,
    partner_name,
    sum(allocated_amount) AS total_allocated,
    count(*) AS transaction_count,
    'core'::text AS data_source
   FROM public.revenue_allocations
  GROUP BY project_id, economic_day, partner_type, partner_name;


create or replace view "public"."sales_core_view" as  WITH ranked_events AS (
         SELECT sce.id,
            sce.project_id,
            sce.provider,
            sce.provider_event_id,
            sce.event_type,
            sce.gross_amount,
            sce.net_amount,
            sce.currency,
            sce.occurred_at,
            sce.received_at,
            sce.economic_day,
            sce.attribution,
            sce.contact_id,
            sce.raw_payload,
            sce.version,
            sce.is_active,
            sce.created_at,
            sce.platform_fee,
            sce.affiliate_cost,
            sce.coproducer_cost,
                CASE
                    WHEN (sce.provider = 'hotmart'::text) THEN (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'::text))[1]
                    ELSE sce.provider_event_id
                END AS transaction_id,
            hs.buyer_name,
            hs.buyer_email,
            hs.product_name,
            hs.product_code,
            hs.offer_code,
            hs.status AS hotmart_status,
            om.funnel_id,
            f.name AS funnel_name,
            hs.utm_source,
            hs.utm_campaign_id AS utm_campaign,
            hs.utm_adset_name AS utm_adset,
            hs.utm_placement,
            hs.utm_creative,
            row_number() OVER (PARTITION BY sce.project_id,
                CASE
                    WHEN (sce.provider = 'hotmart'::text) THEN (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'::text))[1]
                    ELSE sce.provider_event_id
                END ORDER BY
                CASE hs.status
                    WHEN 'COMPLETE'::text THEN 1
                    WHEN 'APPROVED'::text THEN 2
                    WHEN 'BACKFILL'::text THEN 3
                    ELSE 4
                END, sce.occurred_at DESC) AS rn
           FROM (((public.sales_core_events sce
             LEFT JOIN public.hotmart_sales hs ON (((hs.project_id = sce.project_id) AND (hs.transaction_id = (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'::text))[1]))))
             LEFT JOIN public.offer_mappings om ON (((om.project_id = sce.project_id) AND (om.codigo_oferta = hs.offer_code))))
             LEFT JOIN public.funnels f ON ((f.id = om.funnel_id)))
        )
 SELECT id,
    project_id,
    provider,
    provider_event_id,
    event_type,
    gross_amount,
    net_amount,
    currency,
    occurred_at,
    received_at,
    economic_day,
    contact_id,
    is_active,
    created_at,
    transaction_id,
    buyer_name,
    buyer_email,
    product_name,
    product_code,
    offer_code,
    hotmart_status,
    funnel_id,
    funnel_name,
    utm_source,
    utm_campaign,
    utm_adset,
    utm_placement,
    utm_creative
   FROM ranked_events
  WHERE (rn = 1);


CREATE OR REPLACE FUNCTION public.sync_hotmart_sale_to_crm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact_id uuid;
  v_existing_tags text[];
  v_new_tags text[];
  v_products_purchased text[];
  v_product_identifier text;
  v_contextual_tag text;
  v_generic_tag text;
  v_abandonment_tag text;
  v_pending_tag text;
  v_cancelled_tag text;
  v_existing_phone text;
  v_has_remaining_abandonments boolean;
BEGIN
  IF NEW.buyer_email IS NULL OR NEW.project_id IS NULL THEN RETURN NEW; END IF;
  SELECT id, tags, products_purchased, phone INTO v_contact_id, v_existing_tags, v_products_purchased, v_existing_phone
  FROM crm_contacts WHERE project_id = NEW.project_id AND LOWER(email) = LOWER(NEW.buyer_email);
  IF v_contact_id IS NULL THEN
    INSERT INTO crm_contacts (project_id, email, name, phone, phone_ddd, phone_country_code, document, instagram, address, address_number, address_complement, neighborhood, city, state, country, cep, source, status, first_utm_source, first_utm_campaign, first_utm_adset, first_utm_creative, first_utm_placement, first_meta_campaign_id, first_meta_adset_id, first_meta_ad_id)
    VALUES (NEW.project_id, NEW.buyer_email, NEW.buyer_name, NEW.buyer_phone, NEW.buyer_phone_ddd, NEW.buyer_phone_country_code, NEW.buyer_document, NEW.buyer_instagram, NEW.buyer_address, NEW.buyer_address_number, NEW.buyer_address_complement, NEW.buyer_neighborhood, NEW.buyer_city, NEW.buyer_state, NEW.buyer_country, NEW.buyer_cep, 'hotmart',
      CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'customer' ELSE 'lead' END,
      NEW.utm_source, NEW.utm_campaign_id, NEW.utm_adset_name, NEW.utm_creative, NEW.utm_placement, NEW.meta_campaign_id_extracted, NEW.meta_adset_id_extracted, NEW.meta_ad_id_extracted)
    RETURNING id, tags, products_purchased INTO v_contact_id, v_existing_tags, v_products_purchased;
  END IF;
  v_existing_tags := COALESCE(v_existing_tags, ARRAY[]::text[]);
  v_new_tags := v_existing_tags;
  v_products_purchased := COALESCE(v_products_purchased, ARRAY[]::text[]);
  v_product_identifier := COALESCE(NEW.product_name, 'Produto') || COALESCE('|' || NEW.offer_code, '');
  v_contextual_tag := CASE 
    WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'comprou:' || v_product_identifier
    WHEN NEW.status = 'ABANDONED' THEN 'abandonou:' || v_product_identifier
    WHEN NEW.status IN ('REFUNDED') THEN 'reembolsou:' || v_product_identifier
    WHEN NEW.status = 'CHARGEBACK' THEN 'chargeback:' || v_product_identifier
    WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'cancelou:' || v_product_identifier
    WHEN NEW.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE', 'EXPIRED') THEN 'pendente:' || v_product_identifier
    ELSE NULL END;
  v_generic_tag := CASE 
    WHEN NEW.status = 'ABANDONED' THEN 'Carrinho Abandonado'
    WHEN NEW.status IN ('REFUNDED') THEN 'Reembolsado'
    WHEN NEW.status = 'CHARGEBACK' THEN 'Chargeback'
    WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'Cancelado'
    WHEN NEW.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE') THEN 'Boleto Pendente'
    WHEN NEW.status = 'EXPIRED' THEN 'Expirado'
    ELSE NULL END;
  v_abandonment_tag := 'abandonou:' || v_product_identifier;
  v_pending_tag := 'pendente:' || v_product_identifier;
  v_cancelled_tag := 'cancelou:' || v_product_identifier;
  IF NEW.status IN ('APPROVED', 'COMPLETE') THEN
    IF v_abandonment_tag = ANY(v_existing_tags) AND NOT ('recuperou:' || v_product_identifier = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'recuperou:' || v_product_identifier);
    END IF;
    IF v_cancelled_tag = ANY(v_existing_tags) AND NOT ('recuperou:' || v_product_identifier = ANY(v_new_tags)) THEN
      v_new_tags := array_append(v_new_tags, 'recuperou:' || v_product_identifier);
    END IF;
    v_new_tags := array_remove(v_new_tags, v_abandonment_tag);
    v_new_tags := array_remove(v_new_tags, v_pending_tag);
    v_new_tags := array_remove(v_new_tags, v_cancelled_tag);
    IF NOT ('Cliente' = ANY(v_new_tags)) THEN v_new_tags := array_append(v_new_tags, 'Cliente'); END IF;
    v_has_remaining_abandonments := false;
    FOR i IN 1..COALESCE(array_length(v_new_tags, 1), 0) LOOP
      IF v_new_tags[i] LIKE 'abandonou:%' THEN v_has_remaining_abandonments := true; EXIT; END IF;
    END LOOP;
    IF NOT v_has_remaining_abandonments THEN v_new_tags := array_remove(v_new_tags, 'Carrinho Abandonado'); END IF;
  END IF;
  IF v_contextual_tag IS NOT NULL AND NOT (v_contextual_tag = ANY(v_new_tags)) THEN v_new_tags := array_append(v_new_tags, v_contextual_tag); END IF;
  IF v_generic_tag IS NOT NULL AND NOT (v_generic_tag = ANY(v_new_tags)) THEN v_new_tags := array_append(v_new_tags, v_generic_tag); END IF;
  IF NEW.status IN ('APPROVED', 'COMPLETE') AND NEW.product_name IS NOT NULL THEN
    IF NOT (NEW.product_name = ANY(v_products_purchased)) THEN v_products_purchased := array_append(v_products_purchased, NEW.product_name); END IF;
  END IF;
  UPDATE crm_contacts SET 
    status = CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'customer' ELSE status END,
    phone = CASE WHEN (phone IS NULL OR phone = '') AND NEW.buyer_phone IS NOT NULL AND NEW.buyer_phone != '' THEN NEW.buyer_phone ELSE phone END,
    phone_ddd = CASE WHEN (phone IS NULL OR phone = '') AND NEW.buyer_phone IS NOT NULL AND NEW.buyer_phone != '' THEN NEW.buyer_phone_ddd ELSE phone_ddd END,
    phone_country_code = CASE WHEN (phone IS NULL OR phone = '') AND NEW.buyer_phone IS NOT NULL AND NEW.buyer_phone != '' THEN COALESCE(NEW.buyer_phone_country_code, '55') ELSE phone_country_code END,
    name = CASE WHEN name IS NULL OR name = '' THEN NEW.buyer_name ELSE name END,
    tags = v_new_tags, last_product_name = NEW.product_name, last_product_code = NEW.product_code,
    last_offer_code = NEW.offer_code, last_transaction_status = NEW.status, products_purchased = v_products_purchased,
    has_pending_payment = NEW.status IN ('WAITING_PAYMENT', 'PENDING', 'OVERDUE'),
    subscription_status = CASE WHEN NEW.sold_as = 'subscription' THEN
      CASE WHEN NEW.status IN ('APPROVED', 'COMPLETE') THEN 'active' WHEN NEW.status IN ('CANCELLED', 'CANCELED') THEN 'cancelled'
           WHEN NEW.status = 'OVERDUE' THEN 'overdue' WHEN NEW.status IN ('REFUNDED', 'CHARGEBACK') THEN 'cancelled' ELSE subscription_status END
      ELSE subscription_status END,
    updated_at = now()
  WHERE id = v_contact_id;
  INSERT INTO crm_transactions (contact_id, project_id, external_id, platform, product_code, product_name, product_price, offer_code, offer_name, offer_price, total_price, total_price_brl, net_revenue, payment_method, payment_type, installment_number, coupon, status, transaction_date, confirmation_date, utm_source, utm_campaign, utm_adset, utm_creative, utm_placement, meta_campaign_id, meta_adset_id, meta_ad_id, affiliate_code, affiliate_name, funnel_id)
  VALUES (v_contact_id, NEW.project_id, NEW.transaction_id, 'hotmart', NEW.product_code, NEW.product_name, NEW.product_price, NEW.offer_code, NULL, NEW.offer_price, NEW.total_price, NEW.total_price_brl, NEW.net_revenue, NEW.payment_method, NEW.payment_type, NEW.installment_number, NEW.coupon, NEW.status, NEW.sale_date, NEW.confirmation_date, NEW.utm_source, NEW.utm_campaign_id, NEW.utm_adset_name, NEW.utm_creative, NEW.utm_placement, NEW.meta_campaign_id_extracted, NEW.meta_adset_id_extracted, NEW.meta_ad_id_extracted, NEW.affiliate_code, NEW.affiliate_name, NULL)
  ON CONFLICT (project_id, external_id, platform) DO UPDATE SET
    status = EXCLUDED.status, total_price = EXCLUDED.total_price, total_price_brl = EXCLUDED.total_price_brl,
    net_revenue = EXCLUDED.net_revenue, payment_method = EXCLUDED.payment_method, confirmation_date = EXCLUDED.confirmation_date, updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_project_max_members_from_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE plan_max_members integer;
BEGIN
  SELECT max_members INTO plan_max_members FROM public.plans WHERE id = NEW.plan_id;
  IF plan_max_members IS NOT NULL THEN UPDATE public.projects SET max_members = plan_max_members WHERE id = NEW.project_id; END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_last_login()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN UPDATE public.profiles SET last_login_at = now(), updated_at = now() WHERE id = auth.uid(); END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_product_revenue_splits_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_sales_history_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$
;

create or replace view "public"."crm_contact_journey_metrics_view" as  SELECT project_id,
    contact_id,
    contact_email,
    max(contact_name) AS contact_name,
    count(DISTINCT order_id) AS total_orders,
    sum(customer_paid) AS total_customer_paid,
    sum(producer_net) AS total_producer_net,
    sum(items_count) AS total_items,
    min(ordered_at) AS first_order_at,
    max(ordered_at) AS last_order_at,
        CASE
            WHEN (count(DISTINCT order_id) > 1) THEN true
            ELSE false
        END AS is_repeat_customer,
    ( SELECT jf.main_product_name
           FROM public.crm_journey_orders_view jf
          WHERE ((jf.contact_email = j.contact_email) AND (jf.project_id = j.project_id))
          ORDER BY jf.ordered_at
         LIMIT 1) AS first_product,
    ( SELECT jl.main_product_name
           FROM public.crm_journey_orders_view jl
          WHERE ((jl.contact_email = j.contact_email) AND (jl.project_id = j.project_id))
          ORDER BY jl.ordered_at DESC
         LIMIT 1) AS last_product,
    ( SELECT ju.utm_source
           FROM public.crm_journey_orders_view ju
          WHERE ((ju.contact_email = j.contact_email) AND (ju.project_id = j.project_id) AND (ju.utm_source IS NOT NULL))
          ORDER BY ju.ordered_at
         LIMIT 1) AS first_utm_source
   FROM public.crm_journey_orders_view j
  GROUP BY project_id, contact_id, contact_email;


create or replace view "public"."funnel_financials" as  SELECT COALESCE(r.project_id, s.project_id) AS project_id,
    COALESCE(r.funnel_id, s.funnel_id) AS funnel_id,
    COALESCE(r.economic_day, s.economic_day) AS economic_day,
    COALESCE(r.revenue, (0)::numeric) AS revenue,
    COALESCE(r.gross_revenue, (0)::numeric) AS gross_revenue,
    COALESCE(r.sales_count, (0)::bigint) AS sales_count,
    COALESCE(s.spend, (0)::numeric) AS spend,
    (COALESCE(r.revenue, (0)::numeric) - COALESCE(s.spend, (0)::numeric)) AS profit,
        CASE
            WHEN (COALESCE(s.spend, (0)::numeric) > (0)::numeric) THEN round((COALESCE(r.revenue, (0)::numeric) / s.spend), 2)
            ELSE NULL::numeric
        END AS roas,
        CASE
            WHEN (COALESCE(r.sales_count, (0)::bigint) > 0) THEN round((COALESCE(s.spend, (0)::numeric) / (r.sales_count)::numeric), 2)
            ELSE NULL::numeric
        END AS cpa
   FROM (public.funnel_revenue r
     FULL JOIN public.funnel_spend s ON (((r.project_id = s.project_id) AND (r.funnel_id = s.funnel_id) AND (r.economic_day = s.economic_day))));


create or replace view "public"."funnel_financials_summary" as  SELECT ff.project_id,
    ff.funnel_id,
    f.name AS funnel_name,
    f.funnel_type,
    f.roas_target,
    ps.financial_core_start_date,
    sum(ff.revenue) AS total_revenue,
    sum(ff.gross_revenue) AS total_gross_revenue,
    sum(ff.spend) AS total_spend,
    sum(ff.sales_count) AS total_sales,
    sum(ff.profit) AS total_profit,
        CASE
            WHEN (sum(ff.spend) > (0)::numeric) THEN round((sum(ff.revenue) / sum(ff.spend)), 2)
            ELSE NULL::numeric
        END AS overall_roas,
        CASE
            WHEN (sum(ff.sales_count) > (0)::numeric) THEN round((sum(ff.spend) / sum(ff.sales_count)), 2)
            ELSE NULL::numeric
        END AS overall_cpa,
        CASE
            WHEN (sum(ff.sales_count) > (0)::numeric) THEN round((sum(ff.revenue) / sum(ff.sales_count)), 2)
            ELSE NULL::numeric
        END AS avg_ticket,
        CASE
            WHEN ((sum(ff.spend) = (0)::numeric) OR (sum(ff.spend) IS NULL)) THEN 'inactive'::text
            WHEN ((sum(ff.revenue) = (0)::numeric) OR (sum(ff.revenue) IS NULL)) THEN 'no-return'::text
            WHEN ((f.roas_target IS NOT NULL) AND ((sum(ff.revenue) / NULLIF(sum(ff.spend), (0)::numeric)) >= (f.roas_target * 1.2))) THEN 'excellent'::text
            WHEN ((f.roas_target IS NOT NULL) AND ((sum(ff.revenue) / NULLIF(sum(ff.spend), (0)::numeric)) >= f.roas_target)) THEN 'good'::text
            WHEN ((f.roas_target IS NOT NULL) AND ((sum(ff.revenue) / NULLIF(sum(ff.spend), (0)::numeric)) >= (f.roas_target * 0.7))) THEN 'attention'::text
            WHEN ((sum(ff.revenue) / NULLIF(sum(ff.spend), (0)::numeric)) >= 2.0) THEN 'good'::text
            WHEN ((sum(ff.revenue) / NULLIF(sum(ff.spend), (0)::numeric)) >= 1.0) THEN 'attention'::text
            ELSE 'danger'::text
        END AS health_status,
    min(ff.economic_day) AS first_day,
    max(ff.economic_day) AS last_day,
    count(DISTINCT ff.economic_day) AS days_with_data
   FROM ((public.funnel_financials ff
     JOIN public.funnels f ON ((f.id = ff.funnel_id)))
     LEFT JOIN public.project_settings ps ON ((ps.project_id = ff.project_id)))
  WHERE (ff.economic_day >= COALESCE(ps.financial_core_start_date, '2026-01-12'::date))
  GROUP BY ff.project_id, ff.funnel_id, f.name, f.funnel_type, f.roas_target, ps.financial_core_start_date;


create or replace view "public"."live_financial_today" as  WITH live_spend AS (
         SELECT live_spend_today.project_id,
            live_spend_today.funnel_id,
            CURRENT_DATE AS economic_day,
            sum(live_spend_today.spend) AS spend
           FROM public.live_spend_today
          GROUP BY live_spend_today.project_id, live_spend_today.funnel_id
        ), live_revenue AS (
         SELECT live_sales_today.project_id,
            live_sales_today.funnel_id,
            live_sales_today.economic_day,
            sum(live_sales_today.gross_amount) AS gross_revenue,
            sum(live_sales_today.net_revenue) AS revenue,
            sum(live_sales_today.platform_fee) AS platform_fees,
            sum(live_sales_today.affiliate_cost) AS affiliate_fees,
            sum(live_sales_today.coproducer_cost) AS coproducer_fees,
            count(*) AS sales_count
           FROM public.live_sales_today
          GROUP BY live_sales_today.project_id, live_sales_today.funnel_id, live_sales_today.economic_day
        )
 SELECT COALESCE(r.project_id, s.project_id) AS project_id,
    COALESCE(r.funnel_id, s.funnel_id) AS funnel_id,
    COALESCE(r.economic_day, s.economic_day) AS economic_day,
    COALESCE(r.revenue, (0)::numeric) AS revenue,
    COALESCE(r.gross_revenue, (0)::numeric) AS gross_revenue,
    COALESCE(r.platform_fees, (0)::numeric) AS platform_fees,
    COALESCE(r.affiliate_fees, (0)::numeric) AS affiliate_fees,
    COALESCE(r.coproducer_fees, (0)::numeric) AS coproducer_fees,
    (COALESCE(r.sales_count, (0)::bigint))::integer AS sales_count,
    COALESCE(s.spend, (0)::numeric) AS spend,
    (COALESCE(r.revenue, (0)::numeric) - COALESCE(s.spend, (0)::numeric)) AS profit,
        CASE
            WHEN (COALESCE(s.spend, (0)::numeric) > (0)::numeric) THEN round((COALESCE(r.revenue, (0)::numeric) / s.spend), 2)
            ELSE NULL::numeric
        END AS roas,
        CASE
            WHEN (COALESCE(r.sales_count, (0)::bigint) > 0) THEN round((COALESCE(s.spend, (0)::numeric) / (r.sales_count)::numeric), 2)
            ELSE NULL::numeric
        END AS cpa,
    true AS is_estimated,
    'live'::text AS data_source,
    f.name AS funnel_name
   FROM ((live_revenue r
     FULL JOIN live_spend s ON (((r.project_id = s.project_id) AND (r.funnel_id = s.funnel_id))))
     LEFT JOIN public.funnels f ON ((COALESCE(r.funnel_id, s.funnel_id) = f.id)));


create or replace view "public"."live_project_totals_today" as  SELECT project_id,
    economic_day,
    sum(revenue) AS total_revenue,
    sum(gross_revenue) AS total_gross_revenue,
    sum(platform_fees) AS total_platform_fees,
    sum(affiliate_fees) AS total_affiliate_fees,
    sum(coproducer_fees) AS total_coproducer_fees,
    sum(sales_count) AS total_sales,
    sum(spend) AS total_spend,
    sum(profit) AS total_profit,
        CASE
            WHEN (sum(spend) > (0)::numeric) THEN round((sum(revenue) / sum(spend)), 2)
            ELSE NULL::numeric
        END AS roas,
        CASE
            WHEN (sum(sales_count) > 0) THEN round((sum(spend) / (sum(sales_count))::numeric), 2)
            ELSE NULL::numeric
        END AS cpa
   FROM public.live_financial_today
  GROUP BY project_id, economic_day;


create or replace view "public"."owner_profit_daily" as  SELECT p.project_id,
    p.economic_day,
    p.gross_revenue,
    p.platform_fees,
    p.affiliate_fees,
    p.coproducer_fees,
    p.net_revenue,
    COALESCE(a.owner_allocated, p.net_revenue) AS owner_revenue,
    p.ad_spend,
    (COALESCE(a.owner_allocated, p.net_revenue) - p.ad_spend) AS owner_profit,
        CASE
            WHEN (p.ad_spend > (0)::numeric) THEN round((COALESCE(a.owner_allocated, p.net_revenue) / p.ad_spend), 2)
            ELSE NULL::numeric
        END AS owner_roas,
    p.transaction_count,
    'core'::text AS data_source
   FROM (public.profit_daily p
     LEFT JOIN ( SELECT revenue_allocations.project_id,
            revenue_allocations.economic_day,
            sum(revenue_allocations.allocated_amount) AS owner_allocated
           FROM public.revenue_allocations
          WHERE (revenue_allocations.partner_type = 'owner'::text)
          GROUP BY revenue_allocations.project_id, revenue_allocations.economic_day) a ON (((a.project_id = p.project_id) AND (a.economic_day = p.economic_day))));


grant delete on table "public"."funnel_offers" to "anon";

grant insert on table "public"."funnel_offers" to "anon";

grant references on table "public"."funnel_offers" to "anon";

grant select on table "public"."funnel_offers" to "anon";

grant trigger on table "public"."funnel_offers" to "anon";

grant truncate on table "public"."funnel_offers" to "anon";

grant update on table "public"."funnel_offers" to "anon";

grant delete on table "public"."funnel_offers" to "authenticated";

grant insert on table "public"."funnel_offers" to "authenticated";

grant references on table "public"."funnel_offers" to "authenticated";

grant select on table "public"."funnel_offers" to "authenticated";

grant trigger on table "public"."funnel_offers" to "authenticated";

grant truncate on table "public"."funnel_offers" to "authenticated";

grant update on table "public"."funnel_offers" to "authenticated";

grant delete on table "public"."funnel_offers" to "service_role";

grant insert on table "public"."funnel_offers" to "service_role";

grant references on table "public"."funnel_offers" to "service_role";

grant select on table "public"."funnel_offers" to "service_role";

grant trigger on table "public"."funnel_offers" to "service_role";

grant truncate on table "public"."funnel_offers" to "service_role";

grant update on table "public"."funnel_offers" to "service_role";

grant delete on table "public"."funnel_score_history" to "anon";

grant insert on table "public"."funnel_score_history" to "anon";

grant references on table "public"."funnel_score_history" to "anon";

grant select on table "public"."funnel_score_history" to "anon";

grant trigger on table "public"."funnel_score_history" to "anon";

grant truncate on table "public"."funnel_score_history" to "anon";

grant update on table "public"."funnel_score_history" to "anon";

grant delete on table "public"."funnel_score_history" to "authenticated";

grant insert on table "public"."funnel_score_history" to "authenticated";

grant references on table "public"."funnel_score_history" to "authenticated";

grant select on table "public"."funnel_score_history" to "authenticated";

grant trigger on table "public"."funnel_score_history" to "authenticated";

grant truncate on table "public"."funnel_score_history" to "authenticated";

grant update on table "public"."funnel_score_history" to "authenticated";

grant delete on table "public"."funnel_score_history" to "service_role";

grant insert on table "public"."funnel_score_history" to "service_role";

grant references on table "public"."funnel_score_history" to "service_role";

grant select on table "public"."funnel_score_history" to "service_role";

grant trigger on table "public"."funnel_score_history" to "service_role";

grant truncate on table "public"."funnel_score_history" to "service_role";

grant update on table "public"."funnel_score_history" to "service_role";

grant delete on table "public"."integration_connections" to "anon";

grant insert on table "public"."integration_connections" to "anon";

grant references on table "public"."integration_connections" to "anon";

grant select on table "public"."integration_connections" to "anon";

grant trigger on table "public"."integration_connections" to "anon";

grant truncate on table "public"."integration_connections" to "anon";

grant update on table "public"."integration_connections" to "anon";

grant delete on table "public"."integration_connections" to "authenticated";

grant insert on table "public"."integration_connections" to "authenticated";

grant references on table "public"."integration_connections" to "authenticated";

grant select on table "public"."integration_connections" to "authenticated";

grant trigger on table "public"."integration_connections" to "authenticated";

grant truncate on table "public"."integration_connections" to "authenticated";

grant update on table "public"."integration_connections" to "authenticated";

grant delete on table "public"."integration_connections" to "service_role";

grant insert on table "public"."integration_connections" to "service_role";

grant references on table "public"."integration_connections" to "service_role";

grant select on table "public"."integration_connections" to "service_role";

grant trigger on table "public"."integration_connections" to "service_role";

grant truncate on table "public"."integration_connections" to "service_role";

grant update on table "public"."integration_connections" to "service_role";

grant delete on table "public"."integration_oauth_tokens" to "anon";

grant insert on table "public"."integration_oauth_tokens" to "anon";

grant references on table "public"."integration_oauth_tokens" to "anon";

grant select on table "public"."integration_oauth_tokens" to "anon";

grant trigger on table "public"."integration_oauth_tokens" to "anon";

grant truncate on table "public"."integration_oauth_tokens" to "anon";

grant update on table "public"."integration_oauth_tokens" to "anon";

grant delete on table "public"."integration_oauth_tokens" to "authenticated";

grant insert on table "public"."integration_oauth_tokens" to "authenticated";

grant references on table "public"."integration_oauth_tokens" to "authenticated";

grant select on table "public"."integration_oauth_tokens" to "authenticated";

grant trigger on table "public"."integration_oauth_tokens" to "authenticated";

grant truncate on table "public"."integration_oauth_tokens" to "authenticated";

grant update on table "public"."integration_oauth_tokens" to "authenticated";

grant delete on table "public"."integration_oauth_tokens" to "service_role";

grant insert on table "public"."integration_oauth_tokens" to "service_role";

grant references on table "public"."integration_oauth_tokens" to "service_role";

grant select on table "public"."integration_oauth_tokens" to "service_role";

grant trigger on table "public"."integration_oauth_tokens" to "service_role";

grant truncate on table "public"."integration_oauth_tokens" to "service_role";

grant update on table "public"."integration_oauth_tokens" to "service_role";

grant delete on table "public"."integration_providers" to "anon";

grant insert on table "public"."integration_providers" to "anon";

grant references on table "public"."integration_providers" to "anon";

grant select on table "public"."integration_providers" to "anon";

grant trigger on table "public"."integration_providers" to "anon";

grant truncate on table "public"."integration_providers" to "anon";

grant update on table "public"."integration_providers" to "anon";

grant delete on table "public"."integration_providers" to "authenticated";

grant insert on table "public"."integration_providers" to "authenticated";

grant references on table "public"."integration_providers" to "authenticated";

grant select on table "public"."integration_providers" to "authenticated";

grant trigger on table "public"."integration_providers" to "authenticated";

grant truncate on table "public"."integration_providers" to "authenticated";

grant update on table "public"."integration_providers" to "authenticated";

grant delete on table "public"."integration_providers" to "service_role";

grant insert on table "public"."integration_providers" to "service_role";

grant references on table "public"."integration_providers" to "service_role";

grant select on table "public"."integration_providers" to "service_role";

grant trigger on table "public"."integration_providers" to "service_role";

grant truncate on table "public"."integration_providers" to "service_role";

grant update on table "public"."integration_providers" to "service_role";

grant delete on table "public"."integration_sync_logs" to "anon";

grant insert on table "public"."integration_sync_logs" to "anon";

grant references on table "public"."integration_sync_logs" to "anon";

grant select on table "public"."integration_sync_logs" to "anon";

grant trigger on table "public"."integration_sync_logs" to "anon";

grant truncate on table "public"."integration_sync_logs" to "anon";

grant update on table "public"."integration_sync_logs" to "anon";

grant delete on table "public"."integration_sync_logs" to "authenticated";

grant insert on table "public"."integration_sync_logs" to "authenticated";

grant references on table "public"."integration_sync_logs" to "authenticated";

grant select on table "public"."integration_sync_logs" to "authenticated";

grant trigger on table "public"."integration_sync_logs" to "authenticated";

grant truncate on table "public"."integration_sync_logs" to "authenticated";

grant update on table "public"."integration_sync_logs" to "authenticated";

grant delete on table "public"."integration_sync_logs" to "service_role";

grant insert on table "public"."integration_sync_logs" to "service_role";

grant references on table "public"."integration_sync_logs" to "service_role";

grant select on table "public"."integration_sync_logs" to "service_role";

grant trigger on table "public"."integration_sync_logs" to "service_role";

grant truncate on table "public"."integration_sync_logs" to "service_role";

grant update on table "public"."integration_sync_logs" to "service_role";

grant delete on table "public"."meta_campaign_links" to "anon";

grant insert on table "public"."meta_campaign_links" to "anon";

grant references on table "public"."meta_campaign_links" to "anon";

grant select on table "public"."meta_campaign_links" to "anon";

grant trigger on table "public"."meta_campaign_links" to "anon";

grant truncate on table "public"."meta_campaign_links" to "anon";

grant update on table "public"."meta_campaign_links" to "anon";

grant delete on table "public"."meta_campaign_links" to "authenticated";

grant insert on table "public"."meta_campaign_links" to "authenticated";

grant references on table "public"."meta_campaign_links" to "authenticated";

grant select on table "public"."meta_campaign_links" to "authenticated";

grant trigger on table "public"."meta_campaign_links" to "authenticated";

grant truncate on table "public"."meta_campaign_links" to "authenticated";

grant update on table "public"."meta_campaign_links" to "authenticated";

grant delete on table "public"."meta_campaign_links" to "service_role";

grant insert on table "public"."meta_campaign_links" to "service_role";

grant references on table "public"."meta_campaign_links" to "service_role";

grant select on table "public"."meta_campaign_links" to "service_role";

grant trigger on table "public"."meta_campaign_links" to "service_role";

grant truncate on table "public"."meta_campaign_links" to "service_role";

grant update on table "public"."meta_campaign_links" to "service_role";

grant delete on table "public"."whatsapp_contact_notes" to "anon";

grant insert on table "public"."whatsapp_contact_notes" to "anon";

grant references on table "public"."whatsapp_contact_notes" to "anon";

grant select on table "public"."whatsapp_contact_notes" to "anon";

grant trigger on table "public"."whatsapp_contact_notes" to "anon";

grant truncate on table "public"."whatsapp_contact_notes" to "anon";

grant update on table "public"."whatsapp_contact_notes" to "anon";

grant delete on table "public"."whatsapp_contact_notes" to "authenticated";

grant insert on table "public"."whatsapp_contact_notes" to "authenticated";

grant references on table "public"."whatsapp_contact_notes" to "authenticated";

grant select on table "public"."whatsapp_contact_notes" to "authenticated";

grant trigger on table "public"."whatsapp_contact_notes" to "authenticated";

grant truncate on table "public"."whatsapp_contact_notes" to "authenticated";

grant update on table "public"."whatsapp_contact_notes" to "authenticated";

grant delete on table "public"."whatsapp_contact_notes" to "service_role";

grant insert on table "public"."whatsapp_contact_notes" to "service_role";

grant references on table "public"."whatsapp_contact_notes" to "service_role";

grant select on table "public"."whatsapp_contact_notes" to "service_role";

grant trigger on table "public"."whatsapp_contact_notes" to "service_role";

grant truncate on table "public"."whatsapp_contact_notes" to "service_role";

grant update on table "public"."whatsapp_contact_notes" to "service_role";

grant delete on table "public"."whatsapp_quick_replies" to "anon";

grant insert on table "public"."whatsapp_quick_replies" to "anon";

grant references on table "public"."whatsapp_quick_replies" to "anon";

grant select on table "public"."whatsapp_quick_replies" to "anon";

grant trigger on table "public"."whatsapp_quick_replies" to "anon";

grant truncate on table "public"."whatsapp_quick_replies" to "anon";

grant update on table "public"."whatsapp_quick_replies" to "anon";

grant delete on table "public"."whatsapp_quick_replies" to "authenticated";

grant insert on table "public"."whatsapp_quick_replies" to "authenticated";

grant references on table "public"."whatsapp_quick_replies" to "authenticated";

grant select on table "public"."whatsapp_quick_replies" to "authenticated";

grant trigger on table "public"."whatsapp_quick_replies" to "authenticated";

grant truncate on table "public"."whatsapp_quick_replies" to "authenticated";

grant update on table "public"."whatsapp_quick_replies" to "authenticated";

grant delete on table "public"."whatsapp_quick_replies" to "service_role";

grant insert on table "public"."whatsapp_quick_replies" to "service_role";

grant references on table "public"."whatsapp_quick_replies" to "service_role";

grant select on table "public"."whatsapp_quick_replies" to "service_role";

grant trigger on table "public"."whatsapp_quick_replies" to "service_role";

grant truncate on table "public"."whatsapp_quick_replies" to "service_role";

grant update on table "public"."whatsapp_quick_replies" to "service_role";


  create policy "aal_admin"
  on "public"."admin_audit_logs"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "ans_modify"
  on "public"."admin_notification_settings"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "ans_select"
  on "public"."admin_notification_settings"
  as permissive
  for select
  to public
using (public.is_super_admin(auth.uid()));



  create policy "decisions_admin"
  on "public"."agent_decisions_log"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "decisions_modify"
  on "public"."agent_decisions_log"
  as permissive
  for all
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "decisions_select"
  on "public"."agent_decisions_log"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "agents_admin"
  on "public"."ai_agents"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "agents_modify"
  on "public"."ai_agents"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "agents_select"
  on "public"."ai_agents"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "kb_admin"
  on "public"."ai_knowledge_base"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "kb_modify"
  on "public"."ai_knowledge_base"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "kb_select"
  on "public"."ai_knowledge_base"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "quotas_admin"
  on "public"."ai_project_quotas"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "quotas_modify"
  on "public"."ai_project_quotas"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "quotas_select"
  on "public"."ai_project_quotas"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "usage_admin"
  on "public"."ai_usage_tracking"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "usage_insert"
  on "public"."ai_usage_tracking"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "usage_select"
  on "public"."ai_usage_tracking"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "ae_modify"
  on "public"."automation_executions"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.automation_flows f
  WHERE ((f.id = automation_executions.flow_id) AND (public.get_user_project_role(auth.uid(), f.project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role]))))));



  create policy "ae_select"
  on "public"."automation_executions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.automation_flows f
  WHERE ((f.id = automation_executions.flow_id) AND public.has_project_access(auth.uid(), f.project_id)))));



  create policy "afe_modify"
  on "public"."automation_flow_edges"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.automation_flows f
  WHERE ((f.id = automation_flow_edges.flow_id) AND (public.get_user_project_role(auth.uid(), f.project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role]))))));



  create policy "afe_select"
  on "public"."automation_flow_edges"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.automation_flows f
  WHERE ((f.id = automation_flow_edges.flow_id) AND public.has_project_access(auth.uid(), f.project_id)))));



  create policy "afn_modify"
  on "public"."automation_flow_nodes"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.automation_flows f
  WHERE ((f.id = automation_flow_nodes.flow_id) AND (public.get_user_project_role(auth.uid(), f.project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role]))))));



  create policy "afn_select"
  on "public"."automation_flow_nodes"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.automation_flows f
  WHERE ((f.id = automation_flow_nodes.flow_id) AND public.has_project_access(auth.uid(), f.project_id)))));



  create policy "afl_admin"
  on "public"."automation_flows"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "afl_modify"
  on "public"."automation_flows"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "afl_select"
  on "public"."automation_flows"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "af_admin"
  on "public"."automation_folders"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "af_modify"
  on "public"."automation_folders"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "af_select"
  on "public"."automation_folders"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "am_admin"
  on "public"."automation_media"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "am_modify"
  on "public"."automation_media"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "am_select"
  on "public"."automation_media"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "amt_admin"
  on "public"."automation_message_templates"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "amt_modify"
  on "public"."automation_message_templates"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "amt_select"
  on "public"."automation_message_templates"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "metrics_admin"
  on "public"."comment_metrics_daily"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "metrics_select"
  on "public"."comment_metrics_daily"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "cie_admin"
  on "public"."contact_identity_events"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "cie_insert"
  on "public"."contact_identity_events"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "cie_select"
  on "public"."contact_identity_events"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "cm_admin"
  on "public"."contact_memory"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "cm_modify"
  on "public"."contact_memory"
  as permissive
  for all
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "cm_select"
  on "public"."contact_memory"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "pred_admin"
  on "public"."contact_predictions"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "pred_modify"
  on "public"."contact_predictions"
  as permissive
  for all
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "pred_select"
  on "public"."contact_predictions"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "cph_admin"
  on "public"."contact_profile_history"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "cph_select"
  on "public"."contact_profile_history"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "cp_admin"
  on "public"."contact_profiles"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "cp_modify"
  on "public"."contact_profiles"
  as permissive
  for all
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "cp_select"
  on "public"."contact_profiles"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "activities_admin"
  on "public"."crm_activities"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "activities_insert"
  on "public"."crm_activities"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "activities_select"
  on "public"."crm_activities"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "tasks_admin"
  on "public"."crm_activities_tasks"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "tasks_delete"
  on "public"."crm_activities_tasks"
  as permissive
  for delete
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "tasks_insert"
  on "public"."crm_activities_tasks"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "tasks_select"
  on "public"."crm_activities_tasks"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "tasks_update"
  on "public"."crm_activities_tasks"
  as permissive
  for update
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "steps_modify"
  on "public"."crm_cadence_steps"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.crm_cadences c
  WHERE ((c.id = crm_cadence_steps.cadence_id) AND (public.get_user_project_role(auth.uid(), c.project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role]))))));



  create policy "steps_select"
  on "public"."crm_cadence_steps"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.crm_cadences c
  WHERE ((c.id = crm_cadence_steps.cadence_id) AND public.has_project_access(auth.uid(), c.project_id)))));



  create policy "cadences_admin"
  on "public"."crm_cadences"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "cadences_modify"
  on "public"."crm_cadences"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "cadences_select"
  on "public"."crm_cadences"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "contact_cadences_modify"
  on "public"."crm_contact_cadences"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.crm_contacts c
  WHERE ((c.id = crm_contact_cadences.contact_id) AND public.has_project_access(auth.uid(), c.project_id)))));



  create policy "contact_cadences_select"
  on "public"."crm_contact_cadences"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.crm_contacts c
  WHERE ((c.id = crm_contact_cadences.contact_id) AND public.has_project_access(auth.uid(), c.project_id)))));



  create policy "interactions_admin"
  on "public"."crm_contact_interactions"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "interactions_insert"
  on "public"."crm_contact_interactions"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "interactions_select"
  on "public"."crm_contact_interactions"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "contacts_admin"
  on "public"."crm_contacts"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "contacts_delete"
  on "public"."crm_contacts"
  as permissive
  for delete
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "contacts_insert"
  on "public"."crm_contacts"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "contacts_select"
  on "public"."crm_contacts"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "contacts_update"
  on "public"."crm_contacts"
  as permissive
  for update
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "pipeline_admin"
  on "public"."crm_pipeline_stages"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "pipeline_modify"
  on "public"."crm_pipeline_stages"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "pipeline_select"
  on "public"."crm_pipeline_stages"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."crm_recovery_activities"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "recovery_admin"
  on "public"."crm_recovery_stages"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "recovery_modify"
  on "public"."crm_recovery_stages"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "recovery_select"
  on "public"."crm_recovery_stages"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "transactions_admin"
  on "public"."crm_transactions"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "transactions_insert"
  on "public"."crm_transactions"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "transactions_select"
  on "public"."crm_transactions"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "transactions_update"
  on "public"."crm_transactions"
  as permissive
  for update
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."economic_days"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "encryption_keys_admin"
  on "public"."encryption_keys"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "members_view"
  on "public"."experience_themes"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view_finance"
  on "public"."finance_ledger"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."funnel_score_history"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "funnels_delete"
  on "public"."funnels"
  as permissive
  for delete
  to public
using ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));



  create policy "funnels_delete_by_project"
  on "public"."funnels"
  as permissive
  for delete
  to public
using ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));



  create policy "funnels_insert"
  on "public"."funnels"
  as permissive
  for insert
  to public
with check ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));



  create policy "funnels_insert_by_project"
  on "public"."funnels"
  as permissive
  for insert
  to public
with check ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));



  create policy "funnels_select"
  on "public"."funnels"
  as permissive
  for select
  to public
using ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));



  create policy "funnels_select_by_project"
  on "public"."funnels"
  as permissive
  for select
  to public
using ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));



  create policy "funnels_update"
  on "public"."funnels"
  as permissive
  for update
  to public
using ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));



  create policy "funnels_update_by_project"
  on "public"."funnels"
  as permissive
  for update
  to public
using ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE (project_members.user_id = auth.uid()))));



  create policy "members_view_funnels"
  on "public"."funnels"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."hotmart_backfill_runs"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "Members can view product plans"
  on "public"."hotmart_product_plans"
  as permissive
  for select
  to public
using (true);



  create policy "Super admins can manage hotmart_product_plans"
  on "public"."hotmart_product_plans"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'super_admin'::public.app_role)))));



  create policy "System can manage product plans"
  on "public"."hotmart_product_plans"
  as permissive
  for all
  to public
using (true);



  create policy "hs_admin"
  on "public"."hotmart_sales"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "hs_insert"
  on "public"."hotmart_sales"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "hs_select"
  on "public"."hotmart_sales"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "Membros do projeto podem ver conexões"
  on "public"."integration_connections"
  as permissive
  for select
  to authenticated
using (public.has_project_access(auth.uid(), project_id));



  create policy "Owner/manager podem atualizar conexões"
  on "public"."integration_connections"
  as permissive
  for update
  to authenticated
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])))
with check ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "Owner/manager podem criar conexões"
  on "public"."integration_connections"
  as permissive
  for insert
  to authenticated
with check ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "Owner/manager podem deletar conexões"
  on "public"."integration_connections"
  as permissive
  for delete
  to authenticated
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "Membros do projeto podem ver tokens"
  on "public"."integration_oauth_tokens"
  as permissive
  for select
  to authenticated
using (public.has_project_access(auth.uid(), project_id));



  create policy "Owner/manager podem atualizar tokens"
  on "public"."integration_oauth_tokens"
  as permissive
  for update
  to authenticated
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])))
with check ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "Owner/manager podem criar tokens"
  on "public"."integration_oauth_tokens"
  as permissive
  for insert
  to authenticated
with check ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "Owner/manager podem deletar tokens"
  on "public"."integration_oauth_tokens"
  as permissive
  for delete
  to authenticated
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "Apenas super_admin pode gerenciar providers"
  on "public"."integration_providers"
  as permissive
  for all
  to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));



  create policy "Catálogo de providers é público para leitura"
  on "public"."integration_providers"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Membros do projeto podem ver sync logs"
  on "public"."integration_sync_logs"
  as permissive
  for select
  to authenticated
using (public.has_project_access(auth.uid(), project_id));



  create policy "Owner/manager podem atualizar sync logs"
  on "public"."integration_sync_logs"
  as permissive
  for update
  to authenticated
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])))
with check ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "Owner/manager podem criar sync logs"
  on "public"."integration_sync_logs"
  as permissive
  for insert
  to authenticated
with check ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "members_view"
  on "public"."launch_phases"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."launch_products"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "le_admin"
  on "public"."ledger_events"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "le_insert"
  on "public"."ledger_events"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "le_select"
  on "public"."ledger_events"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."ledger_import_batches"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."ledger_official"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view_meta_accounts"
  on "public"."meta_ad_accounts"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "meta_accounts_delete_project_members"
  on "public"."meta_ad_accounts"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = meta_ad_accounts.project_id) AND (pm.user_id = auth.uid())))));



  create policy "meta_accounts_insert_project_members"
  on "public"."meta_ad_accounts"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = meta_ad_accounts.project_id) AND (pm.user_id = auth.uid())))));



  create policy "meta_accounts_select_project_members"
  on "public"."meta_ad_accounts"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = meta_ad_accounts.project_id) AND (pm.user_id = auth.uid())))));



  create policy "meta_accounts_update_project_members"
  on "public"."meta_ad_accounts"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = meta_ad_accounts.project_id) AND (pm.user_id = auth.uid())))));



  create policy "members_view"
  on "public"."meta_ad_audiences"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view_meta_ads"
  on "public"."meta_ads"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view_meta_adsets"
  on "public"."meta_adsets"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."meta_audience_sync_logs"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view_meta_campaigns"
  on "public"."meta_campaigns"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view_meta_insights"
  on "public"."meta_insights"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "users_view_own_notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "members_view_offer_mappings"
  on "public"."offer_mappings"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "oi_admin"
  on "public"."order_items"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "oi_insert"
  on "public"."order_items"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "oi_select"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND public.has_project_access(auth.uid(), o.project_id)))));



  create policy "orders_admin"
  on "public"."orders"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "orders_insert"
  on "public"."orders"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "orders_select"
  on "public"."orders"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "orders_update"
  on "public"."orders"
  as permissive
  for update
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."personalization_contexts"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "anyone_read_plans"
  on "public"."plans"
  as permissive
  for select
  to public
using (true);



  create policy "plans_admin"
  on "public"."plans"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "plans_select_all"
  on "public"."plans"
  as permissive
  for select
  to public
using (true);



  create policy "prs_admin"
  on "public"."product_revenue_splits"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "prs_modify"
  on "public"."product_revenue_splits"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "prs_select"
  on "public"."product_revenue_splits"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "admins_read_all_profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using (public.is_super_admin(auth.uid()));



  create policy "profiles_admin_all"
  on "public"."profiles"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "profiles_select_by_project_member"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.user_id = pm.id) AND (pm.project_id IN ( SELECT project_members.project_id
           FROM public.project_members
          WHERE (project_members.user_id = auth.uid())))))));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "users_read_own_profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "users_update_own_profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "creds_admin"
  on "public"."project_credentials"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "creds_modify"
  on "public"."project_credentials"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "creds_select"
  on "public"."project_credentials"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "invites_admin_all"
  on "public"."project_invites"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "invites_delete_by_manager"
  on "public"."project_invites"
  as permissive
  for delete
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "invites_insert_by_manager"
  on "public"."project_invites"
  as permissive
  for insert
  to public
with check ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "invites_select_by_project_member"
  on "public"."project_invites"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = pm.project_id) AND (pm.user_id = auth.uid())))));



  create policy "invites_select_own_email"
  on "public"."project_invites"
  as permissive
  for select
  to public
using ((email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "invites_update_own"
  on "public"."project_invites"
  as permissive
  for update
  to public
using ((email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Members can view feature permissions"
  on "public"."project_member_feature_permissions"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.project_member_permissions pmp
  WHERE ((pmp.id = project_member_feature_permissions.member_id) AND (pmp.user_id = auth.uid())))) OR public.is_super_admin(auth.uid())));



  create policy "Owners can manage feature permissions"
  on "public"."project_member_feature_permissions"
  as permissive
  for all
  to public
using (((EXISTS ( SELECT 1
   FROM public.project_member_permissions pmp
  WHERE ((pmp.id = project_member_feature_permissions.member_id) AND (EXISTS ( SELECT 1
           FROM public.project_members pm
          WHERE ((pm.project_id = pmp.project_id) AND (pm.user_id = auth.uid()) AND (pm.role = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])))))))) OR public.is_super_admin(auth.uid())));



  create policy "Members can view permissions"
  on "public"."project_member_permissions"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR public.is_super_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = project_member_permissions.project_id) AND (pm.user_id = auth.uid()))))));



  create policy "Owners can manage permissions"
  on "public"."project_member_permissions"
  as permissive
  for all
  to public
using (((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])) OR public.is_super_admin(auth.uid())));



  create policy "permissions_admin_all"
  on "public"."project_member_permissions"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "permissions_insert_by_owner_manager"
  on "public"."project_member_permissions"
  as permissive
  for insert
  to public
with check ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "permissions_select_by_project_member"
  on "public"."project_member_permissions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = pm.project_id) AND (pm.user_id = auth.uid())))));



  create policy "permissions_update_by_owner_manager"
  on "public"."project_member_permissions"
  as permissive
  for update
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "pm_delete"
  on "public"."project_members"
  as permissive
  for delete
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_members.project_id) AND (p.user_id = auth.uid())))) OR (user_id = auth.uid())));



  create policy "pm_insert"
  on "public"."project_members"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "pm_select"
  on "public"."project_members"
  as permissive
  for select
  to authenticated
using (public.has_project_access(auth.uid(), project_id));



  create policy "pm_super_admin"
  on "public"."project_members"
  as permissive
  for all
  to authenticated
using (public.is_super_admin(auth.uid()));



  create policy "pm_update"
  on "public"."project_members"
  as permissive
  for update
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_members.project_id) AND (p.user_id = auth.uid())))) OR (user_id = auth.uid())));



  create policy "pm_delete"
  on "public"."project_modules"
  as permissive
  for delete
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_modules.project_id) AND (p.user_id = auth.uid())))) OR public.is_super_admin(auth.uid())));



  create policy "pm_insert"
  on "public"."project_modules"
  as permissive
  for insert
  to authenticated
with check (((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_modules.project_id) AND (p.user_id = auth.uid())))) OR public.is_super_admin(auth.uid())));



  create policy "pm_select"
  on "public"."project_modules"
  as permissive
  for select
  to authenticated
using ((public.has_project_access(auth.uid(), project_id) OR public.is_super_admin(auth.uid())));



  create policy "pm_update"
  on "public"."project_modules"
  as permissive
  for update
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_modules.project_id) AND (p.user_id = auth.uid())))) OR public.is_super_admin(auth.uid())));



  create policy "members_view_settings"
  on "public"."project_settings"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "Users can insert own projects"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can read own projects"
  on "public"."projects"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "owners_update_projects"
  on "public"."projects"
  as permissive
  for update
  to public
using (((user_id = auth.uid()) OR public.is_super_admin(auth.uid())));



  create policy "projects_admin_all"
  on "public"."projects"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "projects_delete_by_owner"
  on "public"."projects"
  as permissive
  for delete
  to public
using ((public.get_user_project_role(auth.uid(), id) = 'owner'::public.project_role));



  create policy "projects_insert_own"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "projects_select_by_member"
  on "public"."projects"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = pm.id) AND (pm.user_id = auth.uid())))));



  create policy "projects_update_by_owner"
  on "public"."projects"
  as permissive
  for update
  to public
using ((public.get_user_project_role(auth.uid(), id) = 'owner'::public.project_role));



  create policy "users_create_projects"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "users_read_projects"
  on "public"."projects"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR public.is_super_admin(auth.uid()) OR public.has_project_access(auth.uid(), id)));



  create policy "members_view"
  on "public"."quiz_events"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "Members can manage quiz conditions"
  on "public"."quiz_question_conditions"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.quiz_questions qq
     JOIN public.quizzes q ON ((q.id = qq.quiz_id)))
  WHERE ((qq.id = quiz_question_conditions.question_id) AND public.has_project_access(auth.uid(), q.project_id)))));



  create policy "members_view"
  on "public"."quiz_results"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."quiz_sessions"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."quizzes"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."sales_core_events"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "sho_admin"
  on "public"."sales_history_orders"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "sho_insert"
  on "public"."sales_history_orders"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "sho_select"
  on "public"."sales_history_orders"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "comments_admin"
  on "public"."social_comments"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "comments_insert"
  on "public"."social_comments"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "comments_select"
  on "public"."social_comments"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "comments_update"
  on "public"."social_comments"
  as permissive
  for update
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "sl_pages_admin"
  on "public"."social_listening_pages"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "sl_pages_modify"
  on "public"."social_listening_pages"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "sl_pages_select"
  on "public"."social_listening_pages"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "posts_admin"
  on "public"."social_posts"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "posts_insert"
  on "public"."social_posts"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "posts_select"
  on "public"."social_posts"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "posts_update"
  on "public"."social_posts"
  as permissive
  for update
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "members_view"
  on "public"."spend_core_events"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "subs_admin"
  on "public"."subscriptions"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "subs_select_own"
  on "public"."subscriptions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "users_read_own_subscription"
  on "public"."subscriptions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "ta_admin"
  on "public"."terms_acceptances"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "ta_insert_own"
  on "public"."terms_acceptances"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "ta_select_own"
  on "public"."terms_acceptances"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "ual_admin"
  on "public"."user_activity_logs"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "ual_insert_own"
  on "public"."user_activity_logs"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "ual_select_own"
  on "public"."user_activity_logs"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Admins can view all roles"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));



  create policy "Super admins can manage roles"
  on "public"."user_roles"
  as permissive
  for all
  to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));



  create policy "Users can view own role"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "admins_manage_roles"
  on "public"."user_roles"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "user_roles_admin_all"
  on "public"."user_roles"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "user_roles_select_own"
  on "public"."user_roles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "users_read_own_role"
  on "public"."user_roles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "wh_admin"
  on "public"."webhook_metrics"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "wh_insert"
  on "public"."webhook_metrics"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "wh_select"
  on "public"."webhook_metrics"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wad_modify"
  on "public"."whatsapp_agent_departments"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.whatsapp_agents a
  WHERE ((a.id = whatsapp_agent_departments.agent_id) AND (public.get_user_project_role(auth.uid(), a.project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role]))))));



  create policy "wad_select"
  on "public"."whatsapp_agent_departments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.whatsapp_agents a
  WHERE ((a.id = whatsapp_agent_departments.agent_id) AND public.has_project_access(auth.uid(), a.project_id)))));



  create policy "wa_admin"
  on "public"."whatsapp_agents"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "wa_modify"
  on "public"."whatsapp_agents"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "wa_select"
  on "public"."whatsapp_agents"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wa_self_update"
  on "public"."whatsapp_agents"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "wcn_admin"
  on "public"."whatsapp_contact_notes"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "wcn_modify"
  on "public"."whatsapp_contact_notes"
  as permissive
  for all
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wcn_select"
  on "public"."whatsapp_contact_notes"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wc_admin"
  on "public"."whatsapp_conversations"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "wc_insert"
  on "public"."whatsapp_conversations"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "wc_select"
  on "public"."whatsapp_conversations"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wc_update"
  on "public"."whatsapp_conversations"
  as permissive
  for update
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wd_admin"
  on "public"."whatsapp_departments"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "wd_modify"
  on "public"."whatsapp_departments"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "wd_select"
  on "public"."whatsapp_departments"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wm_admin"
  on "public"."whatsapp_messages"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "wm_insert"
  on "public"."whatsapp_messages"
  as permissive
  for insert
  to public
with check (public.has_project_access(auth.uid(), project_id));



  create policy "wm_select"
  on "public"."whatsapp_messages"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wm_update"
  on "public"."whatsapp_messages"
  as permissive
  for update
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wn_admin"
  on "public"."whatsapp_numbers"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "wn_modify"
  on "public"."whatsapp_numbers"
  as permissive
  for all
  to public
using ((public.get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::public.project_role, 'manager'::public.project_role])));



  create policy "wn_select"
  on "public"."whatsapp_numbers"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wqr_admin"
  on "public"."whatsapp_quick_replies"
  as permissive
  for all
  to public
using (public.is_super_admin(auth.uid()));



  create policy "wqr_modify"
  on "public"."whatsapp_quick_replies"
  as permissive
  for all
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "wqr_select"
  on "public"."whatsapp_quick_replies"
  as permissive
  for select
  to public
using (public.has_project_access(auth.uid(), project_id));



  create policy "Admins can update all profiles"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())))
with check ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));



  create policy "Admins can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));


CREATE TRIGGER update_agent_decisions_updated_at BEFORE UPDATE ON public.agent_decisions_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_kb_updated_at BEFORE UPDATE ON public.ai_knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_quotas_updated_at BEFORE UPDATE ON public.ai_project_quotas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_encrypt_contact_document BEFORE INSERT OR UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.encrypt_contact_document();

CREATE TRIGGER trg_extract_name_parts BEFORE INSERT OR UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.extract_name_parts();

CREATE TRIGGER update_integration_connections_updated_at BEFORE UPDATE ON public.integration_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_oauth_tokens_updated_at BEFORE UPDATE ON public.integration_oauth_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_providers_updated_at BEFORE UPDATE ON public.integration_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_revenue_splits_updated_at BEFORE UPDATE ON public.product_revenue_splits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_encrypt_project_credentials BEFORE INSERT OR UPDATE ON public.project_credentials FOR EACH ROW EXECUTE FUNCTION public.encrypt_project_credentials();

CREATE TRIGGER update_project_invites_updated_at BEFORE UPDATE ON public.project_invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_member_added_create_permissions AFTER INSERT ON public.project_members FOR EACH ROW EXECUTE FUNCTION public.create_member_permissions();

CREATE TRIGGER trg_generate_public_code BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.generate_project_public_code();

CREATE TRIGGER trg_handle_new_project AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

CREATE TRIGGER trg_sync_max_members AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_project_max_members_from_plan();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_agents_updated_at BEFORE UPDATE ON public.whatsapp_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_contact_notes_updated_at BEFORE UPDATE ON public.whatsapp_contact_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_departments_updated_at BEFORE UPDATE ON public.whatsapp_departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_normalize_wa_number BEFORE INSERT OR UPDATE ON public.whatsapp_numbers FOR EACH ROW EXECUTE FUNCTION public.normalize_whatsapp_number_trigger();

CREATE TRIGGER update_wa_numbers_updated_at BEFORE UPDATE ON public.whatsapp_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_quick_replies_updated_at BEFORE UPDATE ON public.whatsapp_quick_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

drop policy "Anyone can view automation media" on "storage"."objects";

drop policy "Authenticated users can delete whatsapp media" on "storage"."objects";

drop policy "Authenticated users can upload automation media" on "storage"."objects";

drop policy "Authenticated users can upload whatsapp media" on "storage"."objects";

drop policy "Public avatar access" on "storage"."objects";

drop policy "Public read access for whatsapp media" on "storage"."objects";

drop policy "Users can delete own avatar" on "storage"."objects";

drop policy "Users can delete their automation media" on "storage"."objects";

drop policy "Users can update own avatar" on "storage"."objects";

drop policy "Users can upload own avatar" on "storage"."objects";


