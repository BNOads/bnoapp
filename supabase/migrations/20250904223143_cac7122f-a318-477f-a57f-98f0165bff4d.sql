-- Drop policies that depend on gestor_responsavel column
DROP POLICY IF EXISTS "Gestores podem atualizar seus lançamentos" ON public.lancamentos;

-- Drop the gestor_responsavel column
ALTER TABLE public.lancamentos DROP COLUMN IF EXISTS gestor_responsavel;

-- Recreate the update policy without gestor_responsavel dependency
CREATE POLICY "Criadores podem atualizar seus lançamentos" 
ON public.lancamentos 
FOR UPDATE 
USING ((auth.uid() = created_by) OR is_admin_with_valid_reason(auth.uid()));