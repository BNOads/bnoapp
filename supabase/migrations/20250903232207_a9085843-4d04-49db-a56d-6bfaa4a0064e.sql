-- Primeiro, vamos adicionar algumas transcrições de exemplo para GISLENEISQUIERDO
-- com base nas anotações do Gemini mencionadas pelo usuário

-- Atualizar algumas gravações existentes da GISLENEISQUIERDO com transcrições exemplo
UPDATE public.gravacoes 
SET 
  transcricao = 'REUNIÃO DE ALINHAMENTO - GISLENEISQUIERDO
  
  Data: 23/07/2025 às 14:54
  
  PRINCIPAIS PONTOS DISCUTIDOS:
  
  1. ESTRATÉGIA DE MARKETING:
  - Prometemos entregar a nova campanha de verão até o final do mês
  - Definimos o orçamento de R$ 15.000 para mídia paga no próximo trimestre
  - Acordamos focar no público feminino de 25-45 anos
  
  2. CRONOGRAMA DE ENTREGAS:
  - Criativos da campanha: até 30/07
  - Landing page otimizada: até 05/08
  - Relatório mensal: toda primeira segunda-feira do mês
  
  3. PRÓXIMOS PASSOS:
  - GISLENE vai enviar o briefing atualizado até sexta-feira
  - Vamos agendar reunião de revisão para próxima terça (30/07)
  - Implementar pixel do Facebook na loja virtual
  
  4. COMPROMETIMENTOS:
  - Nossa equipe: entregar proposta de influenciadores até 28/07
  - Cliente: aprovar criativos em até 48h após recebimento
  - Definir KPIs da campanha na próxima reunião
  
  OBSERVAÇÕES IMPORTANTES:
  - Cliente está satisfeita com os resultados atuais
  - Interesse em expandir para Instagram Shopping
  - Possível aumento de budget para dezembro (Black Friday)',
  resumo_ia = 'Reunião de alinhamento estratégico focada em entrega de nova campanha de verão, definição de orçamento de R$ 15k para mídia paga, e estabelecimento de cronograma detalhado. Principais compromissos: entrega de criativos até 30/07, briefing atualizado da cliente até sexta, e reunião de revisão agendada para 30/07.',
  palavras_chave = ARRAY['alinhamento', 'campanha', 'verão', 'orçamento', 'mídia paga', 'cronograma', 'criativos', 'landing page', 'pixel facebook', 'influenciadores', 'KPIs'],
  temas = '[
    {"categoria": "Marketing", "topicos": ["Campanha de verão", "Mídia paga", "Público-alvo"]},
    {"categoria": "Entregas", "topicos": ["Criativos", "Landing page", "Relatórios"]},
    {"categoria": "Comprometimentos", "topicos": ["Briefing cliente", "Aprovações", "Reunião revisão"]}
  ]'::jsonb,
  indexacao_busca = setweight(to_tsvector('portuguese', 'GISLENEISQUIERDO Alinhamento'), 'A') ||
                   setweight(to_tsvector('portuguese', 'Reunião de alinhamento estratégico campanha verão orçamento mídia'), 'B') ||
                   setweight(to_tsvector('portuguese', 'prometemos entregar campanha cronograma criativos landing page pixel facebook influenciadores'), 'C')
WHERE id = '0619fc94-d167-43c5-bc9c-b3a032644870';

-- Adicionar transcrição para outra gravação da GISLENEISQUIERDO
UPDATE public.gravacoes 
SET 
  transcricao = 'ANOTAÇÕES GEMINI - REUNIÃO GISLENEISQUIERDO
  
  RESUMO EXECUTIVO:
  Reunião focada em revisão de performance e planejamento do próximo mês.
  
  PERFORMANCE ATUAL:
  - CTR melhorou 35% no último mês
  - CPC reduziu de R$ 2,80 para R$ 1,95
  - ROAS atingiu 4.2x (meta era 3.5x)
  
  DECISÕES TOMADAS:
  - Aumentar budget diário de R$ 200 para R$ 300
  - Pausar campanhas de conversão que estão com CPA acima de R$ 50
  - Implementar remarketing para carrinho abandonado
  
  PRÓXIMAS AÇÕES:
  - Nossa equipe: configurar campanhas de remarketing até quinta-feira
  - Cliente: enviar produtos em promoção para agosto
  - Agendar call semanal toda terça às 14h
  
  FEEDBACK DA CLIENTE:
  "Estou muito satisfeita com os resultados. A equipe está sendo muito proativa e transparente com os dados."
  
  PONTOS DE ATENÇÃO:
  - Concorrente lançou campanha similar
  - Sazonalidade pode afetar performance em agosto
  - Necessário reforçar criativos com apelo emocional',
  resumo_ia = 'Reunião de revisão de performance com excelentes resultados: CTR +35%, CPC reduzido para R$ 1,95, ROAS 4.2x. Decisões: aumento de budget para R$ 300/dia, implementação de remarketing, e calls semanais às terças 14h.',
  palavras_chave = ARRAY['performance', 'CTR', 'CPC', 'ROAS', 'budget', 'remarketing', 'carrinho abandonado', 'campanhas', 'promoção'],
  temas = '[
    {"categoria": "Performance", "topicos": ["CTR 35%", "CPC R$ 1,95", "ROAS 4.2x"]},
    {"categoria": "Decisões", "topicos": ["Aumento budget", "Pausar campanhas", "Remarketing"]},
    {"categoria": "Próximas ações", "topicos": ["Configurar remarketing", "Produtos promoção", "Call semanal"]}
  ]'::jsonb,
  indexacao_busca = setweight(to_tsvector('portuguese', 'GISLENEISQUIERDO performance revisão'), 'A') ||
                   setweight(to_tsvector('portuguese', 'CTR CPC ROAS budget remarketing campanhas'), 'B') ||
                   setweight(to_tsvector('portuguese', 'satisfeita resultados proativa transparente configurar'), 'C')
WHERE id = '1fc731b0-3bf2-40fc-b41d-ffcdedb50282';

-- Atualizar a função de busca para melhorar a detecção de nomes de clientes
-- incluindo busca por nomes parciais e aliases
CREATE OR REPLACE FUNCTION public.buscar_transcricoes_reunioes(
  _user_id uuid,
  _query text DEFAULT NULL,
  _cliente_id uuid DEFAULT NULL,
  _data_inicio date DEFAULT NULL,
  _data_fim date DEFAULT NULL,
  _responsavel text DEFAULT NULL,
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
  relevancia real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _is_admin BOOLEAN;
  _user_client_id UUID;
  _extracted_client_name TEXT;
  _detected_client_id UUID;
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

  -- Tentar extrair nome do cliente da query se não foi fornecido cliente_id
  IF _cliente_id IS NULL AND _query IS NOT NULL THEN
    -- Detectar nomes de clientes na query
    SELECT c.id INTO _detected_client_id
    FROM clientes c
    WHERE 
      _query ILIKE '%' || c.nome || '%' OR
      _query ILIKE '%' || UPPER(c.nome) || '%' OR
      EXISTS (
        SELECT 1 FROM unnest(c.aliases) AS alias_name
        WHERE _query ILIKE '%' || alias_name || '%'
      )
    LIMIT 1;
    
    -- Se encontrou um cliente, usar esse ID
    IF _detected_client_id IS NOT NULL THEN
      _cliente_id := _detected_client_id;
    END IF;
  END IF;

  -- Buscar em gravações (incluindo anotações do Gemini)
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
      WHEN _query IS NOT NULL AND g.indexacao_busca IS NOT NULL THEN 
        ts_rank(g.indexacao_busca, plainto_tsquery('portuguese', _query))
      WHEN _query IS NOT NULL THEN
        -- Fallback para busca textual se não há indexação
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
    CASE 
      WHEN _query IS NOT NULL AND r.indexacao_busca IS NOT NULL THEN 
        ts_rank(r.indexacao_busca, plainto_tsquery('portuguese', _query))
      WHEN _query IS NOT NULL THEN
        -- Fallback para busca textual se não há indexação
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
    AND (_responsavel IS NULL OR r.titulo ILIKE '%' || _responsavel || '%' OR r.descricao ILIKE '%' || _responsavel || '%')
    AND (r.transcricao IS NOT NULL AND r.transcricao != '')
  
  ORDER BY relevancia DESC, data_reuniao DESC
  LIMIT _limit;
END;
$$;