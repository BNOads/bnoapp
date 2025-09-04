-- Adicionar coluna cliente_id na tabela lancamentos
ALTER TABLE public.lancamentos 
ADD COLUMN cliente_id uuid REFERENCES public.clientes(id);

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_lancamentos_cliente_id ON public.lancamentos(cliente_id);

-- Comentário explicativo
COMMENT ON COLUMN public.lancamentos.cliente_id IS 'Referência ao cliente associado ao lançamento';