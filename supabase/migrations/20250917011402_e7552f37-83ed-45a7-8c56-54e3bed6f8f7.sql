-- Permitir que contribuidores atualizem documentos de reunião
CREATE POLICY IF NOT EXISTS "Contribuidores podem atualizar documentos" 
ON public.reunioes_documentos 
FOR UPDATE 
USING (
  (auth.uid() = created_by)
  OR is_admin_with_valid_reason(auth.uid())
  OR (auth.uid() = ANY (contribuidores))
);

-- Opcional: permitir que contribuidores insiram blocos já foi ajustado via reunioes_blocos
-- Nada a fazer aqui