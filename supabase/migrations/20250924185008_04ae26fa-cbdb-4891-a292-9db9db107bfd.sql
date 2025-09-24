-- Allow CS users to also manage client roles
-- This fixes the issue where CS users can't assign team members to clients

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins and gestores can manage client roles" ON public.client_roles;

-- Create new policy that also allows CS users
CREATE POLICY "Admins, gestores and CS can manage client roles"
ON public.client_roles
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = auth.uid() 
      AND p.nivel_acesso = ANY (ARRAY['admin'::nivel_acesso, 'gestor_trafego'::nivel_acesso, 'cs'::nivel_acesso])
      AND p.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = auth.uid() 
      AND p.nivel_acesso = ANY (ARRAY['admin'::nivel_acesso, 'gestor_trafego'::nivel_acesso, 'cs'::nivel_acesso])
      AND p.ativo = true
  )
);