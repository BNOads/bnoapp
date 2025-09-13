-- Simplificar estrutura para documento único por dia
-- Remover tabelas de blocos e templates que não serão mais necessárias

-- Adicionar campo de conteúdo principal ao documento
ALTER TABLE reunioes_documentos ADD COLUMN IF NOT EXISTS conteudo_texto TEXT DEFAULT '';

-- Remover campos que não serão mais necessários
ALTER TABLE reunioes_documentos DROP COLUMN IF EXISTS tipo_reuniao;

-- Criar função para extrair títulos H2 do conteúdo
CREATE OR REPLACE FUNCTION extrair_titulos_reuniao(conteudo TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  titulos TEXT[];
  linha TEXT;
BEGIN
  -- Extrair títulos que começam com ##
  SELECT array_agg(
    trim(substring(linha from '^##\s*(.+)$'))
  ) INTO titulos
  FROM unnest(string_to_array(conteudo, E'\n')) AS linha
  WHERE linha ~ '^##\s+.+';
  
  RETURN COALESCE(titulos, ARRAY[]::TEXT[]);
END;
$$;

-- Trigger para atualizar índice de busca baseado no conteúdo
CREATE OR REPLACE FUNCTION update_reuniao_search_index()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Atualizar campo de títulos extraídos
  NEW.participantes := extrair_titulos_reuniao(NEW.conteudo_texto);
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger
DROP TRIGGER IF EXISTS update_reuniao_search_trigger ON reunioes_documentos;
CREATE TRIGGER update_reuniao_search_trigger
  BEFORE UPDATE ON reunioes_documentos
  FOR EACH ROW
  EXECUTE FUNCTION update_reuniao_search_index();