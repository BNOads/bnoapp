-- Drop all existing policies for orcamentos_funil and recreate them properly

-- Drop all existing policies first
DROP POLICY IF EXISTS "CS e gestores podem criar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "CS e gestores podem atualizar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "CS e gestores podem ver orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Admins e criadores podem deletar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Colaboradores podem criar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Colaboradores podem atualizar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Colaboradores podem ver todos os orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Colaboradores podem deletar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Acesso publico para painel cliente" ON public.orcamentos_funil;

-- Create comprehensive policies that allow CS, gestor_trafego and admin

-- SELECT policy - allow authenticated users with proper roles AND public access
CREATE POLICY "Usuarios autenticados e publico podem ver orcamentos" 
ON public.orcamentos_funil 
FOR SELECT 
USING (
  -- Public access OR authenticated with proper role
  true OR
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE (p.user_id = auth.uid()) 
    AND (p.ativo = true) 
    AND (p.nivel_acesso IN ('admin', 'gestor_trafego', 'cs'))
  ))
);

-- INSERT policy - allow CS, gestor_trafego and admin to create budgets
CREATE POLICY "CS gestores e admins podem criar orcamentos" 
ON public.orcamentos_funil 
FOR INSERT 
WITH CHECK (
  (auth.uid() = created_by) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE (p.user_id = auth.uid()) 
    AND (p.ativo = true) 
    AND (p.nivel_acesso IN ('admin', 'gestor_trafego', 'cs'))
  ))
);

-- UPDATE policy - allow CS, gestor_trafego and admin to update budgets
CREATE POLICY "CS gestores e admins podem atualizar orcamentos" 
ON public.orcamentos_funil 
FOR UPDATE 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE (p.user_id = auth.uid()) 
    AND (p.ativo = true) 
    AND (p.nivel_acesso IN ('admin', 'gestor_trafego', 'cs'))
  )
)
WITH CHECK (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE (p.user_id = auth.uid()) 
    AND (p.ativo = true) 
    AND (p.nivel_acesso IN ('admin', 'gestor_trafego', 'cs'))
  )
);

-- DELETE policy - allow admins and creators to delete budgets
CREATE POLICY "Admins e criadores podem deletar orcamentos" 
ON public.orcamentos_funil 
FOR DELETE 
USING (
  (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid())) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE (p.user_id = auth.uid()) 
    AND (p.ativo = true) 
    AND (p.nivel_acesso IN ('admin', 'gestor_trafego', 'cs'))
  ))
);