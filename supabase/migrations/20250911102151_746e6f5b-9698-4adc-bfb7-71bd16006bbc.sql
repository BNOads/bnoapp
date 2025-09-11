-- Adicionar coluna aulas_externas à tabela pdis
ALTER TABLE public.pdis 
ADD COLUMN aulas_externas JSONB DEFAULT '[]'::jsonb;