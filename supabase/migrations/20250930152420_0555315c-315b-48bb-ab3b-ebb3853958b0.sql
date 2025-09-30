-- Corrigir as políticas RLS da tabela referencias_criativos
-- para permitir visualização por todos os colaboradores e deleção pelos criadores

-- 1. Drop das políticas antigas
DROP POLICY IF EXISTS "Colaboradores podem gerenciar todos os documentos" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Acesso público a POPs com link ativo" ON public.referencias_criativos;

-- 2. Política de SELECT: todos os usuários autenticados podem ver referências ativas
CREATE POLICY "Usuarios autenticados podem ver referencias ativas"
ON public.referencias_criativos
FOR SELECT
TO authenticated
USING (ativo = true);

-- 3. Política de INSERT: usuários autenticados podem criar referências
CREATE POLICY "Usuarios autenticados podem criar referencias"
ON public.referencias_criativos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by 
  AND ativo = true
);

-- 4. Política de UPDATE: criadores e admins podem atualizar suas referências
CREATE POLICY "Criadores e admins podem atualizar referencias"
ON public.referencias_criativos
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by 
  OR is_admin_with_valid_reason(auth.uid())
)
WITH CHECK (
  auth.uid() = created_by 
  OR is_admin_with_valid_reason(auth.uid())
);

-- 5. Política de DELETE: criadores e admins podem excluir (soft delete via UPDATE)
-- Como a exclusão é soft delete (update ativo = false), a política de UPDATE já cobre isso
-- Mas vamos adicionar uma política específica para DELETE por segurança
CREATE POLICY "Criadores e admins podem deletar referencias"
ON public.referencias_criativos
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by 
  OR is_admin_with_valid_reason(auth.uid())
);