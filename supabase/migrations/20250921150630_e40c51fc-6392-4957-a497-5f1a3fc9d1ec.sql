-- Adicionar campo catalogo_criativos_url na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN catalogo_criativos_url TEXT NULL;