-- Fix RLS policies for referencias_criativos with correct column names

-- Drop existing policies
DROP POLICY IF EXISTS "Usuarios autenticados podem ver referencias" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Criadores podem atualizar referencias" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Criadores podem excluir referencias" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Usuarios autenticados podem criar referencias" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Acesso público a referências com link público" ON public.referencias_criativos;

-- Create comprehensive policies for referencias_criativos
CREATE POLICY "Colaboradores podem ver todas as referencias" 
ON public.referencias_criativos 
FOR SELECT 
USING (
  (ativo = true) AND (
    -- Allow view for authenticated users or public links
    (EXISTS ( SELECT 1
     FROM profiles p
    WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))) OR
    (link_publico IS NOT NULL)
  )
);

CREATE POLICY "Colaboradores podem criar referencias" 
ON public.referencias_criativos 
FOR INSERT 
WITH CHECK (
  (auth.uid() = created_by) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);

CREATE POLICY "Colaboradores podem atualizar referencias" 
ON public.referencias_criativos 
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

CREATE POLICY "Colaboradores podem deletar referencias" 
ON public.referencias_criativos 
FOR DELETE 
USING (
  (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid())) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);

-- Add public access policy for referencias with public links
CREATE POLICY "Acesso publico a referencias com link publico" 
ON public.referencias_criativos 
FOR SELECT 
USING (link_publico IS NOT NULL);

-- Fix the orcamentos_funil policies
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