-- Atualizar política de lancamento_links para não exigir link_publico_ativo
-- Remover a política antiga e criar uma nova que permite acesso para qualquer lançamento com link_publico

DROP POLICY IF EXISTS "Acesso público a links de lançamentos públicos" ON public.lancamento_links;

CREATE POLICY "Acesso público a links de lançamentos públicos"
ON public.lancamento_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lancamentos l 
    WHERE l.id = lancamento_links.lancamento_id 
    AND l.link_publico IS NOT NULL
  )
);
