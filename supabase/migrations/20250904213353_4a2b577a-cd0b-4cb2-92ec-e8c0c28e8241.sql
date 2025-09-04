-- Habilitar extensão pgvector para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar colunas para melhorar a análise de transcrições
ALTER TABLE gravacoes ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE gravacoes ADD COLUMN IF NOT EXISTS topicos_principais jsonb DEFAULT '[]'::jsonb;
ALTER TABLE gravacoes ADD COLUMN IF NOT EXISTS decisoes_tomadas jsonb DEFAULT '[]'::jsonb;
ALTER TABLE gravacoes ADD COLUMN IF NOT EXISTS pendencias jsonb DEFAULT '[]'::jsonb;
ALTER TABLE gravacoes ADD COLUMN IF NOT EXISTS participantes_identificados text[];

ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS topicos_principais jsonb DEFAULT '[]'::jsonb;
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS decisoes_tomadas jsonb DEFAULT '[]'::jsonb;
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS pendencias jsonb DEFAULT '[]'::jsonb;