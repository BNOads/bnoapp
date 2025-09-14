-- Adicionar campos para cálculo de verbas no lançamento
ALTER TABLE public.lancamentos 
ADD COLUMN IF NOT EXISTS verba_por_fase jsonb DEFAULT '{
  "captacao": {"percentual": 40, "dias": 0},
  "evento": {"percentual": 30, "dias": 0},
  "lembrete": {"percentual": 10, "dias": 0},
  "aquecimento": {"percentual": 10, "dias": 0},
  "impulsionar": {"percentual": 5, "dias": 0},
  "venda": {"percentual": 5, "dias": 0}
}'::jsonb;

ALTER TABLE public.lancamentos 
ADD COLUMN IF NOT EXISTS distribuicao_canais jsonb DEFAULT '{
  "meta_ads": {"percentual": 70},
  "google_ads": {"percentual": 20},
  "outras_fontes": {"percentual": 10}
}'::jsonb;

ALTER TABLE public.lancamentos 
ADD COLUMN IF NOT EXISTS observacoes_verbas text DEFAULT NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_verba_fase ON public.lancamentos USING GIN (verba_por_fase);
CREATE INDEX IF NOT EXISTS idx_lancamentos_distribuicao_canais ON public.lancamentos USING GIN (distribuicao_canais);