-- Add date fields for Aquecimento and Lembrete phases
ALTER TABLE public.lancamentos 
ADD COLUMN data_inicio_aquecimento DATE,
ADD COLUMN data_fim_aquecimento DATE,
ADD COLUMN data_inicio_lembrete DATE,
ADD COLUMN data_fim_lembrete DATE;

-- Add helpful comments to the new columns
COMMENT ON COLUMN public.lancamentos.data_inicio_aquecimento IS 'Data de início da fase de aquecimento';
COMMENT ON COLUMN public.lancamentos.data_fim_aquecimento IS 'Data de fim da fase de aquecimento';
COMMENT ON COLUMN public.lancamentos.data_inicio_lembrete IS 'Data de início da fase de lembrete';
COMMENT ON COLUMN public.lancamentos.data_fim_lembrete IS 'Data de fim da fase de lembrete';