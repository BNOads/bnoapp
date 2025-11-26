-- Tornar campos de data opcionais na tabela lancamentos
ALTER TABLE lancamentos 
  ALTER COLUMN data_inicio_captacao DROP NOT NULL,
  ALTER COLUMN created_by DROP NOT NULL;

-- Adicionar índice para melhorar performance na busca de aliases
CREATE INDEX IF NOT EXISTS idx_clientes_aliases ON clientes USING gin(aliases);

-- Comentários para documentação
COMMENT ON COLUMN lancamentos.data_inicio_captacao IS 'Data de início da captação - pode ser null para lançamentos criados via webhook';
COMMENT ON COLUMN lancamentos.created_by IS 'ID do criador - pode ser null para lançamentos criados via webhook automatizado';