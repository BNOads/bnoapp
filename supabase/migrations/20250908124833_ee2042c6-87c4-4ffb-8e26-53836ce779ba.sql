-- Fix RLS policies for the correct tables

-- First, check current policies for referencias_criativos
DROP POLICY IF EXISTS "Usuarios autenticados podem ver referencias" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Criadores podem atualizar referencias" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Criadores podem excluir referencias" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Usuarios autenticados podem criar referencias" ON public.referencias_criativos;

-- Create comprehensive policies for referencias_criativos
CREATE POLICY "Colaboradores podem gerenciar todas as referencias" 
ON public.referencias_criativos 
FOR ALL 
USING (
  -- Allow view for authenticated users or public links
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))) OR
  (link_publico_ativo = true)
) 
WITH CHECK (
  -- Allow insert/update only for authenticated users
  (auth.uid() = created_by) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);

-- Also add public access policy for referencias if needed
CREATE POLICY "Acesso publico a referencias com link ativo" 
ON public.referencias_criativos 
FOR SELECT 
USING (link_publico_ativo = true);

-- Fix the orcamentos_funil policies - the current one has an issue with WITH CHECK
DROP POLICY IF EXISTS "Colaboradores podem gerenciar todos os orcamentos" ON public.orcamentos_funil;

-- Recreate with proper permissions
CREATE POLICY "Colaboradores podem ver todos os orcamentos" 
ON public.orcamentos_funil 
FOR SELECT 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);

CREATE POLICY "Colaboradores podem criar orcamentos" 
ON public.orcamentos_funil 
FOR INSERT 
WITH CHECK (
  (auth.uid() = created_by) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);

CREATE POLICY "Colaboradores podem atualizar orcamentos" 
ON public.orcamentos_funil 
FOR UPDATE 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
)
WITH CHECK (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);

CREATE POLICY "Colaboradores podem deletar orcamentos" 
ON public.orcamentos_funil 
FOR DELETE 
USING (
  (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid())) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);