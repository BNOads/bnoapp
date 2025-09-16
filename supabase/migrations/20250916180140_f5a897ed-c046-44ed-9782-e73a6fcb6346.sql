-- Adicionar campos de histórico de envio
ALTER TABLE public.mensagens_semanais 
ADD COLUMN IF NOT EXISTS enviado_gestor_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS enviado_cs_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS historico_envios jsonb DEFAULT '[]'::jsonb;

-- Comentários para documentar os campos
COMMENT ON COLUMN public.mensagens_semanais.enviado_gestor_em IS 'Data/hora em que o gestor enviou a mensagem';
COMMENT ON COLUMN public.mensagens_semanais.enviado_cs_em IS 'Data/hora em que a CS enviou a mensagem ao cliente';
COMMENT ON COLUMN public.mensagens_semanais.historico_envios IS 'Histórico completo de envios e ações na mensagem';