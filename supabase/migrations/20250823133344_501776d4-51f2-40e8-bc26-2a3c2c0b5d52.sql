-- 1. Remover campos sensíveis da tabela principal colaboradores (se ainda existem)
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

-- 2. Políticas RLS rigorosas para dados sensíveis
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Usuários podem ver apenas dados básicos próprios" ON public.colaboradores_dados_sensíveis;
DROP POLICY IF EXISTS "Acesso administrativo com permissão específica" ON public.colaboradores_dados_sensíveis;
DROP POLICY IF EXISTS "Apenas admins podem inserir dados sensíveis" ON public.colaboradores_dados_sensíveis;
DROP POLICY IF EXISTS "Apenas admins podem atualizar dados sensíveis" ON public.colaboradores_dados_sensíveis;

-- Política restritiva: apenas admins com permissão específica podem ver dados sensíveis
CREATE POLICY "Acesso restrito a dados sensíveis" ON public.colaboradores_dados_sensíveis
  FOR SELECT USING (
    public.is_admin_with_valid_reason(auth.uid()) 
    AND public.has_sensitive_data_permission(auth.uid(), 'administracao'::public.tipo_acesso_dados)
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

-- Proibir exclusão de dados sensíveis por segurança
CREATE POLICY "Negar exclusão de dados sensíveis" ON public.colaboradores_dados_sensíveis
  FOR DELETE USING (false);

-- 3. Políticas para tabela de permissões
DROP POLICY IF EXISTS "Admins podem gerenciar permissões" ON public.permissoes_dados_sensíveis;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias permissões" ON public.permissoes_dados_sensíveis;

CREATE POLICY "Admins podem gerenciar permissões" ON public.permissoes_dados_sensíveis
  FOR ALL USING (
    public.is_admin_with_valid_reason(auth.uid())
  );

CREATE POLICY "Usuários podem ver suas próprias permissões" ON public.permissoes_dados_sensíveis
  FOR SELECT USING (auth.uid() = user_id);