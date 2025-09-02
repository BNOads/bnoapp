-- Atualizar a coluna categoria para incluir a nova opção "pagina"
ALTER TABLE public.referencias_criativos 
DROP CONSTRAINT IF EXISTS referencias_criativos_categoria_check;

ALTER TABLE public.referencias_criativos 
ADD CONSTRAINT referencias_criativos_categoria_check 
CHECK (categoria IN ('infoproduto', 'negocio_local', 'pagina'));