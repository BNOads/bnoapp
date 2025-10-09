-- Fix RLS to show PDIs to the assigned user and to admins
-- Ensure RLS is enabled
ALTER TABLE public.pdis ENABLE ROW LEVEL SECURITY;

-- Replace the existing SELECT policy to correctly map auth.uid() to colaboradores.user_id
DROP POLICY IF EXISTS "Usuários podem ver seus próprios PDIs ou admins veem todos" ON public.pdis;

CREATE POLICY "Usuários podem ver seus próprios PDIs ou admins veem todos"
ON public.pdis
FOR SELECT
TO authenticated
USING (
  -- Admins can view all
  is_admin_with_valid_reason(auth.uid())
  OR 
  -- Assigned user (via colaboradores mapping) can view their PDIs
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = public.pdis.colaborador_id AND c.user_id = auth.uid()
  )
  OR
  -- Creator can also view
  public.pdis.created_by = auth.uid()
);

-- Allow assigned users to update their own PDIs (e.g., conclude)
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios PDIs" ON public.pdis;
CREATE POLICY "Usuários podem atualizar seus próprios PDIs"
ON public.pdis
FOR UPDATE
TO authenticated
USING (
  is_admin_with_valid_reason(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = public.pdis.colaborador_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  is_admin_with_valid_reason(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = public.pdis.colaborador_id AND c.user_id = auth.uid()
  )
);
