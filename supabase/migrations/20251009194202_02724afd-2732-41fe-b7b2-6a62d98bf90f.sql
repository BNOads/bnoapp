-- Preencher o campo conteudo_texto dos documentos de reunião existentes
-- a partir dos blocos salvos na tabela reunioes_blocos
UPDATE reunioes_documentos rd
SET conteudo_texto = (
  SELECT string_agg(
    CONCAT(
      CASE WHEN rb.titulo IS NOT NULL AND rb.titulo != '' 
        THEN '## ' || rb.titulo || E'\n\n' 
        ELSE '' 
      END,
      COALESCE(
        regexp_replace(rb.conteudo::text, '<[^>]*>', '', 'g'), 
        ''
      ),
      E'\n\n'
    ),
    ''
    ORDER BY rb.ordem
  )
  FROM reunioes_blocos rb
  WHERE rb.documento_id = rd.id
)
WHERE EXISTS (
  SELECT 1 
  FROM reunioes_blocos rb 
  WHERE rb.documento_id = rd.id
)
AND (rd.conteudo_texto IS NULL OR rd.conteudo_texto = '');

-- Criar índice para melhorar performance de buscas em conteudo_texto
CREATE INDEX IF NOT EXISTS idx_reunioes_documentos_conteudo_texto 
ON reunioes_documentos USING gin(to_tsvector('portuguese', conteudo_texto));

-- Comentário sobre a migração
COMMENT ON COLUMN reunioes_documentos.conteudo_texto IS 
'Conteúdo em texto plano concatenado de todos os blocos da reunião, usado para busca e indexação pela IA';