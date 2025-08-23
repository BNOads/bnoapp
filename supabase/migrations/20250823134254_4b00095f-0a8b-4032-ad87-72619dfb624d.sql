-- Habilitar RLS na tabela master_emails
ALTER TABLE public.master_emails ENABLE ROW LEVEL SECURITY;

-- Criar políticas apenas se não existirem
DO $$
BEGIN
  -- Política para SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'master_emails' 
    AND policyname = 'Apenas admins podem ver emails master'
  ) THEN
    EXECUTE 'CREATE POLICY "Apenas admins podem ver emails master" ON public.master_emails
      FOR SELECT USING (
        public.is_admin_with_valid_reason(auth.uid())
      )';
  END IF;

  -- Política para INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'master_emails' 
    AND policyname = 'Apenas admins podem inserir emails master'
  ) THEN
    EXECUTE 'CREATE POLICY "Apenas admins podem inserir emails master" ON public.master_emails
      FOR INSERT WITH CHECK (
        public.is_admin_with_valid_reason(auth.uid())
      )';
  END IF;
END $$;