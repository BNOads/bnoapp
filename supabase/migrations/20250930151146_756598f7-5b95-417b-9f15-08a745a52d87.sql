-- Adicionar coluna link_url à tabela referencias_criativos
ALTER TABLE public.referencias_criativos 
ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Adicionar comentário para documentar a coluna
COMMENT ON COLUMN public.referencias_criativos.link_url IS 'URL externa associada à referência';

-- Criar índice para melhorar performance de buscas por URL
CREATE INDEX IF NOT EXISTS idx_referencias_criativos_link_url 
ON public.referencias_criativos(link_url) 
WHERE link_url IS NOT NULL;