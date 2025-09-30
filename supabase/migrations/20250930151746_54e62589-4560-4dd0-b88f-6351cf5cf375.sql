-- Normalize existing categorias and enforce new domain
-- 1) Drop old constraint if present
ALTER TABLE public.referencias_criativos 
DROP CONSTRAINT IF EXISTS referencias_criativos_categoria_check;

-- 2) Migrate existing data to new allowed values
UPDATE public.referencias_criativos
SET categoria = 'criativos'
WHERE categoria IS NULL 
   OR categoria IN ('infoproduto', 'negocio_local')
   OR categoria NOT IN ('criativos', 'pagina');

-- 3) Set default to a valid value
ALTER TABLE public.referencias_criativos 
ALTER COLUMN categoria SET DEFAULT 'criativos';

-- 4) Add new CHECK constraint (safe: add NOT VALID then validate)
ALTER TABLE public.referencias_criativos 
ADD CONSTRAINT referencias_criativos_categoria_check 
CHECK (categoria IN ('criativos', 'pagina')) NOT VALID;

ALTER TABLE public.referencias_criativos 
VALIDATE CONSTRAINT referencias_criativos_categoria_check;