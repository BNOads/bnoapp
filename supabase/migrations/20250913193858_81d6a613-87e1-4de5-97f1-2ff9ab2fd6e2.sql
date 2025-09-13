-- Add new columns to orcamentos_funil table for enhanced functionality
ALTER TABLE public.orcamentos_funil 
ADD COLUMN IF NOT EXISTS etapa_funil TEXT DEFAULT 'captacao',
ADD COLUMN IF NOT EXISTS periodo_mes INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
ADD COLUMN IF NOT EXISTS periodo_ano INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
ADD COLUMN IF NOT EXISTS valor_gasto NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status_orcamento TEXT DEFAULT 'ativo';

-- Create enum for funnel stages if it doesn't exist
DO $$ BEGIN
    CREATE TYPE etapa_funil_enum AS ENUM ('captacao', 'cpl', 'vendas', 'remarketing', 'email_marketing', 'upsell');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for budget status if it doesn't exist  
DO $$ BEGIN
    CREATE TYPE status_orcamento_enum AS ENUM ('ativo', 'pausado', 'concluido', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the table to use the new enums (optional, can keep as text for flexibility)
-- ALTER TABLE public.orcamentos_funil 
-- ALTER COLUMN etapa_funil TYPE etapa_funil_enum USING etapa_funil::etapa_funil_enum,
-- ALTER COLUMN status_orcamento TYPE status_orcamento_enum USING status_orcamento::status_orcamento_enum;

-- Create index for better performance on period queries
CREATE INDEX IF NOT EXISTS idx_orcamentos_funil_periodo ON public.orcamentos_funil(periodo_ano, periodo_mes);
CREATE INDEX IF NOT EXISTS idx_orcamentos_funil_etapa ON public.orcamentos_funil(etapa_funil);
CREATE INDEX IF NOT EXISTS idx_orcamentos_funil_status ON public.orcamentos_funil(status_orcamento);