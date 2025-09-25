-- Fix RLS policies for diario_bordo table by checking for existing policies first

-- Drop all existing policies for diario_bordo
DO $$
BEGIN
    DROP POLICY IF EXISTS "Usuarios autenticados podem criar entradas" ON public.diario_bordo;
    DROP POLICY IF EXISTS "Usuarios autenticados podem ver entradas" ON public.diario_bordo;
    DROP POLICY IF EXISTS "Autores podem atualizar suas entradas" ON public.diario_bordo;
    DROP POLICY IF EXISTS "Autores podem excluir suas entradas" ON public.diario_bordo;
    DROP POLICY IF EXISTS "Usuarios podem criar entradas no diario de bordo" ON public.diario_bordo;
    DROP POLICY IF EXISTS "Todos podem ver entradas do diario de bordo" ON public.diario_bordo;
    DROP POLICY IF EXISTS "Autores e admins podem atualizar entradas" ON public.diario_bordo;
    DROP POLICY IF EXISTS "Autores e admins podem excluir entradas" ON public.diario_bordo;
END $$;

-- Create proper RLS policies for diario_bordo
CREATE POLICY "Usuarios podem criar entradas no diario" 
ON public.diario_bordo 
FOR INSERT 
WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Todos podem ver entradas do diario" 
ON public.diario_bordo 
FOR SELECT 
USING (true);

CREATE POLICY "Autores e admins podem atualizar" 
ON public.diario_bordo 
FOR UPDATE 
USING (
  auth.uid() = autor_id 
  OR is_admin_with_valid_reason(auth.uid())
);

CREATE POLICY "Autores e admins podem excluir" 
ON public.diario_bordo 
FOR DELETE 
USING (
  auth.uid() = autor_id 
  OR is_admin_with_valid_reason(auth.uid())
);