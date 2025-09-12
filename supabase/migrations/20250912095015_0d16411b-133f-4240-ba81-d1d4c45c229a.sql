-- Add destination page column to creatives table
ALTER TABLE public.creatives 
ADD COLUMN pagina_destino text;

COMMENT ON COLUMN public.creatives.pagina_destino IS 'URL da página de destino/landing page do criativo';