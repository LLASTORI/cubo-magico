-- Add unique constraints for upsert operations
ALTER TABLE public.meta_ad_accounts
ADD CONSTRAINT meta_ad_accounts_project_account_unique 
UNIQUE (project_id, account_id);

ALTER TABLE public.meta_campaigns
ADD CONSTRAINT meta_campaigns_project_campaign_unique 
UNIQUE (project_id, campaign_id);

ALTER TABLE public.meta_adsets
ADD CONSTRAINT meta_adsets_project_adset_unique 
UNIQUE (project_id, adset_id);

ALTER TABLE public.meta_insights
ADD CONSTRAINT meta_insights_unique_key 
UNIQUE (project_id, ad_account_id, campaign_id, adset_id, ad_id, date_start, date_stop);