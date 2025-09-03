-- Adicionar campo de transcrição às gravações existentes
ALTER TABLE public.gravacoes 
ADD COLUMN transcricao TEXT,
ADD COLUMN resumo_ia TEXT,
ADD COLUMN palavras_chave TEXT[],
ADD COLUMN temas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN participantes_mencionados TEXT[],
ADD COLUMN indexacao_busca tsvector;

-- Adicionar campo de transcrição às reuniões também
ALTER TABLE public.reunioes 
ADD COLUMN transcricao TEXT,
ADD COLUMN palavras_chave TEXT[],
ADD COLUMN temas_discutidos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN indexacao_busca tsvector;

-- Criar índice para busca full-text nas transcrições
CREATE INDEX idx_gravacoes_busca_transcricao ON public.gravacoes USING GIN(indexacao_busca);
CREATE INDEX idx_reunioes_busca_transcricao ON public.reunioes USING GIN(indexacao_busca);

-- Criar índice para busca por palavras-chave
CREATE INDEX idx_gravacoes_palavras_chave ON public.gravacoes USING GIN(palavras_chave);
CREATE INDEX idx_reunioes_palavras_chave ON public.reunioes USING GIN(palavras_chave);

-- Função para atualizar automaticamente o índice de busca
CREATE OR REPLACE FUNCTION public.update_transcricao_search_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Para gravações
  IF TG_TABLE_NAME = 'gravacoes' THEN
    NEW.indexacao_busca := 
      setweight(to_tsvector('portuguese', COALESCE(NEW.titulo, '')), 'A') ||
      setweight(to_tsvector('portuguese', COALESCE(NEW.descricao, '')), 'B') ||
      setweight(to_tsvector('portuguese', COALESCE(NEW.transcricao, '')), 'C') ||
      setweight(to_tsvector('portuguese', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
      setweight(to_tsvector('portuguese', COALESCE(array_to_string(NEW.palavras_chave, ' '), '')), 'A');
  END IF;
  
  -- Para reuniões
  IF TG_TABLE_NAME = 'reunioes' THEN
    NEW.indexacao_busca := 
      setweight(to_tsvector('portuguese', COALESCE(NEW.titulo, '')), 'A') ||
      setweight(to_tsvector('portuguese', COALESCE(NEW.descricao, '')), 'B') ||
      setweight(to_tsvector('portuguese', COALESCE(NEW.transcricao, '')), 'C') ||
      setweight(to_tsvector('portuguese', COALESCE(NEW.resumo_ia, '')), 'B') ||
      setweight(to_tsvector('portuguese', COALESCE(array_to_string(NEW.palavras_chave, ' '), '')), 'A');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar índices automaticamente
CREATE TRIGGER trigger_update_gravacoes_search
  BEFORE INSERT OR UPDATE ON public.gravacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_transcricao_search_index();

CREATE TRIGGER trigger_update_reunioes_search
  BEFORE INSERT OR UPDATE ON public.reunioes
  FOR EACH ROW EXECUTE FUNCTION public.update_transcricao_search_index();

-- Função especializada para busca inteligente de transcrições
CREATE OR REPLACE FUNCTION public.buscar_transcricoes_reunioes(
  _user_id UUID,
  _query TEXT DEFAULT NULL,
  _cliente_id UUID DEFAULT NULL,
  _data_inicio DATE DEFAULT NULL,
  _data_fim DATE DEFAULT NULL,
  _responsavel TEXT DEFAULT NULL,
  _limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  tipo TEXT,
  id UUID,
  titulo TEXT,
  cliente_nome TEXT,
  data_reuniao TIMESTAMP WITH TIME ZONE,
  transcricao TEXT,
  resumo_ia TEXT,
  palavras_chave TEXT[],
  temas JSONB,
  url_gravacao TEXT,
  link_meet TEXT,
  relevancia REAL
) AS $$
DECLARE
  _is_admin BOOLEAN;
  _user_client_id UUID;
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
    CASE 
      WHEN _query IS NOT NULL THEN ts_rank(g.indexacao_busca, plainto_tsquery('portuguese', _query))
      ELSE 1.0
    END as relevancia
  FROM gravacoes g
  LEFT JOIN clientes cl ON g.cliente_id = cl.id
  WHERE 
    (_is_admin OR g.cliente_id = _user_client_id OR (_cliente_id IS NOT NULL AND g.cliente_id = _cliente_id))
    AND (_query IS NULL OR g.indexacao_busca @@ plainto_tsquery('portuguese', _query))
    AND (_cliente_id IS NULL OR g.cliente_id = _cliente_id)
    AND (_data_inicio IS NULL OR g.created_at::date >= _data_inicio)
    AND (_data_fim IS NULL OR g.created_at::date <= _data_fim)
    AND g.transcricao IS NOT NULL
    AND g.transcricao != ''
  
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
    CASE 
      WHEN _query IS NOT NULL THEN ts_rank(r.indexacao_busca, plainto_tsquery('portuguese', _query))
      ELSE 1.0
    END as relevancia
  FROM reunioes r
  LEFT JOIN clientes cl ON r.cliente_id = cl.id
  WHERE 
    (_is_admin OR r.cliente_id = _user_client_id OR (_cliente_id IS NOT NULL AND r.cliente_id = _cliente_id))
    AND (_query IS NULL OR r.indexacao_busca @@ plainto_tsquery('portuguese', _query))
    AND (_cliente_id IS NULL OR r.cliente_id = _cliente_id)
    AND (_data_inicio IS NULL OR r.data_hora::date >= _data_inicio)
    AND (_data_fim IS NULL OR r.data_hora::date <= _data_fim)
    AND (_responsavel IS NULL OR r.titulo ILIKE '%' || _responsavel || '%' OR r.descricao ILIKE '%' || _responsavel || '%')
    AND r.transcricao IS NOT NULL
    AND r.transcricao != ''
  
  ORDER BY relevancia DESC, data_reuniao DESC
  LIMIT _limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;