-- Corrigir funções com search_path inseguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Corrigir função para gerar link do painel
CREATE OR REPLACE FUNCTION public.generate_painel_link()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.link_painel IS NULL THEN
    NEW.link_painel = 'https://app.bnoads.com/painel/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$$;