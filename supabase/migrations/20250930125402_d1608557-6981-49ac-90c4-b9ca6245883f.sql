-- Adicionar campos de branding na tabela clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS branding_logo_url TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS branding_primary TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS branding_secondary TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS branding_bg TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS branding_description TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS branding_enabled BOOLEAN DEFAULT false;

-- Adicionar constraint para validar o tamanho do descritivo
ALTER TABLE public.clientes ADD CONSTRAINT branding_description_length CHECK (
  branding_description IS NULL OR length(branding_description) <= 500
);

-- Criar índice para otimizar consultas por branding ativo
CREATE INDEX IF NOT EXISTS idx_clientes_branding_enabled ON public.clientes(branding_enabled) WHERE branding_enabled = true;

COMMENT ON COLUMN public.clientes.branding_logo_url IS 'URL do logo personalizado (PNG/SVG)';
COMMENT ON COLUMN public.clientes.branding_primary IS 'Cor primária em formato HEX (#RRGGBB)';
COMMENT ON COLUMN public.clientes.branding_secondary IS 'Cor secundária em formato HEX (#RRGGBB)';
COMMENT ON COLUMN public.clientes.branding_bg IS 'Cor de fundo opcional em formato HEX (#RRGGBB)';
COMMENT ON COLUMN public.clientes.branding_description IS 'Descritivo do cliente (máx. 500 caracteres)';
COMMENT ON COLUMN public.clientes.branding_enabled IS 'Indica se o branding personalizado está ativo';