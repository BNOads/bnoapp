-- Recreate FK constraints with proper ON DELETE behavior
DO $$
DECLARE
  rec record;
  v_constraint text;
BEGIN
  -- Iterate known referencing tables
  FOR rec IN
    SELECT * FROM (
      VALUES
        ('links_importantes'::text, 'cliente_id'::text, 'CASCADE'::text),
        ('orcamentos_funil',        'cliente_id',        'CASCADE'),
        ('creatives',               'client_id',         'CASCADE'),
        ('uploads_clientes',        'cliente_id',        'CASCADE'),
        ('debriefings',             'cliente_id',        'SET NULL'),
        ('referencias_criativos',   'cliente_id',        'SET NULL'),
        ('documentos',              'cliente_id',        'SET NULL'),
        ('reunioes_documentos',     'cliente_id',        'SET NULL')
    ) AS t(table_name, col_name, del_action)
  LOOP
    -- Ensure table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = rec.table_name
    ) THEN
      -- Find existing FK constraint that references public.clientes
      SELECT c.conname INTO v_constraint
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = 'public'
        AND rel.relname = rec.table_name
        AND c.contype = 'f'
        AND c.confrelid = 'public.clientes'::regclass;

      -- Drop it if found
      IF v_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', rec.table_name, v_constraint);
      END IF;

      -- Recreate FK with desired ON DELETE behavior
      EXECUTE format(
        'ALTER TABLE public.%I
         ADD CONSTRAINT %I FOREIGN KEY (%I)
         REFERENCES public.clientes(id)
         ON DELETE %s',
        rec.table_name,
        rec.table_name || '_' || rec.col_name || '_fkey',
        rec.col_name,
        rec.del_action
      );
    END IF;
  END LOOP;
END $$;