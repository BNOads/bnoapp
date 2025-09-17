-- Permitir que contribuidores atualizem documentos de reunião
-- Primeiro dropar se já existe
DROP POLICY IF EXISTS "Contribuidores podem atualizar documentos" ON public.reunioes_documentos;

-- Criar nova política
CREATE POLICY "Contribuidores podem atualizar documentos" 
ON public.reunioes_documentos 
FOR UPDATE 
USING (
  (auth.uid() = created_by)
  OR is_admin_with_valid_reason(auth.uid())
  OR (auth.uid() = ANY (contribuidores))
);