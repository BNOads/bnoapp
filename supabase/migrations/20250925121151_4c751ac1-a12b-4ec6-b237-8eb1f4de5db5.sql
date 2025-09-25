-- Atualizar política RLS para permitir que todos os membros da equipe atualizem criativos
DROP POLICY IF EXISTS "Admins podem atualizar criativos" ON public.creatives;

-- Criar nova política que permite que qualquer usuário autenticado da equipe atualize criativos
CREATE POLICY "Equipe pode atualizar criativos" 
ON public.creatives 
FOR UPDATE 
USING (
  archived = false 
  AND EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true
  )
);