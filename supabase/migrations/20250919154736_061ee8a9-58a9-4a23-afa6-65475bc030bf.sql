-- Atualizar política de INSERT para permitir que usuários autenticados possam inserir criativos
DROP POLICY IF EXISTS "Admins podem inserir criativos" ON creatives;

CREATE POLICY "Usuarios autenticados podem inserir criativos" 
ON creatives 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true
  )
);