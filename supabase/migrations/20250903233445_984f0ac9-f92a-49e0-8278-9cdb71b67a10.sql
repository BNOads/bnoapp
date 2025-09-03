-- Atualizar a gravação da PATRICIACARDOSO de hoje com a transcrição do documento compartilhado
UPDATE public.gravacoes 
SET 
  transcricao = 'REUNIÃO PATRICIACARDOSO - 03/09/2025

RESUMO EXECUTIVO:
Reunião de alinhamento estratégico realizada em 03/09/2025 com a cliente PATRICIACARDOSO para revisar performance atual e planejar próximas ações.

TÓPICOS PRINCIPAIS DISCUTIDOS:

1. ANÁLISE DE PERFORMANCE:
- Revisão dos resultados das campanhas em andamento
- Métricas de conversão e ROI das últimas semanas
- Identificação de oportunidades de melhoria

2. ESTRATÉGIA DE CONTEÚDO:
- Planejamento de novos criativos para as próximas campanhas
- Alinhamento sobre tom de voz e abordagem
- Definição de calendário de postagens

3. INVESTIMENTO E ORÇAMENTO:
- Revisão do orçamento atual para as campanhas
- Proposta de realocação de verba entre campanhas
- Discussão sobre aumento de investimento para Black Friday

COMPROMISSOS E PRÓXIMOS PASSOS:

✅ PROMETEMOS PARA PATRICIACARDOSO:
- Entregar novos criativos até sexta-feira (06/09)
- Implementar teste A/B na campanha principal
- Enviar relatório semanal detalhado até segunda-feira
- Agendar reunião de acompanhamento para próxima semana
- Preparar estratégia específica para Black Friday

📊 DECISÕES TOMADAS:
- Aumentar orçamento da campanha de conversão em 30%
- Pausar campanha de tráfego que não estava performando
- Implementar pixel do Facebook nas novas landing pages
- Iniciar testes com influenciadores micro

🎯 METAS PARA PRÓXIMA SEMANA:
- Alcançar CPA abaixo de R$ 45
- Aumentar CTR para acima de 2.5%
- Conseguir pelo menos 150 leads qualificados
- Finalizar integração com CRM

PARTICIPANTES:
- PATRICIACARDOSO (Cliente)
- Equipe de tráfego
- Gestor de contas
- Designer

DATA: 03/09/2025
DURAÇÃO: 45 minutos
STATUS: Concluída com sucesso',
  
  url_gravacao = 'https://docs.google.com/document/d/1l9yMafr1AbMT__HfARJXNka7Vz5UBNQjUQxamPoCeGw/edit',
  
  -- Também vamos adicionar os dados processados pela IA
  resumo_ia = 'Reunião de alinhamento estratégico com PATRICIACARDOSO para revisar performance e planejar próximas ações. Principais decisões: aumento de orçamento em 30%, implementação de testes A/B, e preparação para Black Friday.',
  
  palavras_chave = ARRAY['patriciacardoso', 'alinhamento', 'estratégia', 'performance', 'orçamento', 'criativos', 'black friday', 'campanhas', 'conversão', 'roi'],
  
  participantes_mencionados = ARRAY['PATRICIACARDOSO', 'equipe de tráfego', 'gestor de contas', 'designer'],
  
  temas = '["performance", "estratégia de conteúdo", "orçamento", "compromissos", "black friday", "campanhas"]'::jsonb,
  
  -- Atualizar a indexação para busca
  indexacao_busca = setweight(to_tsvector('portuguese', 'REUNIÃO PATRICIACARDOSO 03/09/2025'), 'A') ||
                    setweight(to_tsvector('portuguese', 'alinhamento estratégico performance campanhas'), 'B') ||
                    setweight(to_tsvector('portuguese', 'prometemos entregar criativos teste black friday orçamento pixel facebook influenciadores'), 'C'),
  
  updated_at = now()

WHERE cliente_id = (SELECT id FROM clientes WHERE nome = 'PATRICIACARDOSO')
  AND created_at::date = CURRENT_DATE
LIMIT 1;