DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'meta_sync_logs'
  ) THEN
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
  END IF;
END
$$;
