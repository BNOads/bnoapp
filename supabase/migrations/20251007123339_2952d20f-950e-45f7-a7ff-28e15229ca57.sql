-- Permitir acesso público para visualizar gravações de reuniões
-- Isso permite que clientes vejam gravações no painel público
CREATE POLICY "Public can view gravacoes"
  ON public.gravacoes
  FOR SELECT
  USING (true);

-- Permitir acesso público para visualizar reuniões
CREATE POLICY "Public can view reunioes"
  ON public.reunioes
  FOR SELECT
  USING (true);

-- Permitir acesso público para visualizar links importantes
CREATE POLICY "Public can view links_importantes"
  ON public.links_importantes
  FOR SELECT
  USING (true);