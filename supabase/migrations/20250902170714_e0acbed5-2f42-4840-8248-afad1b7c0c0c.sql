-- Adicionar campos de observação e nomenclatura do tráfego na tabela creatives
ALTER TABLE public.creatives 
ADD COLUMN observacao_personalizada TEXT,
ADD COLUMN nomenclatura_trafego TEXT;