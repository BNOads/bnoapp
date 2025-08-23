-- 1. Remover campos sensíveis da tabela principal colaboradores
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
-- Usuários só podem ver seus próprios dados básicos com permissão específica
CREATE POLICY "Usuários podem ver apenas dados básicos próprios" ON public.colaboradores_dados_sensíveis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c 
      WHERE c.id = colaborador_id AND c.user_id = auth.uid()
    )
    AND public.has_sensitive_data_permission(auth.uid(), 'leitura_propria'::public.tipo_acesso_dados)
  );

-- Apenas usuários com permissão específica podem ver dados completos
CREATE POLICY "Acesso administrativo com permissão específica" ON public.colaboradores_dados_sensíveis
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