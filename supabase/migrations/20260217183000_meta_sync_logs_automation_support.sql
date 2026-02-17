-- Enhance meta_sync_logs to support robust daily automation tracking.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'meta_sync_logs'
  ) THEN
    ALTER TABLE public.meta_sync_logs
      ADD COLUMN IF NOT EXISTS started_at timestamptz,
      ADD COLUMN IF NOT EXISTS completed_at timestamptz,
      ADD COLUMN IF NOT EXISTS trigger_source text,
      ADD COLUMN IF NOT EXISTS scope text,
      ADD COLUMN IF NOT EXISTS accounts_total integer,
      ADD COLUMN IF NOT EXISTS accounts_success integer,
      ADD COLUMN IF NOT EXISTS accounts_error integer,
      ADD COLUMN IF NOT EXISTS details jsonb,
      ADD COLUMN IF NOT EXISTS sync_type text,
      ADD COLUMN IF NOT EXISTS records_synced integer,
      ADD COLUMN IF NOT EXISTS duration_ms integer,
      ADD COLUMN IF NOT EXISTS error_message text;

    UPDATE public.meta_sync_logs
    SET started_at = created_at
    WHERE started_at IS NULL
      AND created_at IS NOT NULL;

    UPDATE public.meta_sync_logs
    SET completed_at = COALESCE(completed_at, created_at)
    WHERE completed_at IS NULL
      AND status IN ('success', 'completed', 'concluido', 'done', 'sucesso');

    UPDATE public.meta_sync_logs
    SET trigger_source = 'manual'
    WHERE trigger_source IS NULL
      OR btrim(trigger_source) = '';

    UPDATE public.meta_sync_logs
    SET scope = CASE
      WHEN ad_account_id IS NOT NULL THEN 'single_account'
      ELSE 'all_linked_accounts'
    END
    WHERE scope IS NULL
      OR btrim(scope) = '';

    UPDATE public.meta_sync_logs
    SET details = '[]'::jsonb
    WHERE details IS NULL;

    UPDATE public.meta_sync_logs
    SET accounts_total = CASE
      WHEN ad_account_id IS NOT NULL THEN 1
      ELSE COALESCE(accounts_total, 0)
    END
    WHERE accounts_total IS NULL;

    UPDATE public.meta_sync_logs
    SET accounts_success = CASE
      WHEN status IN ('success', 'completed', 'concluido', 'done', 'sucesso') THEN COALESCE(accounts_total, 0)
      ELSE COALESCE(accounts_success, 0)
    END
    WHERE accounts_success IS NULL;

    UPDATE public.meta_sync_logs
    SET accounts_error = CASE
      WHEN status IN ('error', 'failed', 'falha', 'erro') THEN COALESCE(accounts_total, 0)
      ELSE COALESCE(accounts_error, 0)
    END
    WHERE accounts_error IS NULL;

    UPDATE public.meta_sync_logs
    SET sync_type = 'meta_ads'
    WHERE sync_type IS NULL
      OR btrim(sync_type) = '';

    ALTER TABLE public.meta_sync_logs
      ALTER COLUMN trigger_source SET DEFAULT 'manual',
      ALTER COLUMN scope SET DEFAULT 'all_linked_accounts',
      ALTER COLUMN details SET DEFAULT '[]'::jsonb,
      ALTER COLUMN accounts_total SET DEFAULT 0,
      ALTER COLUMN accounts_success SET DEFAULT 0,
      ALTER COLUMN accounts_error SET DEFAULT 0,
      ALTER COLUMN sync_type SET DEFAULT 'meta_ads',
      ALTER COLUMN records_synced SET DEFAULT 0,
      ALTER COLUMN duration_ms SET DEFAULT 0;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'meta_sync_logs_scope_check'
        AND conrelid = 'public.meta_sync_logs'::regclass
    ) THEN
      ALTER TABLE public.meta_sync_logs
        ADD CONSTRAINT meta_sync_logs_scope_check
        CHECK (scope IN ('all_linked_accounts', 'client_scope', 'single_account'));
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'meta_sync_logs_status_check'
        AND conrelid = 'public.meta_sync_logs'::regclass
    ) THEN
      ALTER TABLE public.meta_sync_logs
        DROP CONSTRAINT meta_sync_logs_status_check;
    END IF;

    ALTER TABLE public.meta_sync_logs
      ADD CONSTRAINT meta_sync_logs_status_check
      CHECK (
        status IN (
          'running',
          'completed',
          'failed',
          'error',
          'partial',
          'processando',
          'em_andamento',
          'pending',
          'in_progress',
          'concluido',
          'sucesso',
          'success',
          'done',
          'falha',
          'erro'
        )
      );

    CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_started_at_desc
      ON public.meta_sync_logs (started_at DESC);

    CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_trigger_source_started_at_desc
      ON public.meta_sync_logs (trigger_source, started_at DESC);
  END IF;
END
$$;
