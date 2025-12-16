-- Table for webhook processing metrics and rate limiting
CREATE TABLE IF NOT EXISTS public.webhook_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    webhook_type text NOT NULL,
    processed_at timestamp with time zone NOT NULL DEFAULT now(),
    processing_time_ms integer,
    success boolean NOT NULL DEFAULT true,
    error_message text,
    payload_size integer
);

-- Index for fast queries on recent metrics
CREATE INDEX IF NOT EXISTS idx_webhook_metrics_project_type ON webhook_metrics(project_id, webhook_type, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_metrics_processed_at ON webhook_metrics(processed_at);

-- RLS policies
ALTER TABLE webhook_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all webhook metrics" ON webhook_metrics;
CREATE POLICY "Super admins can view all webhook metrics"
ON webhook_metrics FOR SELECT
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Members can view project webhook metrics" ON webhook_metrics;
CREATE POLICY "Members can view project webhook metrics"
ON webhook_metrics FOR SELECT
USING (has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS "Service role can insert webhook metrics" ON webhook_metrics;
CREATE POLICY "Service role can insert webhook metrics"
ON webhook_metrics FOR INSERT
WITH CHECK (true);

-- Function to get next available agent for a department
CREATE OR REPLACE FUNCTION public.get_next_available_agent(
    p_project_id uuid,
    p_department_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agent_id uuid;
BEGIN
    SELECT wa.id INTO v_agent_id
    FROM whatsapp_agents wa
    LEFT JOIN whatsapp_agent_departments wad ON wa.id = wad.agent_id
    LEFT JOIN (
        SELECT assigned_to, COUNT(*) as active_count
        FROM whatsapp_conversations
        WHERE status = 'open' AND assigned_to IS NOT NULL
        GROUP BY assigned_to
    ) conv_counts ON wa.id = conv_counts.assigned_to
    WHERE wa.project_id = p_project_id
      AND wa.is_active = true
      AND wa.status = 'online'
      AND COALESCE(conv_counts.active_count, 0) < wa.max_concurrent_chats
      AND (p_department_id IS NULL OR wad.department_id = p_department_id)
    ORDER BY 
        CASE WHEN wad.is_primary THEN 0 ELSE 1 END,
        COALESCE(conv_counts.active_count, 0),
        wa.last_activity_at DESC NULLS LAST
    LIMIT 1;
    
    RETURN v_agent_id;
END;
$$;

-- Function to get queue position
CREATE OR REPLACE FUNCTION public.get_queue_position(p_project_id uuid, p_department_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(MAX(queue_position), 0) + 1
    FROM whatsapp_conversations
    WHERE project_id = p_project_id
      AND status = 'pending'
      AND (p_department_id IS NULL OR department_id = p_department_id);
$$;

-- Function to clean old webhook metrics
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM webhook_metrics WHERE processed_at < now() - interval '7 days';
END;
$$;

-- Function to get webhook stats
CREATE OR REPLACE FUNCTION public.get_webhook_stats(
    p_project_id uuid,
    p_hours integer DEFAULT 24
)
RETURNS TABLE (
    webhook_type text,
    total_count bigint,
    success_count bigint,
    error_count bigint,
    avg_processing_time_ms numeric,
    requests_per_minute numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wm.webhook_type,
        COUNT(*)::bigint as total_count,
        COUNT(*) FILTER (WHERE wm.success)::bigint as success_count,
        COUNT(*) FILTER (WHERE NOT wm.success)::bigint as error_count,
        ROUND(AVG(wm.processing_time_ms)::numeric, 2) as avg_processing_time_ms,
        ROUND((COUNT(*)::numeric / NULLIF(p_hours * 60, 0)), 2) as requests_per_minute
    FROM webhook_metrics wm
    WHERE wm.project_id = p_project_id
      AND wm.processed_at > now() - (p_hours || ' hours')::interval
    GROUP BY wm.webhook_type;
END;
$$;