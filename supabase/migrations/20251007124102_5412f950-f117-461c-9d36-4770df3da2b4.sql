-- Atualizar a função generate_painel_link para usar slug
CREATE OR REPLACE FUNCTION public.generate_painel_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Usar o slug se disponível, senão usar o ID
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    NEW.link_painel = '/painel/' || NEW.slug;
  ELSE
    NEW.link_painel = '/painel/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Atualizar links dos clientes existentes para usar slug
UPDATE public.clientes
SET link_painel = '/painel/' || slug
WHERE slug IS NOT NULL AND slug != '';