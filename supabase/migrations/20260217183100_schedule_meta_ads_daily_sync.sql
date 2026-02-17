-- Schedule daily Meta Ads sync at 06:00 BRT (09:00 UTC).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  existing_job_id integer;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'meta-ads-daily-sync'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END
$$;

SELECT cron.schedule(
  'meta-ads-daily-sync',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://tbdooscfrrkwfutkdjha.supabase.co/functions/v1/meta-ads-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZG9vc2NmcnJrd2Z1dGtkamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQwODIsImV4cCI6MjA3MTUzMDA4Mn0.yd988Fotgc9LIZi83NlGDTaeB4f8BNgr9TYJgye0Cqw"}'::jsonb,
      body:='{"trigger_source":"automatic_daily"}'::jsonb
    ) AS request_id;
  $$
);
