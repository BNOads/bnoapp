-- Permitir que cliente_id seja NULL para referências gerais
ALTER TABLE public.referencias_criativos 
ALTER COLUMN cliente_id DROP NOT NULL;