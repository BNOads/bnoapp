-- Adicionar campo para URLs de dashboards do Looker Studio
ALTER TABLE public.clientes ADD COLUMN dashboards_looker JSONB DEFAULT '[]'::jsonb;