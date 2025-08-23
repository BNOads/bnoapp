-- 1. Políticas para tabela de permissões
CREATE POLICY "Admins podem gerenciar permissões" ON public.permissoes_dados_sensíveis
  FOR ALL USING (
    public.is_admin_with_valid_reason(auth.uid())
  );

CREATE POLICY "Usuários podem ver suas próprias permissões" ON public.permissoes_dados_sensíveis
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Criar tabela de auditoria para acesso a dados sensíveis
CREATE TABLE public.auditoria_dados_sensíveis (
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

-- 3. Trigger para auditoria automática
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
CREATE TRIGGER audit_colaboradores_dados_sensíveis
  AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores_dados_sensíveis
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_data_access();

-- 4. Trigger para atualizar timestamps
CREATE TRIGGER update_colaboradores_dados_sensíveis_updated_at
  BEFORE UPDATE ON public.colaboradores_dados_sensíveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Criar índices para performance
CREATE INDEX idx_colaboradores_dados_sensíveis_colaborador_id ON public.colaboradores_dados_sensíveis(colaborador_id);
CREATE INDEX idx_permissoes_dados_sensíveis_user_id ON public.permissoes_dados_sensíveis(user_id);
CREATE INDEX idx_permissoes_dados_sensíveis_tipo ON public.permissoes_dados_sensíveis(tipo_acesso);
CREATE INDEX idx_auditoria_dados_sensíveis_user_id ON public.auditoria_dados_sensíveis(user_id);
CREATE INDEX idx_auditoria_dados_sensíveis_created_at ON public.auditoria_dados_sensíveis(created_at);

-- 6. Inserir permissão padrão para admins existentes
INSERT INTO public.permissoes_dados_sensíveis (user_id, tipo_acesso, motivo, campos_permitidos)
SELECT 
  p.user_id,
  'administracao'::public.tipo_acesso_dados,
  'Acesso administrativo padrão',
  ARRAY['todos']
FROM public.profiles p 
WHERE p.nivel_acesso = 'admin' AND p.ativo = true;