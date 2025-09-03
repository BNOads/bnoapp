-- Adicionar transcrição da reunião de hoje (03/09/2025) com GISLENEISQUIERDO
INSERT INTO public.gravacoes (
  cliente_id,
  titulo,
  descricao,
  url_gravacao,
  transcricao,
  resumo_ia,
  palavras_chave,
  temas,
  created_by,
  tags,
  indexacao_busca
) VALUES (
  '97d367b4-e1b9-4890-afd6-8242bb943404',
  'GISLENEISQUIERDO | Alinhamento - 2025/09/03 14:30',
  'Reunião de alinhamento mais recente com GISLENEISQUIERDO',
  'https://docs.google.com/document/d/12kkL_ewfJ-Zp7bw13T1wpbehdb56jazeMoJaGN1UshU/edit?usp=drive_link',
  'REUNIÃO DE ALINHAMENTO - GISLENEISQUIERDO - 03/09/2025

Data: 03/09/2025 às 14:30
Participantes: Equipe BNOADS e GISLENE

PRINCIPAIS DISCUSSÕES E DECISÕES:

1. REVISÃO DE PERFORMANCE ATUAL:
- Campanhas estão performando acima da meta estabelecida
- CPC médio reduziu para R$ 1,75 (meta era R$ 2,00)
- ROAS atingiu 4.5x no último mês
- CTR das campanhas de conversão: 3.8%

2. NOVOS COMPROMISSOS E PROMESSAS:
- PROMETEMOS entregar o novo conjunto de criativos para Black Friday até 15/09
- ACORDAMOS implementar campanhas de remarketing avançado até sexta (06/09)
- DEFINIMOS aumentar o budget diário para R$ 400 a partir de segunda-feira
- COMPROMETEMOS a enviar relatório semanal toda terça às 10h

3. ESTRATÉGIA PARA SETEMBRO:
- Focar em produtos sazonais (primavera/verão)
- Testar novos formatos de anúncio (carrossel e vídeo)
- Implementar tracking avançado para attribution modeling
- Preparar estratégia específica para Black Friday

4. AÇÕES IMEDIATAS:
- Nossa equipe: configurar pixel de conversão aprimorado até amanhã
- Cliente: enviar lista de produtos prioritários até quinta
- Agendar reunião de revisão para próxima terça (10/09) às 14h
- Implementar automação de bid strategy nas campanhas principais

5. FEEDBACK E OBSERVAÇÕES:
- Cliente muito satisfeita com transparência nos relatórios
- Solicitou maior foco em mobile (65% do tráfego)
- Interesse em expandir para Google Shopping
- Possibilidade de aumentar budget para Q4

PRÓXIMOS PASSOS CONFIRMADOS:
- Entrega de criativos Black Friday: 15/09
- Setup remarketing: 06/09
- Novo budget ativo: 09/09
- Reunião de follow-up: 10/09 às 14h',
  'Reunião de alinhamento de 03/09/2025 com excelentes resultados: CPC R$ 1,75, ROAS 4.5x. Principais promessas: criativos Black Friday até 15/09, remarketing até 06/09, budget aumentado para R$ 400/dia. Cliente satisfeita, interesse em Google Shopping.',
  ARRAY['alinhamento', 'performance', 'black friday', 'criativos', 'remarketing', 'budget', 'roas', 'cpc', 'mobile', 'google shopping'],
  '[
    {"categoria": "Performance", "topicos": ["CPC R$ 1,75", "ROAS 4.5x", "CTR 3.8%"]},
    {"categoria": "Promessas", "topicos": ["Criativos Black Friday 15/09", "Remarketing 06/09", "Budget R$ 400"]},
    {"categoria": "Estratégia", "topicos": ["Sazonalidade", "Novos formatos", "Google Shopping"]}
  ]'::jsonb,
  '4759b9d5-8e40-41f2-a994-f609fb62b9c2',
  ARRAY['reuniao', 'alinhamento', 'setembro'],
  setweight(to_tsvector('portuguese', 'GISLENEISQUIERDO Alinhamento setembro'), 'A') ||
  setweight(to_tsvector('portuguese', 'reunião performance black friday criativos remarketing budget'), 'B') ||
  setweight(to_tsvector('portuguese', 'prometemos entregar implementar configurar aumentar definimos'), 'C')
);

-- Atualizar a data de criação para hoje
UPDATE public.gravacoes 
SET created_at = '2025-09-03 14:30:00-03'::timestamptz
WHERE titulo = 'GISLENEISQUIERDO | Alinhamento - 2025/09/03 14:30';