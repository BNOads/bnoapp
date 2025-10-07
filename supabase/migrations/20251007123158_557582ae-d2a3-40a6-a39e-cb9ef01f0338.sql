-- Adicionar política de acesso público para leitura de clientes
-- Isso permite que o painel do cliente funcione sem autenticação
CREATE POLICY "Public can view clientes"
  ON public.clientes
  FOR SELECT
  USING (true);