-- Adicionar política RLS para permitir DELETE na tabela gravacoes
CREATE POLICY "Criadores podem excluir suas gravações" 
ON public.gravacoes 
FOR DELETE 
USING (auth.uid() = created_by);