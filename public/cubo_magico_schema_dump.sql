-- ============================================================================
-- CUBO MÁGICO - DUMP COMPLETO DO SCHEMA PUBLIC
-- Gerado em: 2026-02-07
-- Projeto: jcbzwxgayxrnxlgmmlni
-- Para migração direta em Supabase novo
-- ============================================================================

-- ============================================================================
-- PARTE 1: ENUMS
-- ============================================================================

CREATE TYPE public.agent_status AS ENUM ('online', 'away', 'offline', 'busy');
CREATE TYPE public.ai_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'skipped');
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'super_admin');
CREATE TYPE public.comment_classification AS ENUM ('question', 'commercial_interest', 'complaint', 'praise', 'negative_feedback', 'spam', 'other');
CREATE TYPE public.comment_sentiment AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE public.outcome_action_type AS ENUM ('add_tag', 'remove_tag', 'set_lifecycle_stage', 'trigger_automation', 'trigger_whatsapp_flow', 'trigger_email_sequence', 'fire_webhook', 'fire_pixel_event', 'redirect_url', 'dynamic_end_screen', 'update_custom_field');
CREATE TYPE public.override_target_type AS ENUM ('user', 'project');
CREATE TYPE public.permission_level AS ENUM ('none', 'view', 'edit', 'admin');
CREATE TYPE public.plan_type AS ENUM ('trial', 'monthly', 'yearly', 'lifetime');
CREATE TYPE public.project_role AS ENUM ('owner', 'manager', 'operator');
CREATE TYPE public.quiz_question_type AS ENUM ('single_choice', 'multiple_choice', 'scale', 'text', 'number');
CREATE TYPE public.quiz_session_status AS ENUM ('started', 'in_progress', 'completed', 'abandoned');
CREATE TYPE public.quiz_type AS ENUM ('lead', 'qualification', 'funnel', 'onboarding', 'entertainment', 'viral', 'research');
CREATE TYPE public.social_platform AS ENUM ('instagram', 'facebook');
CREATE TYPE public.social_post_type AS ENUM ('organic', 'ad');
CREATE TYPE public.subscription_origin AS ENUM ('hotmart', 'manual', 'stripe', 'other');
CREATE TYPE public.subscription_status AS ENUM ('active', 'trial', 'expired', 'cancelled', 'pending');

-- ============================================================================
-- PARTE 2: TABELAS CORE (TENANTS / AUTH / PERFIS)
-- ============================================================================

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  public_code character varying(10) NOT NULL,
  max_members integer NOT NULL DEFAULT 5
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  can_create_projects boolean DEFAULT false,
  max_projects integer DEFAULT 0,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  phone text,
  phone_ddd text,
  phone_country_code text DEFAULT '55'::text,
  whatsapp_opt_in boolean DEFAULT false,
  company_name text,
  company_role text,
  timezone text DEFAULT 'America/Sao_Paulo'::text,
  crm_contact_id uuid,
  onboarding_completed boolean DEFAULT false,
  signup_source text,
  account_activated boolean DEFAULT false
);

CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role project_role NOT NULL DEFAULT 'operator'::project_role,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  role_template_id uuid
);

CREATE TABLE public.project_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'hotmart'::text,
  client_id text,
  client_secret text,
  basic_auth text,
  is_configured boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_validated boolean DEFAULT false,
  validated_at timestamp with time zone,
  client_secret_encrypted text,
  basic_auth_encrypted text,
  hotmart_access_token text,
  hotmart_refresh_token text,
  hotmart_expires_at timestamp with time zone,
  hotmart_user_id text,
  hotmart_connected_at timestamp with time zone
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user'::app_role,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_notifications boolean DEFAULT true,
  sales_alerts boolean DEFAULT true,
  weekly_report boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 3: ORDERS CORE (PEDIDOS / LEDGER / PROVIDER)
-- ============================================================================

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  provider text NOT NULL,
  provider_order_id text NOT NULL,
  buyer_email text,
  buyer_name text,
  contact_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  currency text NOT NULL DEFAULT 'BRL'::text,
  customer_paid numeric DEFAULT 0,
  gross_base numeric DEFAULT 0,
  producer_net numeric DEFAULT 0,
  ordered_at timestamp with time zone,
  approved_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  raw_payload jsonb,
  utm_source text,
  utm_campaign text,
  utm_adset text,
  utm_placement text,
  utm_creative text,
  raw_sck text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  payment_method text,
  payment_type text,
  installments integer DEFAULT 1,
  producer_net_brl numeric(12,2),
  platform_fee_brl numeric,
  affiliate_brl numeric,
  coproducer_brl numeric,
  tax_brl numeric,
  ledger_status text DEFAULT 'pending'::text
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  provider_product_id text,
  provider_offer_id text,
  product_name text,
  offer_name text,
  item_type text NOT NULL DEFAULT 'main'::text,
  funnel_position text,
  base_price numeric DEFAULT 0,
  quantity integer DEFAULT 1,
  funnel_id uuid,
  offer_mapping_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE TABLE public.ledger_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  project_id uuid NOT NULL,
  provider text NOT NULL,
  event_type text NOT NULL,
  actor text,
  actor_name text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL'::text,
  provider_event_id text,
  occurred_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  raw_payload jsonb,
  amount_brl numeric,
  amount_accounting numeric,
  currency_accounting text,
  conversion_rate numeric,
  source_type text DEFAULT 'legacy'::text,
  source_origin text DEFAULT 'webhook'::text,
  confidence_level text DEFAULT 'real'::text,
  reference_period date
);

CREATE TABLE public.provider_event_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.provider_order_map (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  provider text NOT NULL,
  provider_transaction_id text NOT NULL,
  order_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 4: HOTMART SALES (LEGADO)
-- ============================================================================

CREATE TABLE public.hotmart_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  product_code text,
  producer_name text,
  producer_document text,
  affiliate_name text,
  affiliate_code text,
  transaction_id text NOT NULL,
  payment_method text,
  payment_type text,
  origin text,
  product_currency text,
  product_price numeric(10,2),
  offer_currency text,
  offer_price numeric(10,2),
  original_price numeric(10,2),
  total_price numeric(10,2),
  exchange_rate numeric(10,4),
  received_value numeric(10,2),
  net_revenue numeric(10,2),
  installment_number integer,
  recurrence integer,
  free_period text,
  offer_code text,
  coupon text,
  sale_date timestamp with time zone,
  confirmation_date timestamp with time zone,
  due_date timestamp with time zone,
  status text NOT NULL,
  buyer_name text,
  buyer_document text,
  buyer_email text,
  buyer_phone_ddd text,
  buyer_phone text,
  buyer_instagram text,
  buyer_cep text,
  buyer_city text,
  buyer_state text,
  buyer_neighborhood text,
  buyer_country text,
  buyer_address text,
  buyer_address_number text,
  buyer_address_complement text,
  checkout_origin text,
  utm_source text,
  utm_campaign_id text,
  utm_adset_name text,
  utm_placement text,
  utm_creative text,
  sale_origin text,
  has_coproduction boolean DEFAULT false,
  sold_as text,
  items_quantity integer DEFAULT 1,
  is_upgrade boolean DEFAULT false,
  subscriber_code text,
  invoice_number text,
  shipping_value numeric(10,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  project_id uuid NOT NULL,
  sale_attribution_type text DEFAULT 'unknown'::text,
  meta_campaign_id_extracted text,
  meta_adset_id_extracted text,
  meta_ad_id_extracted text,
  last_synced_at timestamp with time zone DEFAULT now(),
  total_price_brl numeric,
  exchange_rate_used numeric,
  sale_category text DEFAULT 'unidentified_origin'::text,
  buyer_phone_country_code text DEFAULT '55'::text,
  utm_medium text,
  platform_fee numeric DEFAULT 0,
  affiliate_cost numeric DEFAULT 0,
  coproducer_cost numeric DEFAULT 0,
  gross_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  utm_term text,
  utm_content text,
  raw_checkout_origin text
);

-- ============================================================================
-- PARTE 5: OFFER MAPPINGS / FUNNELS
-- ============================================================================

CREATE TABLE public.offer_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_produto text,
  nome_produto text NOT NULL,
  nome_oferta text,
  codigo_oferta text,
  valor numeric,
  status text,
  data_ativacao date,
  data_desativacao date,
  id_funil text NOT NULL,
  anotacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tipo_posicao text,
  ordem_posicao integer DEFAULT 1,
  nome_posicao text,
  id_produto_visual text,
  project_id uuid,
  funnel_id uuid,
  moeda text DEFAULT 'BRL'::text,
  valor_original numeric,
  provider text NOT NULL DEFAULT 'hotmart'::text,
  origem text DEFAULT 'manual'::text
);

CREATE TABLE public.funnels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  roas_target numeric DEFAULT 2.0,
  campaign_name_pattern text,
  funnel_type text NOT NULL DEFAULT 'perpetuo'::text,
  launch_start_date date,
  launch_end_date date,
  has_fixed_dates boolean DEFAULT true,
  launch_tag text
);

-- ============================================================================
-- PARTE 6: CRM
-- ============================================================================

CREATE TABLE public.crm_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  email text NOT NULL,
  name text,
  phone text,
  phone_ddd text,
  document text,
  instagram text,
  address text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  country text,
  cep text,
  source text NOT NULL DEFAULT 'manual'::text,
  status text NOT NULL DEFAULT 'lead'::text,
  first_utm_source text,
  first_utm_campaign text,
  first_utm_medium text,
  first_utm_content text,
  first_utm_term text,
  first_utm_adset text,
  first_utm_ad text,
  tags text[] DEFAULT '{}'::text[],
  custom_fields jsonb DEFAULT '{}'::jsonb,
  total_purchases integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  first_purchase_at timestamp with time zone,
  last_purchase_at timestamp with time zone,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  first_utm_creative text,
  first_utm_placement text,
  first_page_name text,
  pipeline_stage_id uuid,
  notes text,
  first_meta_campaign_id text,
  first_meta_adset_id text,
  first_meta_ad_id text,
  recovery_stage_id uuid,
  recovery_started_at timestamp with time zone,
  recovery_updated_at timestamp with time zone,
  phone_country_code text DEFAULT '55'::text,
  avatar_url text,
  document_encrypted text,
  last_product_name text,
  last_product_code text,
  last_offer_code text,
  last_offer_name text,
  products_purchased text[] DEFAULT '{}'::text[],
  subscription_status text,
  has_pending_payment boolean DEFAULT false,
  last_transaction_status text,
  first_name text,
  last_name text,
  user_id uuid,
  is_team_member boolean DEFAULT false
);

CREATE TABLE public.crm_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'hotmart'::text,
  external_id text,
  product_code text,
  product_name text NOT NULL,
  offer_code text,
  offer_name text,
  funnel_id text,
  product_price numeric,
  offer_price numeric,
  total_price numeric,
  total_price_brl numeric,
  net_revenue numeric,
  payment_method text,
  payment_type text,
  installment_number integer,
  coupon text,
  status text NOT NULL,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  utm_content text,
  utm_term text,
  utm_adset text,
  utm_ad text,
  utm_placement text,
  utm_creative text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  affiliate_code text,
  affiliate_name text,
  transaction_date timestamp with time zone,
  confirmation_date timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  activity_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  transaction_id uuid,
  performed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_activities_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  activity_type text NOT NULL DEFAULT 'task'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1'::text,
  position integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_recovery_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1'::text,
  position integer NOT NULL DEFAULT 0,
  is_initial boolean NOT NULL DEFAULT false,
  is_recovered boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_recovery_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  stage_id uuid,
  channel text NOT NULL DEFAULT 'manual'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.crm_contact_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  interaction_type text NOT NULL DEFAULT 'page_view'::text,
  page_name text,
  page_url text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  utm_content text,
  utm_term text,
  utm_adset text,
  utm_ad text,
  utm_creative text,
  utm_placement text,
  funnel_id uuid,
  launch_tag text,
  metadata jsonb DEFAULT '{}'::jsonb,
  interacted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  external_id text
);

CREATE TABLE public.crm_cadences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  trigger_on text NOT NULL DEFAULT 'stage_change'::text,
  trigger_stage_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_cadence_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cadence_id uuid NOT NULL,
  step_order integer NOT NULL DEFAULT 0,
  delay_days integer NOT NULL DEFAULT 0,
  delay_hours integer NOT NULL DEFAULT 0,
  activity_type text NOT NULL DEFAULT 'task'::text,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_contact_cadences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  cadence_id uuid NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  next_activity_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_webhook_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  api_key text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
  name text NOT NULL DEFAULT 'Default'::text,
  is_active boolean NOT NULL DEFAULT true,
  allowed_sources text[] DEFAULT '{}'::text[],
  default_tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  usage_count integer NOT NULL DEFAULT 0,
  field_mappings jsonb DEFAULT '{}'::jsonb,
  default_funnel_id uuid
);

-- ============================================================================
-- PARTE 7: FINANCE
-- ============================================================================

CREATE TABLE public.finance_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'hotmart'::text,
  transaction_id text NOT NULL,
  hotmart_sale_id text,
  event_type text NOT NULL,
  actor_type text,
  actor_id text,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'BRL'::text,
  occurred_at timestamp with time zone NOT NULL,
  recorded_at timestamp with time zone DEFAULT now(),
  source_api text,
  raw_payload jsonb,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.finance_sync_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  status text DEFAULT 'running'::text,
  events_created integer DEFAULT 0,
  events_skipped integer DEFAULT 0,
  errors integer DEFAULT 0,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  apis_synced text[],
  error_message text,
  created_by uuid
);

CREATE TABLE public.ledger_import_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  total_rows integer NOT NULL,
  imported_rows integer NOT NULL,
  skipped_rows integer DEFAULT 0,
  error_rows integer DEFAULT 0,
  reconciled_count integer DEFAULT 0,
  divergence_count integer DEFAULT 0,
  new_transactions_count integer DEFAULT 0,
  total_gross numeric(16,2) DEFAULT 0,
  total_net numeric(16,2) DEFAULT 0,
  total_platform_fees numeric(16,2) DEFAULT 0,
  total_affiliate_commissions numeric(16,2) DEFAULT 0,
  total_coproducer_commissions numeric(16,2) DEFAULT 0,
  total_taxes numeric(16,2) DEFAULT 0,
  period_start date,
  period_end date,
  status text DEFAULT 'completed'::text,
  error_message text,
  imported_by uuid,
  imported_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.ledger_official (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  transaction_id text NOT NULL,
  gross_value numeric(14,2) NOT NULL,
  product_price numeric(14,2),
  offer_price numeric(14,2),
  platform_fee numeric(14,2) DEFAULT 0,
  affiliate_commission numeric(14,2) DEFAULT 0,
  coproducer_commission numeric(14,2) DEFAULT 0,
  taxes numeric(14,2) DEFAULT 0,
  net_value numeric(14,2) NOT NULL,
  original_currency text DEFAULT 'BRL'::text,
  exchange_rate numeric(10,6) DEFAULT 1.0,
  net_value_brl numeric(14,2) NOT NULL,
  payout_id text,
  payout_date date,
  sale_date timestamp with time zone,
  confirmation_date timestamp with time zone,
  status text,
  payment_method text,
  payment_type text,
  installments integer,
  product_code text,
  product_name text,
  offer_code text,
  offer_name text,
  buyer_email text,
  buyer_name text,
  affiliate_code text,
  affiliate_name text,
  coproducer_name text,
  is_reconciled boolean DEFAULT false,
  reconciled_at timestamp with time zone,
  reconciled_by uuid,
  has_divergence boolean DEFAULT false,
  divergence_type text,
  divergence_webhook_value numeric(14,2),
  divergence_csv_value numeric(14,2),
  divergence_amount numeric(14,2),
  divergence_notes text,
  import_batch_id uuid,
  imported_at timestamp with time zone DEFAULT now(),
  imported_by uuid,
  source_file_name text,
  source_row_number integer,
  raw_csv_row jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.sales_core_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  gross_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL'::text,
  occurred_at timestamp with time zone NOT NULL,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  economic_day date NOT NULL,
  attribution jsonb DEFAULT '{}'::jsonb,
  contact_id uuid,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  platform_fee numeric DEFAULT 0,
  affiliate_cost numeric DEFAULT 0,
  coproducer_cost numeric DEFAULT 0
);

CREATE TABLE public.spend_core_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  spend_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL'::text,
  occurred_at timestamp with time zone NOT NULL,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  economic_day date NOT NULL,
  campaign_id text,
  adset_id text,
  ad_id text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.economic_days (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  date date NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo'::text,
  is_closed boolean NOT NULL DEFAULT false,
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.product_revenue_splits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  product_id text NOT NULL,
  product_name text,
  partner_type text NOT NULL,
  partner_name text,
  percentage numeric(5,4) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.project_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  financial_core_start_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 8: AI / AGENTS / PREDICTIONS
-- ============================================================================

CREATE TABLE public.ai_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  objective text NOT NULL,
  allowed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  boundaries jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_threshold numeric NOT NULL DEFAULT 0.7,
  is_active boolean NOT NULL DEFAULT false,
  trigger_on jsonb NOT NULL DEFAULT '["prediction_created", "recommendation_generated", "profile_shift", "high_risk_signal"]'::jsonb,
  max_actions_per_day integer DEFAULT 100,
  require_human_approval boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.agent_decisions_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  contact_id uuid,
  project_id uuid NOT NULL,
  prediction_id uuid,
  decision_type text NOT NULL,
  decision_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  risk_score numeric DEFAULT 0,
  reward_score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  executed_at timestamp with time zone,
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_reason text,
  outcome text,
  outcome_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  business_name text,
  business_description text,
  target_audience text,
  products_services text,
  tone_of_voice text DEFAULT 'profissional e amigável'::text,
  custom_categories jsonb DEFAULT '[{"key": "product_question", "label": "Dúvida de Produto", "description": "Perguntas sobre características, uso ou funcionamento do produto"}, {"key": "purchase_question", "label": "Dúvida de Compra/Preço", "description": "Perguntas sobre preço, formas de pagamento, frete"}, {"key": "praise", "label": "Elogio", "description": "Feedback positivo, agradecimentos"}, {"key": "complaint", "label": "Crítica/Reclamação", "description": "Insatisfação, problemas, reclamações"}, {"key": "contact_request", "label": "Pedido de Contato", "description": "Solicitação de contato direto, DM, WhatsApp"}, {"key": "friend_tag", "label": "Marcação de Amigo", "description": "Apenas marcando outras pessoas sem contexto comercial"}, {"key": "spam", "label": "Spam", "description": "Conteúdo irrelevante, propaganda, bots"}, {"key": "other", "label": "Outro", "description": "Não se encaixa em nenhuma categoria"}]'::jsonb,
  faqs jsonb DEFAULT '[]'::jsonb,
  commercial_keywords text[] DEFAULT ARRAY['preço'::text, 'valor'::text, 'quanto custa'::text, 'comprar'::text, 'quero'::text, 'onde compro'::text, 'link'::text, 'tem disponível'::text],
  spam_keywords text[] DEFAULT ARRAY['ganhe dinheiro'::text, 'clique aqui'::text, 'sorteio'::text, 'promoção fake'::text],
  auto_classify_new_comments boolean DEFAULT false,
  min_intent_score_for_crm integer DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  praise_keywords text[] DEFAULT ARRAY['parabéns'::text, 'excelente'::text, 'incrível'::text, 'maravilhoso'::text, 'amei'::text, 'adorei'::text, 'perfeito'::text, 'sensacional'::text]
);

CREATE TABLE public.ai_project_quotas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  daily_limit integer NOT NULL DEFAULT 100,
  monthly_limit integer NOT NULL DEFAULT 3000,
  current_daily_usage integer NOT NULL DEFAULT 0,
  current_monthly_usage integer NOT NULL DEFAULT 0,
  last_daily_reset timestamp with time zone NOT NULL DEFAULT now(),
  last_monthly_reset timestamp with time zone NOT NULL DEFAULT now(),
  is_unlimited boolean NOT NULL DEFAULT false,
  provider_preference text NOT NULL DEFAULT 'openai'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  lovable_credits_used integer DEFAULT 0,
  lovable_credits_limit integer DEFAULT 1000,
  openai_credits_used integer DEFAULT 0
);

CREATE TABLE public.ai_usage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  feature text NOT NULL,
  action text NOT NULL,
  provider text NOT NULL,
  model text,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  items_processed integer DEFAULT 1,
  cost_estimate numeric(10,6) DEFAULT 0,
  success boolean DEFAULT true,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  intent_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  trait_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(5,4) NOT NULL DEFAULT 0,
  volatility_score numeric(5,4) NOT NULL DEFAULT 0,
  entropy_score numeric(5,4) NOT NULL DEFAULT 0,
  total_signals integer NOT NULL DEFAULT 0,
  signal_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_profile_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_profile_id uuid NOT NULL,
  project_id uuid NOT NULL,
  source text NOT NULL,
  source_id uuid,
  source_name text,
  delta_intent_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_trait_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_delta numeric(5,4) NOT NULL DEFAULT 0,
  entropy_delta numeric(5,4) NOT NULL DEFAULT 0,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  prediction_type text NOT NULL,
  confidence numeric(5,4) NOT NULL DEFAULT 0.5,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level text NOT NULL DEFAULT 'medium'::text,
  urgency_score numeric(5,4) NOT NULL DEFAULT 0.5,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  memory_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(3,2) NOT NULL DEFAULT 0.5,
  source text NOT NULL,
  source_id uuid,
  source_name text,
  is_locked boolean NOT NULL DEFAULT false,
  is_contradicted boolean NOT NULL DEFAULT false,
  contradicted_by uuid,
  last_reinforced_at timestamp with time zone NOT NULL DEFAULT now(),
  reinforcement_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_identity_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  field_name text NOT NULL,
  field_value text NOT NULL,
  previous_value text,
  source_type text NOT NULL,
  source_id uuid,
  source_name text,
  confidence_score numeric DEFAULT 1.0,
  is_declared boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.recommendation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prediction_id uuid,
  contact_id uuid NOT NULL,
  project_id uuid NOT NULL,
  action_type text NOT NULL,
  action_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid,
  outcome text,
  outcome_data jsonb,
  outcome_recorded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.system_learnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  learning_type text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  evidence jsonb DEFAULT '[]'::jsonb,
  confidence numeric DEFAULT 0,
  impact_score numeric DEFAULT 0,
  affected_contacts_count integer DEFAULT 0,
  status text DEFAULT 'discovered'::text,
  validated_at timestamp with time zone,
  applied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 9: AUTOMAÇÕES
-- ============================================================================

CREATE TABLE public.automation_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  folder_id uuid,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  trigger_type text NOT NULL DEFAULT 'keyword'::text,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  viewport jsonb NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_flow_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL,
  node_type text NOT NULL,
  position_x double precision NOT NULL DEFAULT 0,
  position_y double precision NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_flow_edges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL,
  source_node_id uuid NOT NULL,
  target_node_id uuid NOT NULL,
  source_handle text,
  target_handle text,
  label text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  conversation_id uuid,
  status text NOT NULL DEFAULT 'running'::text,
  current_node_id uuid,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  error_message text,
  execution_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_execution_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  parent_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  public_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  content_type text NOT NULL DEFAULT 'text'::text,
  content text,
  media_url text,
  variables text[] NOT NULL DEFAULT '{}'::text[],
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 10: SOCIAL LISTENING
-- ============================================================================

CREATE TABLE public.social_listening_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  platform social_platform NOT NULL,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_access_token text,
  instagram_account_id text,
  instagram_username text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.social_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  platform social_platform NOT NULL,
  post_id_meta text NOT NULL,
  page_id text,
  page_name text,
  post_type social_post_type NOT NULL DEFAULT 'organic'::social_post_type,
  campaign_id text,
  adset_id text,
  ad_id text,
  message text,
  media_type text,
  media_url text,
  permalink text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_synced_at timestamp with time zone,
  caption text,
  is_ad boolean DEFAULT false,
  meta_campaign_id text,
  meta_ad_id text,
  campaign_name text,
  adset_name text,
  ad_name text,
  thumbnail_url text,
  ad_status text
);

CREATE TABLE public.social_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  post_id uuid NOT NULL,
  comment_id_meta text NOT NULL,
  parent_comment_id uuid,
  author_name text,
  author_id_meta text,
  author_profile_pic text,
  content text NOT NULL,
  like_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  sentiment comment_sentiment,
  classification comment_classification,
  intent_score integer,
  ai_summary text,
  ai_processing_status ai_processing_status DEFAULT 'pending'::ai_processing_status,
  ai_processed_at timestamp with time zone,
  ai_error text,
  is_hidden boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  is_replied boolean DEFAULT false,
  replied_at timestamp with time zone,
  replied_by uuid,
  comment_timestamp timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  crm_contact_id uuid,
  classification_key text,
  ai_suggested_reply text,
  reply_status text,
  reply_sent_at timestamp with time zone,
  manually_classified boolean DEFAULT false,
  is_own_account boolean DEFAULT false
);

CREATE TABLE public.social_listening_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  sync_type text NOT NULL,
  status text NOT NULL DEFAULT 'running'::text,
  posts_synced integer DEFAULT 0,
  comments_synced integer DEFAULT 0,
  comments_processed integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.comment_metrics_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  post_id uuid NOT NULL,
  metric_date date NOT NULL,
  total_comments integer DEFAULT 0,
  total_replies integer DEFAULT 0,
  new_comments integer DEFAULT 0,
  positive_count integer DEFAULT 0,
  neutral_count integer DEFAULT 0,
  negative_count integer DEFAULT 0,
  questions_count integer DEFAULT 0,
  commercial_interest_count integer DEFAULT 0,
  complaints_count integer DEFAULT 0,
  praise_count integer DEFAULT 0,
  avg_sentiment_score numeric(5,2),
  avg_intent_score numeric(5,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 11: META ADS
-- ============================================================================

CREATE TABLE public.meta_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  access_token text NOT NULL,
  token_type text DEFAULT 'Bearer'::text,
  expires_at timestamp with time zone,
  user_id text,
  user_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.meta_ad_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  account_id text NOT NULL,
  account_name text,
  currency text,
  timezone_name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.meta_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  ad_account_id text NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text,
  objective text,
  status text,
  daily_budget numeric,
  lifetime_budget numeric,
  created_time timestamp with time zone,
  start_time timestamp with time zone,
  stop_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.meta_adsets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  ad_account_id text NOT NULL,
  campaign_id text NOT NULL,
  adset_id text NOT NULL,
  adset_name text,
  status text,
  daily_budget numeric,
  lifetime_budget numeric,
  targeting jsonb,
  created_time timestamp with time zone,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.meta_ads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  ad_account_id text NOT NULL,
  campaign_id text NOT NULL,
  adset_id text NOT NULL,
  ad_id text NOT NULL,
  ad_name text,
  status text,
  creative_id text,
  created_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  preview_url text,
  thumbnail_url text
);

CREATE TABLE public.meta_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  ad_account_id text NOT NULL,
  campaign_id text,
  adset_id text,
  ad_id text,
  date_start date NOT NULL,
  date_stop date NOT NULL,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  reach integer DEFAULT 0,
  cpc numeric,
  cpm numeric,
  ctr numeric,
  frequency numeric,
  actions jsonb,
  cost_per_action_type jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.meta_ad_audiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  ad_account_id text NOT NULL,
  name text NOT NULL,
  meta_audience_id text,
  segment_type text NOT NULL DEFAULT 'tag'::text,
  segment_config jsonb NOT NULL DEFAULT '{"tags": [], "operator": "AND"}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  sync_frequency text NOT NULL DEFAULT 'manual'::text,
  estimated_size integer DEFAULT 0,
  error_message text,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.meta_audience_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  audience_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  email_hash text,
  phone_hash text,
  first_name_hash text,
  last_name_hash text,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  removed_at timestamp with time zone
);

CREATE TABLE public.meta_audience_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  audience_id uuid NOT NULL,
  contacts_added integer NOT NULL DEFAULT 0,
  contacts_removed integer NOT NULL DEFAULT 0,
  contacts_total integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'success'::text,
  duration_ms integer,
  executed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.meta_lookalike_audiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_audience_id uuid NOT NULL,
  meta_lookalike_id text,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'BR'::text,
  percentage integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.funnel_meta_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL,
  meta_account_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 12: QUIZZES / PESQUISAS
-- ============================================================================

CREATE TABLE public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  type quiz_type NOT NULL DEFAULT 'lead'::quiz_type,
  is_active boolean NOT NULL DEFAULT true,
  requires_identification boolean NOT NULL DEFAULT false,
  allow_anonymous boolean NOT NULL DEFAULT true,
  start_screen_config jsonb DEFAULT '{}'::jsonb,
  end_screen_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  flow_type text NOT NULL DEFAULT 'linear'::text,
  adaptive_config jsonb DEFAULT '{}'::jsonb,
  enable_pixel_events boolean NOT NULL DEFAULT true,
  pixel_event_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  slug text,
  theme_config jsonb DEFAULT '{"text_color": "#1e293b", "primary_color": "#6366f1", "show_progress": true, "background_color": "#f8fafc", "input_text_color": "#1e293b", "secondary_text_color": "#64748b", "one_question_per_page": true}'::jsonb,
  completion_config jsonb DEFAULT '{"cta_buttons": [], "enable_auto_redirect": false, "redirect_delay_seconds": 5}'::jsonb,
  theme_id uuid,
  template_id uuid,
  identity_settings jsonb NOT NULL DEFAULT '{"fields": {"name": {"enabled": true, "required": false}, "email": {"enabled": true, "required": true}, "phone": {"enabled": true, "required": false}, "instagram": {"enabled": false, "required": false}}, "primary_identity_field": "email"}'::jsonb
);

CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  type quiz_question_type NOT NULL DEFAULT 'single_choice'::quiz_question_type,
  title text NOT NULL,
  subtitle text,
  is_required boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_hidden boolean NOT NULL DEFAULT false,
  visibility_type text NOT NULL DEFAULT 'visible'::text,
  dynamic_weight_rules jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE public.quiz_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  weight double precision DEFAULT 0,
  traits_vector jsonb DEFAULT '{}'::jsonb,
  intent_vector jsonb DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  next_question_id uuid,
  next_block_id uuid,
  end_quiz boolean DEFAULT false
);

CREATE TABLE public.quiz_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  project_id uuid NOT NULL,
  contact_id uuid,
  status quiz_session_status NOT NULL DEFAULT 'started'::quiz_session_status,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  user_agent text,
  ip_hash text,
  utm_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  current_question_id uuid,
  visited_question_ids uuid[] DEFAULT '{}'::uuid[],
  skipped_question_ids uuid[] DEFAULT '{}'::uuid[],
  injected_question_ids uuid[] DEFAULT '{}'::uuid[],
  decision_path jsonb DEFAULT '[]'::jsonb,
  accumulated_vectors jsonb DEFAULT '{"traits": {}, "intents": {}}'::jsonb,
  flow_metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.quiz_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  question_id uuid NOT NULL,
  option_id uuid,
  answer_text text,
  answer_value numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  project_id uuid NOT NULL,
  traits_vector jsonb DEFAULT '{}'::jsonb,
  intent_vector jsonb DEFAULT '{}'::jsonb,
  raw_score jsonb DEFAULT '{}'::jsonb,
  normalized_score jsonb DEFAULT '{}'::jsonb,
  summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  questions_answered integer DEFAULT 0,
  questions_skipped integer DEFAULT 0,
  flow_type text DEFAULT 'linear'::text,
  decision_path jsonb DEFAULT '[]'::jsonb,
  confidence_score numeric,
  entropy_score numeric,
  semantic_profile_id uuid,
  semantic_interpretation jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.quiz_outcomes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  end_screen_override jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_outcome_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_session_id uuid NOT NULL,
  outcome_id uuid,
  project_id uuid NOT NULL,
  contact_id uuid,
  decision_trace jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions_executed jsonb NOT NULL DEFAULT '[]'::jsonb,
  evaluation_time_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_question_conditions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  condition_type text NOT NULL,
  condition_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  logical_operator text NOT NULL DEFAULT 'AND'::text,
  group_id uuid,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  session_id uuid NOT NULL,
  contact_id uuid,
  event_name text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.semantic_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  trait_ranges jsonb NOT NULL DEFAULT '{}'::jsonb,
  intent_ranges jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.experience_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  name text NOT NULL,
  description text,
  slug text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{"layout": "centered", "animation": "slide", "cta_style": "full_width", "image_position": "top", "progress_style": "bar", "navigation_style": "buttons"}'::jsonb,
  preview_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.experience_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{"text_color": "#1e293b", "primary_color": "#6366f1", "show_progress": true, "background_color": "#f8fafc", "input_text_color": "#1e293b", "secondary_text_color": "#64748b", "one_question_per_page": true}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- ============================================================================
-- PARTE 13: SURVEYS
-- ============================================================================

CREATE TABLE public.surveys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  objective text NOT NULL DEFAULT 'general'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  slug text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  default_tags text[] DEFAULT '{}'::text[],
  default_funnel_id uuid
);

CREATE TABLE public.survey_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  question_type text NOT NULL,
  question_text text NOT NULL,
  description text,
  is_required boolean DEFAULT false,
  options jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  identity_field_target text,
  identity_confidence_weight numeric DEFAULT 1.0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  project_id uuid NOT NULL,
  contact_id uuid,
  email text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'public_link'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_response_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL,
  project_id uuid NOT NULL,
  survey_id uuid NOT NULL,
  contact_id uuid,
  classification text,
  sentiment text,
  intent_score integer,
  ai_summary text,
  key_insights jsonb DEFAULT '[]'::jsonb,
  detected_keywords text[],
  processed_at timestamp with time zone,
  processed_by text,
  processing_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_insights_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  survey_id uuid,
  metric_date date NOT NULL,
  total_responses integer DEFAULT 0,
  unique_respondents integer DEFAULT 0,
  high_intent_count integer DEFAULT 0,
  pain_point_count integer DEFAULT 0,
  satisfaction_count integer DEFAULT 0,
  confusion_count integer DEFAULT 0,
  price_objection_count integer DEFAULT 0,
  feature_request_count integer DEFAULT 0,
  neutral_count integer DEFAULT 0,
  positive_count integer DEFAULT 0,
  neutral_sentiment_count integer DEFAULT 0,
  negative_count integer DEFAULT 0,
  avg_intent_score numeric(5,2),
  high_intent_percentage numeric(5,2),
  ai_daily_summary text,
  opportunities_identified integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_ai_knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  business_name text,
  business_description text,
  target_audience text,
  products_services text,
  high_intent_indicators text,
  pain_point_indicators text,
  satisfaction_indicators text,
  objection_patterns text,
  high_intent_keywords text[] DEFAULT '{}'::text[],
  pain_keywords text[] DEFAULT '{}'::text[],
  satisfaction_keywords text[] DEFAULT '{}'::text[],
  auto_classify_responses boolean DEFAULT false,
  min_intent_score_for_action integer DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_webhook_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  survey_id uuid NOT NULL,
  name text NOT NULL,
  api_key text NOT NULL DEFAULT (gen_random_uuid())::text,
  is_active boolean DEFAULT true,
  field_mappings jsonb DEFAULT '{}'::jsonb,
  default_tags text[] DEFAULT '{}'::text[],
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 14: WHATSAPP
-- ============================================================================

CREATE TABLE public.whatsapp_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  phone_number text NOT NULL,
  label text NOT NULL DEFAULT 'Principal'::text,
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  provider text NOT NULL DEFAULT 'evolution'::text,
  webhook_secret text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  whatsapp_number_id uuid NOT NULL,
  instance_name text NOT NULL,
  instance_key text,
  api_url text,
  status text NOT NULL DEFAULT 'disconnected'::text,
  qr_code text,
  qr_expires_at timestamp with time zone,
  last_heartbeat timestamp with time zone,
  error_count integer DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  whatsapp_number_id uuid,
  remote_jid text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  unread_count integer DEFAULT 0,
  last_message_at timestamp with time zone,
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  department_id uuid,
  queue_position integer,
  queued_at timestamp with time zone,
  first_response_at timestamp with time zone
);

CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  whatsapp_number_id uuid,
  direction text NOT NULL,
  content_type text NOT NULL DEFAULT 'text'::text,
  content text,
  media_url text,
  media_mime_type text,
  external_id text,
  status text NOT NULL DEFAULT 'pending'::text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  status agent_status NOT NULL DEFAULT 'offline'::agent_status,
  max_concurrent_chats integer NOT NULL DEFAULT 5,
  is_supervisor boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  work_hours jsonb DEFAULT '{"friday": {"end": "18:00", "start": "09:00"}, "monday": {"end": "18:00", "start": "09:00"}, "tuesday": {"end": "18:00", "start": "09:00"}, "thursday": {"end": "18:00", "start": "09:00"}, "wednesday": {"end": "18:00", "start": "09:00"}}'::jsonb,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  visibility_mode text DEFAULT 'all'::text
);

CREATE TABLE public.whatsapp_departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#6366f1'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_agent_departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  department_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- PARTE 15: MISC
-- ============================================================================

CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_name text NOT NULL,
  setting_description text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.encryption_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key_name text NOT NULL,
  key_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rotated_at timestamp with time zone
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info'::text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  webhook_type text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  processing_time_ms integer,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  payload_size integer
);

CREATE TABLE public.hotmart_backfill_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_sales_found integer DEFAULT 0,
  events_created integer DEFAULT 0,
  events_skipped integer DEFAULT 0,
  errors integer DEFAULT 0,
  executed_by uuid,
  status text NOT NULL DEFAULT 'running'::text,
  error_message text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.hotmart_product_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  offer_code text,
  plan_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  max_projects integer NOT NULL DEFAULT 1,
  price_cents integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  type plan_type NOT NULL DEFAULT 'monthly'::plan_type,
  max_users_per_project integer NOT NULL DEFAULT 5,
  trial_days integer DEFAULT 0,
  is_trial_available boolean DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  max_members integer NOT NULL DEFAULT 5
);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status subscription_status NOT NULL DEFAULT 'pending'::subscription_status,
  starts_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  is_trial boolean DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  origin subscription_origin NOT NULL DEFAULT 'manual'::subscription_origin,
  external_id text
);

CREATE TABLE public.features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_key text NOT NULL,
  feature_key text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.plan_features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  feature_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.feature_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_type override_target_type NOT NULL,
  target_id uuid NOT NULL,
  feature_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.project_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamp with time zone,
  enabled_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.project_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  role project_role NOT NULL DEFAULT 'operator'::project_role,
  status invite_status NOT NULL DEFAULT 'pending'::invite_status,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  permissions_dashboard permission_level DEFAULT 'none'::permission_level,
  permissions_analise permission_level DEFAULT 'none'::permission_level,
  permissions_crm permission_level DEFAULT 'none'::permission_level,
  permissions_automacoes permission_level DEFAULT 'none'::permission_level,
  permissions_chat_ao_vivo permission_level DEFAULT 'none'::permission_level,
  permissions_meta_ads permission_level DEFAULT 'none'::permission_level,
  permissions_ofertas permission_level DEFAULT 'none'::permission_level,
  permissions_lancamentos permission_level DEFAULT 'none'::permission_level,
  permissions_configuracoes permission_level DEFAULT 'none'::permission_level,
  permissions_insights permission_level DEFAULT 'none'::permission_level,
  permissions_pesquisas permission_level DEFAULT 'none'::permission_level,
  permissions_social_listening permission_level DEFAULT 'none'::permission_level,
  role_template_id uuid
);

CREATE TABLE public.project_member_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dashboard permission_level NOT NULL DEFAULT 'none'::permission_level,
  analise permission_level NOT NULL DEFAULT 'none'::permission_level,
  crm permission_level NOT NULL DEFAULT 'none'::permission_level,
  automacoes permission_level NOT NULL DEFAULT 'none'::permission_level,
  chat_ao_vivo permission_level NOT NULL DEFAULT 'none'::permission_level,
  meta_ads permission_level NOT NULL DEFAULT 'none'::permission_level,
  ofertas permission_level NOT NULL DEFAULT 'none'::permission_level,
  lancamentos permission_level NOT NULL DEFAULT 'none'::permission_level,
  configuracoes permission_level NOT NULL DEFAULT 'none'::permission_level,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  insights permission_level DEFAULT 'none'::permission_level,
  pesquisas permission_level DEFAULT 'none'::permission_level,
  social_listening permission_level DEFAULT 'none'::permission_level
);

CREATE TABLE public.project_member_feature_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  feature_id uuid NOT NULL,
  permission_level text NOT NULL DEFAULT 'none'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.role_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  name text NOT NULL,
  description text,
  base_role project_role DEFAULT 'operator'::project_role,
  is_system_default boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  icon text DEFAULT 'user'::text,
  perm_dashboard permission_level DEFAULT 'view'::permission_level,
  perm_analise permission_level DEFAULT 'none'::permission_level,
  perm_crm permission_level DEFAULT 'none'::permission_level,
  perm_automacoes permission_level DEFAULT 'none'::permission_level,
  perm_chat_ao_vivo permission_level DEFAULT 'none'::permission_level,
  perm_meta_ads permission_level DEFAULT 'none'::permission_level,
  perm_ofertas permission_level DEFAULT 'none'::permission_level,
  perm_lancamentos permission_level DEFAULT 'none'::permission_level,
  perm_configuracoes permission_level DEFAULT 'none'::permission_level,
  perm_insights permission_level DEFAULT 'none'::permission_level,
  perm_pesquisas permission_level DEFAULT 'none'::permission_level,
  perm_social_listening permission_level DEFAULT 'none'::permission_level,
  whatsapp_auto_create_agent boolean DEFAULT false,
  whatsapp_visibility_mode text DEFAULT 'assigned_only'::text,
  whatsapp_max_chats integer DEFAULT 5,
  whatsapp_is_supervisor boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.role_template_feature_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_template_id uuid NOT NULL,
  feature_id uuid NOT NULL,
  permission_level text NOT NULL DEFAULT 'none'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.project_tracking_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  meta_pixel_id text,
  gtag_id text,
  tiktok_pixel_id text,
  enable_browser_events boolean NOT NULL DEFAULT true,
  enable_server_events boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.event_dispatch_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  system_event text NOT NULL,
  provider text NOT NULL,
  provider_event_name text NOT NULL,
  payload_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.system_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  source text NOT NULL,
  event_name text NOT NULL,
  session_id uuid,
  contact_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_dispatch_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  triggered_events uuid[] DEFAULT '{}'::uuid[],
  parent_event_id uuid,
  priority integer DEFAULT 5
);

CREATE TABLE public.path_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  funnel_performance_id uuid,
  contact_id uuid,
  experiment_id uuid,
  path_signature jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant text DEFAULT 'control'::text,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  conversion_value numeric(12,2),
  time_in_path interval,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.personalization_contexts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  contact_id uuid,
  session_id text NOT NULL,
  channel text NOT NULL,
  current_intent text,
  dominant_trait text,
  memory_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  prediction_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  personalization_depth text NOT NULL DEFAULT 'standard'::text,
  excluded_memory_types text[] DEFAULT '{}'::text[],
  human_override jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '01:00:00'::interval),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.personalization_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  context_id uuid,
  contact_id uuid,
  session_id text,
  channel text NOT NULL,
  directives jsonb NOT NULL DEFAULT '{}'::jsonb,
  tokens_resolved jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_original text,
  content_personalized text,
  applied boolean NOT NULL DEFAULT false,
  outcome text,
  outcome_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.funnel_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_funil text NOT NULL,
  codigo_oferta text,
  tipo_alteracao text NOT NULL,
  descricao text NOT NULL,
  valor_anterior numeric,
  valor_novo numeric,
  data_alteracao date NOT NULL DEFAULT CURRENT_DATE,
  anotacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  project_id uuid
);

CREATE TABLE public.funnel_experiments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  funnel_performance_id uuid,
  suggestion_id uuid,
  name text NOT NULL,
  description text,
  control_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  traffic_split numeric(3,2) DEFAULT 0.5,
  min_sample_size integer DEFAULT 100,
  confidence_threshold numeric(5,4) DEFAULT 0.95,
  status text NOT NULL DEFAULT 'draft'::text,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  winner text,
  results jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.funnel_optimization_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  funnel_performance_id uuid,
  suggestion_type text NOT NULL,
  title text NOT NULL,
  description text,
  impact_estimate numeric(5,2),
  confidence numeric(5,4) DEFAULT 0,
  evidence jsonb DEFAULT '{}'::jsonb,
  recommended_action jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  applied_at timestamp with time zone,
  outcome jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.funnel_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  funnel_id uuid,
  path_signature jsonb NOT NULL DEFAULT '{}'::jsonb,
  path_type text NOT NULL DEFAULT 'quiz_outcome'::text,
  path_name text,
  conversion_rate numeric(5,4) DEFAULT 0,
  avg_time_to_convert interval,
  churn_rate numeric(5,4) DEFAULT 0,
  revenue_per_user numeric(12,2) DEFAULT 0,
  confidence numeric(5,4) DEFAULT 0,
  sample_size integer DEFAULT 0,
  total_entries integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  total_churns integer DEFAULT 0,
  performance_score numeric(5,2) DEFAULT 0,
  trend text DEFAULT 'stable'::text,
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.funnel_score_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  funnel_id uuid NOT NULL,
  score integer NOT NULL,
  positions_score integer,
  connect_rate_score integer,
  tx_pagina_checkout_score integer,
  tx_checkout_compra_score integer,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.funnel_thresholds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  threshold_key text NOT NULL,
  threshold_value numeric NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.launch_phases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL,
  project_id uuid NOT NULL,
  phase_type text NOT NULL,
  name text NOT NULL,
  start_date date,
  end_date date,
  primary_metric text NOT NULL DEFAULT 'spend'::text,
  is_active boolean DEFAULT true,
  phase_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  campaign_name_pattern text
);

CREATE TABLE public.launch_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL,
  offer_mapping_id uuid NOT NULL,
  project_id uuid NOT NULL,
  product_type text NOT NULL DEFAULT 'main'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  lot_name text
);

CREATE TABLE public.phase_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL,
  campaign_id text NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.metric_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  metric_name text NOT NULL,
  description text,
  formula text,
  unit text,
  category text NOT NULL DEFAULT 'general'::text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.terms_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT false,
  requires_reaccept boolean DEFAULT false,
  effective_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.terms_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  terms_version text NOT NULL DEFAULT '1.0'::text,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  acceptance_method text DEFAULT 'checkbox'::text,
  scrolled_to_end boolean DEFAULT false,
  time_spent_seconds integer
);

CREATE TABLE public.sales_history_import_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer DEFAULT 0,
  error_rows integer DEFAULT 0,
  status text DEFAULT 'processing'::text,
  error_message text,
  imported_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.sales_history_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  project_id uuid NOT NULL,
  provider_order_id text NOT NULL,
  order_id uuid,
  status text DEFAULT 'pending'::text,
  raw_row jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- PARTE 16: ARQUIVO CONTINUA NO ARQUIVO _part2.sql
-- Para gerar as PRIMARY KEYS, UNIQUE CONSTRAINTS, FOREIGN KEYS, 
-- INDEXES, FUNCTIONS, TRIGGERS, VIEWS e RLS POLICIES
-- execute o arquivo cubo_magico_schema_constraints.sql
-- ============================================================================

-- NOTA: Este dump contém todas as 120+ tabelas do schema public.
-- As PKs, FKs, índices, funções, triggers, views e políticas RLS
-- estão disponíveis nos resultados das queries realizadas.
-- Para o dump completo dessas partes, gere um segundo arquivo.
