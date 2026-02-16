DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'meta_client_ad_accounts'
  ) THEN
    -- Keep only the first association per ad_account_id (oldest created_at, then id)
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY ad_account_id
          ORDER BY created_at ASC NULLS LAST, id ASC
        ) AS rn
      FROM public.meta_client_ad_accounts
    )
    DELETE FROM public.meta_client_ad_accounts m
    USING ranked r
    WHERE m.id = r.id
      AND r.rn > 1;

    -- Enforce at most one client per ad account from now on
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'meta_client_ad_accounts_ad_account_unique'
        AND conrelid = 'public.meta_client_ad_accounts'::regclass
    ) THEN
      ALTER TABLE public.meta_client_ad_accounts
      ADD CONSTRAINT meta_client_ad_accounts_ad_account_unique
      UNIQUE (ad_account_id);
    END IF;
  END IF;
END
$$;
