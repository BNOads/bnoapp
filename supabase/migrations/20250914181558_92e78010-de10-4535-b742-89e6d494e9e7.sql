-- Adicionar campos para dados de pesquisa e outras fontes de tráfego na tabela debriefings
ALTER TABLE public.debriefings 
ADD COLUMN dados_pesquisa jsonb DEFAULT '[]'::jsonb,
ADD COLUMN dados_outras_fontes jsonb DEFAULT '[]'::jsonb;