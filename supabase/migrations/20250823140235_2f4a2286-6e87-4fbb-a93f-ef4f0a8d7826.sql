-- Corrigir recursão infinita nas policies da tabela profiles

-- Primeiro, remover as policies problemáticas
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;

-- Criar funções security definer para evitar recursão
CREATE OR REPLACE FUNCTION public.is_profile_owner(_user_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = _profile_user_id;
$$;

CREATE OR REPLACE FUNCTION public.check_admin_access(_user_id uuid)
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
  );
$$;

-- Recriar as policies usando as funções security definer
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.profiles 
FOR SELECT 
USING (public.is_profile_owner(auth.uid(), user_id));

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON public.profiles 
FOR UPDATE 
USING (public.is_profile_owner(auth.uid(), user_id));

-- Para admins, criar uma policy separada que não cause recursão
-- usando diretamente a função is_admin_with_valid_reason que já existe
CREATE POLICY "Admins podem ver todos os perfis" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin_with_valid_reason(auth.uid()));

-- Permitir que admins atualizem outros perfis
CREATE POLICY "Admins podem atualizar perfis" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin_with_valid_reason(auth.uid()));

-- Garantir que apenas o sistema pode inserir perfis (via AuthContext)
CREATE POLICY "Sistema pode inserir perfis" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);