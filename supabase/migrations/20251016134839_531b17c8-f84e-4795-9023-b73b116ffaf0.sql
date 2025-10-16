-- Adicionar coluna link_externo na tabela referencias_criativos
ALTER TABLE public.referencias_criativos 
ADD COLUMN IF NOT EXISTS link_externo TEXT;