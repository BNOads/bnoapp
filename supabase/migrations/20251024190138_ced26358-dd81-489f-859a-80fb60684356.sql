-- Adicionar campo finalizado à tabela gamificacao_desafios
ALTER TABLE gamificacao_desafios 
ADD COLUMN IF NOT EXISTS finalizado BOOLEAN DEFAULT false;

-- Criar índice para buscar desafios finalizados
CREATE INDEX IF NOT EXISTS idx_gamificacao_desafios_finalizado 
ON gamificacao_desafios(finalizado, data_fim DESC);