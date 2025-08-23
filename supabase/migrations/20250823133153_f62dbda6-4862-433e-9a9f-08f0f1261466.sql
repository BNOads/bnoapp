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