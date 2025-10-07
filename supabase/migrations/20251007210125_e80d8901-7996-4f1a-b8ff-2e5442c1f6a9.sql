-- Adicionar campo de recorrência à tabela avisos
ALTER TABLE public.avisos 
ADD COLUMN IF NOT EXISTS recorrencia_tipo TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recorrencia_intervalo INTEGER DEFAULT NULL;

-- Comentar o tipo de recorrência permitido
COMMENT ON COLUMN public.avisos.recorrencia_tipo IS 'Tipo de recorrência: diaria, semanal, mensal, ou NULL para avisos únicos';
COMMENT ON COLUMN public.avisos.recorrencia_intervalo IS 'Intervalo em dias para recorrência (ex: 1 para diário, 7 para semanal, 30 para mensal)';

-- Criar índice para melhorar performance em buscas por avisos recorrentes
CREATE INDEX IF NOT EXISTS idx_avisos_recorrencia ON public.avisos(recorrencia_tipo, data_inicio) WHERE recorrencia_tipo IS NOT NULL;