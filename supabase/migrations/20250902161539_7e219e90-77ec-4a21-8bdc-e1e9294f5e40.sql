-- Adicionar campo categoria à tabela referencias_criativos
ALTER TABLE public.referencias_criativos 
ADD COLUMN categoria TEXT DEFAULT 'infoproduto' CHECK (categoria IN ('infoproduto', 'negocio_local'));