-- Adicionar foreign keys para traffic_manager_id e cs_id na tabela clientes
ALTER TABLE public.clientes 
ADD CONSTRAINT fk_clientes_traffic_manager 
FOREIGN KEY (traffic_manager_id) 
REFERENCES public.colaboradores(id) 
ON DELETE SET NULL;

ALTER TABLE public.clientes 
ADD CONSTRAINT fk_clientes_cs 
FOREIGN KEY (cs_id) 
REFERENCES public.colaboradores(id) 
ON DELETE SET NULL;

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_clientes_traffic_manager_id 
ON public.clientes(traffic_manager_id);

CREATE INDEX IF NOT EXISTS idx_clientes_cs_id 
ON public.clientes(cs_id);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.clientes.traffic_manager_id IS 'ID do colaborador responsável pelo tráfego do cliente';
COMMENT ON COLUMN public.clientes.cs_id IS 'ID do colaborador responsável pelo customer success do cliente';