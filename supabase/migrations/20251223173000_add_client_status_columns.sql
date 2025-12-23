-- Adicionar novas colunas de status na tabela de clientes

-- Situação do Cliente: nao_iniciado, alerta, ponto_de_atencao, resultados_normais, indo_bem
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS situacao_cliente TEXT DEFAULT 'nao_iniciado';

-- Etapa Onboarding: onboarding, ongoing, pausa_temporaria
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS etapa_onboarding TEXT DEFAULT 'onboarding';

-- Etapas de Tráfego: estrategia, distribuicao_criativos, conversao_iniciada, voo_de_cruzeiro, campanhas_pausadas
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS etapa_trafego TEXT DEFAULT 'estrategia';

-- Comentários explicando os valores possíveis
COMMENT ON COLUMN public.clientes.situacao_cliente IS 'Status da situação do cliente: nao_iniciado, alerta, ponto_de_atencao, resultados_normais, indo_bem';
COMMENT ON COLUMN public.clientes.etapa_onboarding IS 'Etapa de onboarding: onboarding, ongoing, pausa_temporaria';
COMMENT ON COLUMN public.clientes.etapa_trafego IS 'Etapa de tráfego: estrategia, distribuicao_criativos, conversao_iniciada, voo_de_cruzeiro, campanhas_pausadas';
