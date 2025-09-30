-- Corrigir política de INSERT para não exigir ativo no WITH CHECK
DROP POLICY IF EXISTS "Usuarios autenticados podem criar referencias" ON public.referencias_criativos;

CREATE POLICY "Usuarios autenticados podem criar referencias"
ON public.referencias_criativos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);