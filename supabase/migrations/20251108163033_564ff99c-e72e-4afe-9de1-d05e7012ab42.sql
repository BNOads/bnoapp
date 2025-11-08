-- Adicionar coluna conteudo_lexical para migração do editor
ALTER TABLE reunioes_blocos
ADD COLUMN conteudo_lexical jsonb;

-- Adicionar índice para melhor performance
CREATE INDEX idx_reunioes_blocos_conteudo_lexical ON reunioes_blocos USING gin(conteudo_lexical) WHERE conteudo_lexical IS NOT NULL;

COMMENT ON COLUMN reunioes_blocos.conteudo_lexical IS 'Estado do editor Lexical em formato JSON - usado para novos blocos com editor colaborativo';