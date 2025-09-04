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

-- Criar índices para busca de embeddings
CREATE INDEX IF NOT EXISTS idx_gravacoes_embedding ON gravacoes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_reunioes_embedding ON reunioes USING ivfflat (embedding vector_cosine_ops);

-- Função para buscar transcrições com embeddings
CREATE OR REPLACE FUNCTION buscar_transcricoes_semanticas(
  _user_id uuid,
  _query text,
  _cliente_id uuid DEFAULT NULL,
  _data_inicio date DEFAULT NULL,
  _data_fim date DEFAULT NULL,
  _limit integer DEFAULT 10
)
RETURNS TABLE(
  tipo text,
  id uuid,
  titulo text,
  cliente_nome text,
  data_reuniao timestamp with time zone,
  transcricao text,
  resumo_ia text,
  palavras_chave text[],
  temas jsonb,
  url_gravacao text,
  link_meet text,
  topicos_principais jsonb,
  decisoes_tomadas jsonb,
  pendencias jsonb,
  relevancia real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _is_admin BOOLEAN;
  _user_client_id UUID;
  _query_embedding vector(1536);
BEGIN
  -- Verificar se é admin
  SELECT is_admin_with_valid_reason(_user_id) INTO _is_admin;
  
  -- Se não for admin, buscar cliente específico do usuário
  IF NOT _is_admin THEN
    SELECT c.id INTO _user_client_id
    FROM colaboradores col
    JOIN clientes c ON (c.cs_id = col.id OR c.traffic_manager_id = col.id)
    WHERE col.user_id = _user_id
    LIMIT 1;
  END IF;

  -- Buscar em gravações
  RETURN QUERY
  SELECT 
    'gravacao'::TEXT as tipo,
    g.id,
    g.titulo,
    COALESCE(cl.nome, 'Cliente não definido') as cliente_nome,
    g.created_at as data_reuniao,
    g.transcricao,
    g.resumo_ia,
    g.palavras_chave,
    g.temas,
    g.url_gravacao,
    NULL::TEXT as link_meet,
    g.topicos_principais,
    g.decisoes_tomadas,
    g.pendencias,
    CASE 
      WHEN _query IS NOT NULL AND g.indexacao_busca IS NOT NULL THEN 
        ts_rank(g.indexacao_busca, plainto_tsquery('portuguese', _query))
      WHEN _query IS NOT NULL THEN
        CASE 
          WHEN g.transcricao ILIKE '%' || _query || '%' OR g.titulo ILIKE '%' || _query || '%' THEN 0.8
          WHEN g.resumo_ia ILIKE '%' || _query || '%' THEN 0.6
          ELSE 0.3
        END
      ELSE 1.0
    END as relevancia
  FROM gravacoes g
  LEFT JOIN clientes cl ON g.cliente_id = cl.id
  WHERE 
    (_is_admin OR g.cliente_id = _user_client_id OR (_cliente_id IS NOT NULL AND g.cliente_id = _cliente_id))
    AND (
      _query IS NULL OR 
      (g.indexacao_busca IS NOT NULL AND g.indexacao_busca @@ plainto_tsquery('portuguese', _query)) OR
      g.transcricao ILIKE '%' || _query || '%' OR
      g.titulo ILIKE '%' || _query || '%' OR
      g.resumo_ia ILIKE '%' || _query || '%' OR
      cl.nome ILIKE '%' || _query || '%'
    )
    AND (_cliente_id IS NULL OR g.cliente_id = _cliente_id)
    AND (_data_inicio IS NULL OR g.created_at::date >= _data_inicio)
    AND (_data_fim IS NULL OR g.created_at::date <= _data_fim)
    AND (g.transcricao IS NOT NULL AND g.transcricao != '')
  
  UNION ALL
  
  -- Buscar em reuniões
  SELECT 
    'reuniao'::TEXT as tipo,
    r.id,
    r.titulo,
    COALESCE(cl.nome, 'Cliente não definido') as cliente_nome,
    r.data_hora as data_reuniao,
    r.transcricao,
    r.resumo_ia,
    r.palavras_chave,
    r.temas_discutidos as temas,
    r.link_gravacao as url_gravacao,
    r.link_meet,
    r.topicos_principais,
    r.decisoes_tomadas,
    r.pendencias,
    CASE 
      WHEN _query IS NOT NULL AND r.indexacao_busca IS NOT NULL THEN 
        ts_rank(r.indexacao_busca, plainto_tsquery('portuguese', _query))
      WHEN _query IS NOT NULL THEN
        CASE 
          WHEN r.transcricao ILIKE '%' || _query || '%' OR r.titulo ILIKE '%' || _query || '%' THEN 0.8
          WHEN r.resumo_ia ILIKE '%' || _query || '%' THEN 0.6
          ELSE 0.3
        END
      ELSE 1.0
    END as relevancia
  FROM reunioes r
  LEFT JOIN clientes cl ON r.cliente_id = cl.id
  WHERE 
    (_is_admin OR r.cliente_id = _user_client_id OR (_cliente_id IS NOT NULL AND r.cliente_id = _cliente_id))
    AND (
      _query IS NULL OR 
      (r.indexacao_busca IS NOT NULL AND r.indexacao_busca @@ plainto_tsquery('portuguese', _query)) OR
      r.transcricao ILIKE '%' || _query || '%' OR
      r.titulo ILIKE '%' || _query || '%' OR
      r.resumo_ia ILIKE '%' || _query || '%' OR
      cl.nome ILIKE '%' || _query || '%'
    )
    AND (_cliente_id IS NULL OR r.cliente_id = _cliente_id)
    AND (_data_inicio IS NULL OR r.data_hora::date >= _data_inicio)
    AND (_data_fim IS NULL OR r.data_hora::date <= _data_fim)
    AND (r.transcricao IS NOT NULL AND r.transcricao != '')
  
  ORDER BY relevancia DESC, data_reuniao DESC
  LIMIT _limit;
END;
$$;