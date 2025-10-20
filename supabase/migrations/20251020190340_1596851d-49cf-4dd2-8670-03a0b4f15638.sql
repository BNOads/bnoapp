-- Adicionar campo conteudo_texto na tabela reunioes_documentos
ALTER TABLE public.reunioes_documentos 
ADD COLUMN IF NOT EXISTS conteudo_texto TEXT;

-- Criar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_reunioes_documentos_conteudo_texto 
ON reunioes_documentos USING gin(to_tsvector('portuguese', COALESCE(conteudo_texto, '')));

-- Comentário sobre o campo
COMMENT ON COLUMN reunioes_documentos.conteudo_texto IS 
'Conteúdo em texto plano concatenado de todos os blocos da reunião, usado para busca e indexação';