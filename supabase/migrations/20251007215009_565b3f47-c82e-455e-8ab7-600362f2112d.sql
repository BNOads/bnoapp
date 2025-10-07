-- Add new enum values for tipo_lancamento
DO $$
BEGIN
  -- Add 'tradicional'
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'tipo_lancamento' AND e.enumlabel = 'tradicional'
  ) THEN
    ALTER TYPE public.tipo_lancamento ADD VALUE 'tradicional';
  END IF;

  -- Add 'captacao_simples'
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'tipo_lancamento' AND e.enumlabel = 'captacao_simples'
  ) THEN
    ALTER TYPE public.tipo_lancamento ADD VALUE 'captacao_simples';
  END IF;
END $$;