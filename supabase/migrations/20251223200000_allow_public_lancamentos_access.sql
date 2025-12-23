-- Permitir acesso público (anônimo) aos lançamentos que possuem link_publico
-- Isso é necessário para que a página /lancamento/:linkPublico funcione sem autenticação

CREATE POLICY "Acesso público para lançamentos com link_publico"
  ON public.lancamentos FOR SELECT
  USING (link_publico IS NOT NULL);
