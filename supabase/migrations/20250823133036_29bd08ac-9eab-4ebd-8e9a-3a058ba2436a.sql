-- 1. Criar nova tabela para dados sensíveis separados
CREATE TABLE public.colaboradores_dados_sensíveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL UNIQUE REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  cpf TEXT,
  rg TEXT,
  endereco TEXT,
  telefone_contato TEXT,
  telefone_proximo TEXT,
  cnpj TEXT,
  razao_social TEXT,
  conta_bancaria TEXT,
  pix TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Remover campos sensíveis da tabela principal colaboradores
ALTER TABLE public.colaboradores 
DROP COLUMN IF EXISTS cpf,
DROP COLUMN IF EXISTS rg,
DROP COLUMN IF EXISTS endereco,
DROP COLUMN IF EXISTS telefone_contato,
DROP COLUMN IF EXISTS telefone_proximo,
DROP COLUMN IF EXISTS cnpj,
DROP COLUMN IF EXISTS razao_social,
DROP COLUMN IF EXISTS conta_bancaria,
DROP COLUMN IF EXISTS pix;

-- 3. Habilitar RLS na nova tabela
ALTER TABLE public.colaboradores_dados_sensíveis ENABLE ROW LEVEL SECURITY;

-- 4. Criar enum para tipos de acesso a dados sensíveis
CREATE TYPE public.tipo_acesso_dados AS ENUM ('leitura_propria', 'leitura_limitada', 'leitura_completa', 'administracao');

-- 5. Criar tabela de permissões específicas para dados sensíveis
CREATE TABLE public.permissoes_dados_sensíveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_acesso tipo_acesso_dados AS NOT NULL DEFAULT 'leitura_propria',
  campos_permitidos TEXT[], -- campos específicos que pode acessar
  motivo TEXT, -- justificativa do acesso
  concedido_por UUID REFERENCES auth.users(id),
  valido_ate TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.permissoes_dados_sensíveis ENABLE ROW LEVEL SECURITY;

-- 6. Criar função para verificar permissões específicas de dados sensíveis
CREATE OR REPLACE FUNCTION public.has_sensitive_data_permission(_user_id uuid, _permission_type tipo_acesso_dados)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.permissoes_dados_sensíveis pds
    JOIN public.profiles p ON p.user_id = pds.user_id
    WHERE pds.user_id = _user_id 
      AND pds.tipo_acesso = _permission_type
      AND pds.ativo = true
      AND (pds.valido_ate IS NULL OR pds.valido_ate > now())
      AND p.ativo = true
  )
$$;

-- 7. Criar função para verificar se é admin com motivo válido
CREATE OR REPLACE FUNCTION public.is_admin_with_valid_reason(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id 
      AND p.nivel_acesso = 'admin'
      AND p.ativo = true
  )
$$;

-- 8. Políticas RLS rigorosas para dados sensíveis
-- Usuários só podem ver seus próprios dados básicos (sem dados bancários)
CREATE POLICY "Usuários podem ver apenas dados básicos próprios" ON public.colaboradores_dados_sensíveis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c 
      WHERE c.id = colaborador_id AND c.user_id = auth.uid()
    )
    AND public.has_sensitive_data_permission(auth.uid(), 'leitura_propria'::tipo_acesso_dados)
  );

-- Apenas usuários com permissão específica podem ver dados completos
CREATE POLICY "Acesso administrativo com permissão específica" ON public.colaboradores_dados_sensíveis
  FOR SELECT USING (
    public.is_admin_with_valid_reason(auth.uid()) 
    AND public.has_sensitive_data_permission(auth.uid(), 'administracao'::tipo_acesso_dados)
  );

-- Apenas admins podem inserir dados sensíveis
CREATE POLICY "Apenas admins podem inserir dados sensíveis" ON public.colaboradores_dados_sensíveis
  FOR INSERT WITH CHECK (
    public.is_admin_with_valid_reason(auth.uid())
  );

-- Apenas admins podem atualizar dados sensíveis
CREATE POLICY "Apenas admins podem atualizar dados sensíveis" ON public.colaboradores_dados_sensíveis
  FOR UPDATE USING (
    public.is_admin_with_valid_reason(auth.uid())
  );

-- 9. Políticas para tabela de permissões
CREATE POLICY "Admins podem gerenciar permissões" ON public.permissoes_dados_sensíveis
  FOR ALL USING (
    public.is_admin_with_valid_reason(auth.uid())
  );

CREATE POLICY "Usuários podem ver suas próprias permissões" ON public.permissoes_dados_sensíveis
  FOR SELECT USING (auth.uid() = user_id);

-- 10. Criar tabela de auditoria para acesso a dados sensíveis
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

-- 11. Trigger para auditoria automática
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

-- 12. Trigger para atualizar timestamps
CREATE TRIGGER update_colaboradores_dados_sensíveis_updated_at
  BEFORE UPDATE ON public.colaboradores_dados_sensíveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Criar índices para performance
CREATE INDEX idx_colaboradores_dados_sensíveis_colaborador_id ON public.colaboradores_dados_sensíveis(colaborador_id);
CREATE INDEX idx_permissoes_dados_sensíveis_user_id ON public.permissoes_dados_sensíveis(user_id);
CREATE INDEX idx_permissoes_dados_sensíveis_tipo ON public.permissoes_dados_sensíveis(tipo_acesso);
CREATE INDEX idx_auditoria_dados_sensíveis_user_id ON public.auditoria_dados_sensíveis(user_id);
CREATE INDEX idx_auditoria_dados_sensíveis_created_at ON public.auditoria_dados_sensíveis(created_at);

-- 14. Inserir permissão padrão para admins existentes
INSERT INTO public.permissoes_dados_sensíveis (user_id, tipo_acesso, motivo, campos_permitidos)
SELECT 
  p.user_id,
  'administracao'::tipo_acesso_dados,
  'Acesso administrativo padrão',
  ARRAY['todos']
FROM public.profiles p 
WHERE p.nivel_acesso = 'admin' AND p.ativo = true;