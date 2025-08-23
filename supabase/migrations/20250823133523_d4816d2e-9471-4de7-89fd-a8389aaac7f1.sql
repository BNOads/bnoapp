-- Criar tabela de auditoria para acesso a dados sensíveis (se ainda não existe)
CREATE TABLE IF NOT EXISTS public.auditoria_dados_sensíveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  colaborador_id UUID REFERENCES public.colaboradores(id),
  acao TEXT NOT NULL, -- 'visualizacao', 'edicao', 'criacao'
  campos_acessados TEXT[],
  ip_address INET,
  user_agent TEXT,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS se ainda não estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'auditoria_dados_sensíveis' 
    AND relrowsecurity = true
  ) THEN
    ALTER TABLE public.auditoria_dados_sensíveis ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Criar política para auditoria se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auditoria_dados_sensíveis' 
    AND policyname = 'Apenas admins podem ver auditoria'
  ) THEN
    EXECUTE 'CREATE POLICY "Apenas admins podem ver auditoria" ON public.auditoria_dados_sensíveis
      FOR SELECT USING (
        public.is_admin_with_valid_reason(auth.uid())
      )';
  END IF;
END $$;

-- Verificar se já existe o trigger antes de criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'audit_colaboradores_dados_sensíveis'
  ) THEN
    CREATE TRIGGER audit_colaboradores_dados_sensíveis
      AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores_dados_sensíveis
      FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_data_access();
  END IF;
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_colaboradores_dados_sensíveis_colaborador_id 
  ON public.colaboradores_dados_sensíveis(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_dados_sensíveis_user_id 
  ON public.permissoes_dados_sensíveis(user_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_dados_sensíveis_tipo 
  ON public.permissoes_dados_sensíveis(tipo_acesso);
CREATE INDEX IF NOT EXISTS idx_auditoria_dados_sensíveis_user_id 
  ON public.auditoria_dados_sensíveis(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_dados_sensíveis_created_at 
  ON public.auditoria_dados_sensíveis(created_at);