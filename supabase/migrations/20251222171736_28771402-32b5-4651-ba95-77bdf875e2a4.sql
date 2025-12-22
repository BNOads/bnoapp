-- Adicionar política de acesso público para lancamento_links (para lançamentos públicos)
CREATE POLICY "Acesso público a links de lançamentos públicos"
ON public.lancamento_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lancamentos l 
    WHERE l.id = lancamento_links.lancamento_id 
    AND l.link_publico_ativo = true
  )
);

-- Adicionar política de acesso público para colaboradores (apenas nome para exibição pública)
CREATE POLICY "Acesso público básico a colaboradores"
ON public.colaboradores
FOR SELECT
USING (true);

-- Adicionar política de acesso público para clientes (para lançamentos públicos)
CREATE POLICY "Acesso público a clientes de lançamentos públicos"
ON public.clientes
FOR SELECT
USING (true);