-- Migration: Create client_categories table
CREATE TABLE IF NOT EXISTS public.client_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280', -- default gray
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed defaults
INSERT INTO public.client_categories (key, label, color, sort_order)
VALUES
  ('negocio_local', 'Negócio Local', '#10B981', 1)
  ON CONFLICT (key) DO NOTHING;

INSERT INTO public.client_categories (key, label, color, sort_order)
VALUES
  ('infoproduto', 'Infoproduto', '#3B82F6', 2)
  ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_categories_updated_at BEFORE UPDATE ON public.client_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
