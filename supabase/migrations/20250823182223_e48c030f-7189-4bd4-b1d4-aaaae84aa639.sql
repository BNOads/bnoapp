-- Adicionar campo aliases na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN aliases TEXT[] DEFAULT '{}';

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.clientes.aliases IS 'Variações do nome do cliente para facilitar busca (ex: JK para Jonas Kaz)';

-- Criar índice GIN para melhor performance na busca por aliases
CREATE INDEX idx_clientes_aliases ON public.clientes USING GIN(aliases);