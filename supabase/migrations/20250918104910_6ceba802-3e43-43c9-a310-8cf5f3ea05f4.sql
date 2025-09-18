-- Adicionar campo faturamento_bruto aos debriefings
ALTER TABLE public.debriefings 
ADD COLUMN IF NOT EXISTS faturamento_bruto numeric DEFAULT NULL;

-- Adicionar campos para controle de painéis excluídos
ALTER TABLE public.debriefings 
ADD COLUMN IF NOT EXISTS paineis_excluidos jsonb DEFAULT '[]'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.debriefings.faturamento_bruto IS 
'Faturamento bruto inserido manualmente para diferir do faturamento líquido';

COMMENT ON COLUMN public.debriefings.paineis_excluidos IS 
'Array com IDs dos painéis que foram excluídos pelo usuário';