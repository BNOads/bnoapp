-- Criar política RLS para permitir exclusão de links importantes pelos criadores
CREATE POLICY "Criadores podem excluir seus links"
ON public.links_importantes
FOR DELETE
USING (auth.uid() = created_by);