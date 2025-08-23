-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configurar job cron para sincronização a cada 10 minutos
SELECT cron.schedule(
  'drive-sync-job',
  '*/10 * * * *', -- A cada 10 minutos
  $$
  SELECT
    net.http_post(
        url:='https://tbdooscfrrkwfutkdjha.supabase.co/functions/v1/drive-sync-job',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZG9vc2NmcnJrd2Z1dGtkamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NTQwODIsImV4cCI6MjA3MTUzMDA4Mn0.yd988Fotgc9LIZi83NlGDTaeB4f8BNgr9TYJgye0Cqw"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);