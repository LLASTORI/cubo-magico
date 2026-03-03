drop trigger if exists "trg_validate_offer_mapping_funnel_project" on "public"."offer_mappings";

alter table "public"."meta_insights" drop constraint "meta_insights_project_adacct_campaign_adset_ad_date_key";

drop function if exists "public"."delete_funnel_safe"(p_funnel_id uuid);

drop view if exists "public"."v_offer_mappings_funnel_project_inconsistencies";

drop function if exists "public"."validate_offer_mapping_funnel_project"();

drop index if exists "public"."meta_insights_project_adacct_campaign_adset_ad_date_key";



