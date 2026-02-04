-- Migration: Create client_field_options table for managing dropdown options
CREATE TABLE IF NOT EXISTS public.client_field_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key TEXT NOT NULL, -- 'situacao_cliente', 'etapa_onboarding', 'etapa_trafego'
  option_key TEXT NOT NULL,
  option_label TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280', -- hex color
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(field_key, option_key)
);

-- Seed defaults for Situação do Cliente
INSERT INTO public.client_field_options (field_key, option_key, option_label, color, sort_order)
VALUES
  ('situacao_cliente', 'nao_iniciado', 'Não Iniciado', '#6B7280', 1),
  ('situacao_cliente', 'alerta', 'Alerta', '#EF4444', 2),
  ('situacao_cliente', 'ponto_de_atencao', 'Ponto de Atenção', '#FBBF24', 3),
  ('situacao_cliente', 'resultados_normais', 'Resultados Normais', '#3B82F6', 4),
  ('situacao_cliente', 'indo_bem', 'Indo bem', '#10B981', 5)
ON CONFLICT (field_key, option_key) DO NOTHING;

-- Seed defaults for Etapa Onboarding
INSERT INTO public.client_field_options (field_key, option_key, option_label, color, sort_order)
VALUES
  ('etapa_onboarding', 'onboarding', 'Onboarding', '#F97316', 1),
  ('etapa_onboarding', 'ongoing', 'Ongoing', '#10B981', 2),
  ('etapa_onboarding', 'pausa_temporaria', 'Pausa Temporária', '#EF4444', 3)
ON CONFLICT (field_key, option_key) DO NOTHING;

-- Seed defaults for Etapa Tráfego
INSERT INTO public.client_field_options (field_key, option_key, option_label, color, sort_order)
VALUES
  ('etapa_trafego', 'estrategia', 'Estratégia', '#6B7280', 1),
  ('etapa_trafego', 'distribuicao_criativos', 'Distribuição de Criativos', '#3B82F6', 2),
  ('etapa_trafego', 'conversao_iniciada', 'Conversão Iniciada', '#FBBF24', 3),
  ('etapa_trafego', 'voo_de_cruzeiro', 'Voo de Cruzeiro', '#10B981', 4),
  ('etapa_trafego', 'campanhas_pausadas', 'Campanhas Pausadas', '#EF4444', 5)
ON CONFLICT (field_key, option_key) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_field_options_field_key ON public.client_field_options(field_key);
CREATE INDEX IF NOT EXISTS idx_client_field_options_sort ON public.client_field_options(field_key, sort_order);

-- Trigger for updated_at
CREATE TRIGGER update_client_field_options_updated_at BEFORE UPDATE ON public.client_field_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
