-- Purge aduan H+7 — jadwal harian via pg_cron + pg_net
-- Prerequisite: pg_cron, pg_net, supabase_vault ON; vault secret `service_role_key`
-- Jalankan di Dashboard > SQL Editor (2026-08-23)

-- Hapus jadwal lama jika ada (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'purge-aduan-daily';
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- ~00:15 WIB (UTC+7) = 17:15 UTC
SELECT cron.schedule(
  'purge-aduan-daily',
  '15 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vcktcdofiyvdsexpvtjj.supabase.co/functions/v1/purge-aduan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
        LIMIT 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
