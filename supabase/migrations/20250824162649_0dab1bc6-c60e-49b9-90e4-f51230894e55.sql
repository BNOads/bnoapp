-- Adicionar campos de alocação na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS traffic_manager_id uuid REFERENCES public.colaboradores(id),
ADD COLUMN IF NOT EXISTS cs_id uuid REFERENCES public.colaboradores(id),
ADD COLUMN IF NOT EXISTS data_inicio date DEFAULT CURRENT_DATE;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clientes_traffic_manager ON public.clientes(traffic_manager_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cs ON public.clientes(cs_id);

-- Comentários para documentação
COMMENT ON COLUMN public.clientes.traffic_manager_id IS 'ID do gestor de tráfego responsável pelo cliente';
COMMENT ON COLUMN public.clientes.cs_id IS 'ID do customer success responsável pelo cliente';
COMMENT ON COLUMN public.clientes.data_inicio IS 'Data de início do relacionamento com o cliente';