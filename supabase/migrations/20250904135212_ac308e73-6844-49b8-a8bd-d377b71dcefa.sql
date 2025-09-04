-- Adicionar política para permitir acesso público aos dados do cliente no painel
CREATE POLICY "Acesso público ao painel do cliente" 
ON public.clientes 
FOR SELECT 
USING (true);