-- Registra cron job para social-listening-cron
-- Executa a cada 30 minutos para sincronizar posts e comentários de todas as páginas ativas

SELECT cron.schedule(
  'social-listening-sync-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mqaygpnfjuyslnxpvipa.supabase.co/functions/v1/social-listening-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
