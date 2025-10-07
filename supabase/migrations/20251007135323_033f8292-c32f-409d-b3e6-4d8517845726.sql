-- Adicionar política de acesso público para leitura de mensagens semanais
-- Isso permite que clientes vejam o histórico de suas mensagens no painel público

CREATE POLICY "Public can view mensagens_semanais"
ON public.mensagens_semanais
FOR SELECT
USING (true);