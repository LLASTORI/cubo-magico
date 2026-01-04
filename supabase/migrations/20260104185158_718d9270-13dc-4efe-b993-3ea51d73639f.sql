-- Functions to query canonical views with a higher statement_timeout (no recalculation)

CREATE OR REPLACE FUNCTION public.get_funnel_summary_by_id(p_funnel_id uuid)
RETURNS TABLE (
  project_id uuid,
  funnel_id text,
  funnel_name text,
  funnel_type text,
  roas_target numeric,
  first_sale_date date,
  last_sale_date date,
  total_investment numeric,
  total_gross_revenue numeric,
  total_confirmed_sales numeric,
  total_front_sales numeric,
  total_refunds numeric,
  total_chargebacks numeric,
  overall_roas numeric,
  overall_cpa numeric,
  overall_avg_ticket numeric,
  overall_refund_rate numeric,
  overall_chargeback_rate numeric,
  health_status text
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  -- Increase timeout only for this call
  PERFORM set_config('statement_timeout', '60000', true);

  RETURN QUERY
  SELECT
    fs.project_id,
    fs.funnel_id,
    fs.funnel_name,
    fs.funnel_type,
    fs.roas_target,
    fs.first_sale_date,
    fs.last_sale_date,
    fs.total_investment,
    fs.total_gross_revenue,
    fs.total_confirmed_sales,
    fs.total_front_sales,
    fs.total_refunds,
    fs.total_chargebacks,
    fs.overall_roas,
    fs.overall_cpa,
    fs.overall_avg_ticket,
    fs.overall_refund_rate,
    fs.overall_chargeback_rate,
    fs.health_status
  FROM public.funnel_summary fs
  WHERE fs.funnel_id = p_funnel_id::text
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_funnel_metrics_daily_range(
  p_funnel_id uuid,
  p_start date,
  p_end date
)
RETURNS TABLE (
  project_id uuid,
  funnel_id text,
  metric_date date,
  investment numeric,
  confirmed_sales bigint,
  front_sales bigint,
  refunds bigint,
  chargebacks bigint,
  unique_buyers bigint,
  gross_revenue numeric,
  net_revenue numeric,
  avg_ticket numeric,
  roas numeric,
  cpa_real numeric,
  refund_rate numeric,
  chargeback_rate numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('statement_timeout', '60000', true);

  RETURN QUERY
  SELECT
    fmd.project_id,
    fmd.funnel_id,
    fmd.metric_date,
    fmd.investment,
    fmd.confirmed_sales,
    fmd.front_sales,
    fmd.refunds,
    fmd.chargebacks,
    fmd.unique_buyers,
    fmd.gross_revenue,
    fmd.net_revenue,
    fmd.avg_ticket,
    fmd.roas,
    fmd.cpa_real,
    fmd.refund_rate,
    fmd.chargeback_rate
  FROM public.funnel_metrics_daily fmd
  WHERE fmd.funnel_id = p_funnel_id::text
    AND fmd.metric_date >= p_start
    AND fmd.metric_date <= p_end
  ORDER BY fmd.metric_date DESC
  LIMIT 60;
END;
$$;

-- Lock down execution (only backend service role)
REVOKE ALL ON FUNCTION public.get_funnel_summary_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_funnel_summary_by_id(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.get_funnel_metrics_daily_range(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_funnel_metrics_daily_range(uuid, date, date) TO service_role;
