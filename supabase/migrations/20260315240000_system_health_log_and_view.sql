-- Sistema de monitoramento: tabela de log + view de orders sem ledger + cron diário
--
-- system_health_log: registra alertas do cron de saúde do pipeline
-- v_orders_without_ledger: orders approved há >2h sem nenhum ledger_event
-- cron: orders-health-check-daily dispara todo dia às 08:00 UTC

-- Extensões necessárias (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Tabela de log de saúde do sistema
CREATE TABLE IF NOT EXISTS system_health_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type    text NOT NULL,          -- ex: 'orders_without_ledger'
  severity      text NOT NULL,          -- 'ok' | 'warning' | 'critical'
  affected_count int NOT NULL DEFAULT 0,
  details       jsonb,
  checked_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_log_check_type
  ON system_health_log (check_type, checked_at DESC);

-- View: orders approved há mais de 2h sem ledger_events
CREATE OR REPLACE VIEW v_orders_without_ledger AS
SELECT
  o.id                AS order_id,
  o.project_id,
  o.provider_order_id,
  o.status,
  o.customer_paid,
  o.currency,
  o.approved_at,
  o.ledger_status,
  EXTRACT(epoch FROM now() - o.approved_at) / 3600 AS hours_since_approval
FROM orders o
WHERE o.status = 'approved'
  AND o.approved_at < now() - interval '2 hours'
  AND NOT EXISTS (
    SELECT 1 FROM ledger_events le WHERE le.order_id = o.id
  );

-- Cron: dispara orders-health-check todo dia às 08:00 UTC
SELECT cron.schedule(
  'orders-health-check-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mqaygpnfjuyslnxpvipa.supabase.co/functions/v1/orders-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
