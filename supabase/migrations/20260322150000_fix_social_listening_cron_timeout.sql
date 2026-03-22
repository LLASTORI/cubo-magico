-- Fix: increase pg_net timeout for social-listening-cron from 5s to 120s
-- Root cause: pg_net default timeout is 5000ms; the edge function takes >5s to
-- process multiple projects (Meta API calls). pg_net was aborting the connection
-- and terminating the function before any sync work completed.
SELECT cron.alter_job(
  job_id := 4,
  command := $CMD$
  SELECT net.http_post(
    url := 'https://mqaygpnfjuyslnxpvipa.supabase.co/functions/v1/social-listening-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYXlncG5manV5c2xueHB2aXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzI5MTksImV4cCI6MjA4NjYwODkxOX0.t8XJ-yXo5LnjbLqsKEc63OeSZYM8ZcN0BbNF3RTSVQw'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $CMD$
);
