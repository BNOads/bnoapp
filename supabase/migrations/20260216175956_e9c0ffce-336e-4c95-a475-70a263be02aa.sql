-- Remover política restritiva de INSERT (apenas admins)
DROP POLICY IF EXISTS "Admins podem criar acessos" ON public.acessos_logins;

-- Criar nova política que permite qualquer usuário autenticado inserir
CREATE POLICY "Usuarios autenticados podem criar acessos"
ON public.acessos_logins
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Permitir qualquer usuário autenticado atualizar seus próprios acessos (ou admins atualizarem qualquer um)
DROP POLICY IF EXISTS "Admins podem atualizar acessos" ON public.acessos_logins;

CREATE POLICY "Usuarios podem atualizar acessos"
ON public.acessos_logins
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid()));