-- Adicionar coluna serie na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS serie TEXT DEFAULT 'Serie A';

-- Atualizar clientes existentes sem série para Serie A
UPDATE public.clientes 
SET serie = 'Serie A' 
WHERE serie IS NULL;

-- Adicionar índice para melhorar performance nas queries
CREATE INDEX IF NOT EXISTS idx_clientes_serie ON public.clientes(serie);