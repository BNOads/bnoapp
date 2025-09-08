-- Update RLS policies to allow CS and gestor_trafego to manage budgets

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Colaboradores podem criar orcamentos" ON public.orcamentos_funil;

-- Create new INSERT policy that allows CS, gestor_trafego and admin to create budgets
CREATE POLICY "CS e gestores podem criar orcamentos" 
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

-- Also update UPDATE policy to allow these roles
DROP POLICY IF EXISTS "Colaboradores podem atualizar orcamentos" ON public.orcamentos_funil;

CREATE POLICY "CS e gestores podem atualizar orcamentos" 
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

-- Update SELECT policy as well
DROP POLICY IF EXISTS "Colaboradores podem ver todos os orcamentos" ON public.orcamentos_funil;

CREATE POLICY "CS e gestores podem ver orcamentos" 
ON public.orcamentos_funil 
FOR SELECT 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE (p.user_id = auth.uid()) 
    AND (p.ativo = true) 
    AND (p.nivel_acesso IN ('admin', 'gestor_trafego', 'cs'))
  )
);

-- Update DELETE policy 
DROP POLICY IF EXISTS "Colaboradores podem deletar orcamentos" ON public.orcamentos_funil;

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