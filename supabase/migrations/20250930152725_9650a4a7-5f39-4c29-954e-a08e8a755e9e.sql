-- Remover TODAS as políticas existentes da tabela referencias_criativos
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'referencias_criativos' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.referencias_criativos', pol.policyname);
    END LOOP;
END $$;

-- Criar novas políticas corrigidas

-- 1. SELECT: todos os usuários autenticados podem ver referências ativas
CREATE POLICY "Usuarios autenticados podem ver referencias ativas"
ON public.referencias_criativos
FOR SELECT
TO authenticated
USING (ativo = true);

-- 2. INSERT: usuários autenticados podem criar referências
CREATE POLICY "Usuarios autenticados podem criar referencias"
ON public.referencias_criativos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by 
  AND ativo = true
);

-- 3. UPDATE: criadores e admins podem atualizar
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

-- 4. DELETE: criadores e admins podem deletar
CREATE POLICY "Criadores e admins podem deletar referencias"
ON public.referencias_criativos
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by 
  OR is_admin_with_valid_reason(auth.uid())
);