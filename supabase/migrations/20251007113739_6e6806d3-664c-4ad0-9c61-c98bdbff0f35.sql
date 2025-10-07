-- Adicionar índices para otimizar queries de mensagens semanais

-- Índice principal para filtrar por created_at (usado no novo filtro por semana)
CREATE INDEX IF NOT EXISTS idx_mensagens_created_at
ON public.mensagens_semanais (created_at DESC);

-- Índice composto para filtrar por cliente e created_at
CREATE INDEX IF NOT EXISTS idx_mensagens_cliente_created
ON public.mensagens_semanais (cliente_id, created_at DESC);

-- Índice composto para filtrar por gestor e created_at  
CREATE INDEX IF NOT EXISTS idx_mensagens_gestor_created
ON public.mensagens_semanais (gestor_id, created_at DESC);

-- Índice composto para filtrar por status de envio e created_at
CREATE INDEX IF NOT EXISTS idx_mensagens_enviado_created
ON public.mensagens_semanais (enviado, created_at DESC);