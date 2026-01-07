-- Adicionar campo de explicação personalizada da categoria
ALTER TABLE orcamentos_funil
ADD COLUMN IF NOT EXISTS categoria_explicacao TEXT;

COMMENT ON COLUMN orcamentos_funil.categoria_explicacao IS 'Explicação personalizada da categoria/funil pelo usuário';
