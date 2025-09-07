-- Atualizar política para permitir que todos vejam todos os colaboradores do time
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.colaboradores;

-- Nova política para colaboradores - todos podem ver todos os membros do time
CREATE POLICY "Usuarios autenticados podem ver todos colaboradores" 
ON public.colaboradores 
FOR SELECT 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);