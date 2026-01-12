-- Fix views to use SECURITY INVOKER (default, but explicit for clarity)
-- This ensures RLS policies on underlying tables are respected

ALTER VIEW public.sales_daily SET (security_invoker = true);
ALTER VIEW public.refunds_daily SET (security_invoker = true);
ALTER VIEW public.spend_daily SET (security_invoker = true);
ALTER VIEW public.financial_daily SET (security_invoker = true);
ALTER VIEW public.sales_monthly SET (security_invoker = true);
ALTER VIEW public.spend_monthly SET (security_invoker = true);
ALTER VIEW public.financial_monthly SET (security_invoker = true);