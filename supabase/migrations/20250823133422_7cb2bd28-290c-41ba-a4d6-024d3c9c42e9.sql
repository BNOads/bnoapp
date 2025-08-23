-- 4. Criar tabela de auditoria para acesso a dados sensíveis
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

ALTER TABLE public.auditoria_dados_sensíveis ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver auditoria
CREATE POLICY "Apenas admins podem ver auditoria" ON public.auditoria_dados_sensíveis
  FOR SELECT USING (
    public.is_admin_with_valid_reason(auth.uid())
  );

-- 5. Trigger para auditoria automática
CREATE OR REPLACE FUNCTION public.audit_sensitive_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auditoria_dados_sensíveis (
    user_id,
    colaborador_id,
    acao,
    campos_acessados,
    motivo
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.colaborador_id, OLD.colaborador_id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'criacao'
      WHEN TG_OP = 'UPDATE' THEN 'edicao'
      WHEN TG_OP = 'DELETE' THEN 'exclusao'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN ARRAY['todos_campos']
      WHEN TG_OP = 'UPDATE' THEN ARRAY['edicao_dados']
      WHEN TG_OP = 'DELETE' THEN ARRAY['exclusao_registro']
    END,
    'Acesso via sistema'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar trigger de auditoria
DROP TRIGGER IF EXISTS audit_colaboradores_dados_sensíveis ON public.colaboradores_dados_sensíveis;
CREATE TRIGGER audit_colaboradores_dados_sensíveis
  AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores_dados_sensíveis
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_data_access();

-- 6. Trigger para atualizar timestamps
CREATE TRIGGER update_colaboradores_dados_sensíveis_updated_at
  BEFORE UPDATE ON public.colaboradores_dados_sensíveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_dados_sensíveis_colaborador_id ON public.colaboradores_dados_sensíveis(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_dados_sensíveis_user_id ON public.permissoes_dados_sensíveis(user_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_dados_sensíveis_tipo ON public.permissoes_dados_sensíveis(tipo_acesso);
CREATE INDEX IF NOT EXISTS idx_auditoria_dados_sensíveis_user_id ON public.auditoria_dados_sensíveis(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_dados_sensíveis_created_at ON public.auditoria_dados_sensíveis(created_at);

-- 8. Inserir permissão padrão para admins existentes
INSERT INTO public.permissoes_dados_sensíveis (user_id, tipo_acesso, motivo, campos_permitidos)
SELECT 
  p.user_id,
  'administracao'::public.tipo_acesso_dados,
  'Acesso administrativo padrão',
  ARRAY['todos']
FROM public.profiles p 
WHERE p.nivel_acesso = 'admin' 
  AND p.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM public.permissoes_dados_sensíveis pds 
    WHERE pds.user_id = p.user_id
  );

-- 9. Criar função para visualização segura de dados sensíveis (com log)
CREATE OR REPLACE FUNCTION public.get_colaborador_dados_sensíveis(_colaborador_id uuid, _motivo text DEFAULT 'Consulta administrativa')
RETURNS TABLE (
  cpf text,
  rg text,
  endereco text,
  telefone_contato text,
  telefone_proximo text,
  cnpj text,
  razao_social text,
  conta_bancaria text,
  pix text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário tem permissão
  IF NOT (
    public.is_admin_with_valid_reason(auth.uid()) 
    AND public.has_sensitive_data_permission(auth.uid(), 'administracao'::public.tipo_acesso_dados)
  ) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para acessar dados sensíveis';
  END IF;

  -- Log da consulta
  INSERT INTO public.auditoria_dados_sensíveis (
    user_id,
    colaborador_id,
    acao,
    campos_acessados,
    motivo
  ) VALUES (
    auth.uid(),
    _colaborador_id,
    'visualizacao',
    ARRAY['cpf', 'rg', 'endereco', 'telefones', 'dados_bancarios'],
    _motivo
  );

  -- Retornar dados
  RETURN QUERY
  SELECT 
    cds.cpf,
    cds.rg,
    cds.endereco,
    cds.telefone_contato,
    cds.telefone_proximo,
    cds.cnpj,
    cds.razao_social,
    cds.conta_bancaria,
    cds.pix
  FROM public.colaboradores_dados_sensíveis cds
  WHERE cds.colaborador_id = _colaborador_id;
END;
$$;