-- Corrigir recursão infinita - remover todas as policies primeiro
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Sistema pode inserir perfis" ON public.profiles;

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

-- Recriar as policies usando as funções security definer
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.profiles 
FOR SELECT 
USING (public.is_profile_owner(auth.uid(), user_id));

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON public.profiles 
FOR UPDATE 
USING (public.is_profile_owner(auth.uid(), user_id));

-- Para admins, usar a função existente is_admin_with_valid_reason
CREATE POLICY "Admins podem ver todos os perfis" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Admins podem atualizar perfis" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin_with_valid_reason(auth.uid()));

-- Garantir que apenas o sistema pode inserir perfis
CREATE POLICY "Sistema pode inserir perfis" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);