-- Corrigir a função is_admin_with_valid_reason para usar a nova função sem recursão
CREATE OR REPLACE FUNCTION public.is_admin_with_valid_reason(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  -- Consultar diretamente a tabela auth.users para verificar se o email é master
  -- e depois verificar se existe um perfil admin ativo
  SELECT EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE au.id = _user_id
      AND (
        -- Verificar se é email master
        EXISTS (SELECT 1 FROM public.master_emails me WHERE me.email = au.email)
        OR
        -- Verificar se tem perfil admin (sem causar recursão)
        EXISTS (
          SELECT 1 
          FROM public.profiles p
          WHERE p.user_id = _user_id 
            AND p.nivel_acesso = 'admin'
            AND p.ativo = true
        )
      )
  );
$$;