
-- Adicionar policy para permitir acesso público a lançamentos ativos no painel do cliente
CREATE POLICY "Acesso público a lançamentos ativos de clientes"
ON lancamentos
FOR SELECT
USING (
  ativo = true 
  AND status_lancamento IN ('em_captacao', 'cpl', 'remarketing')
);
