-- Atualizar as funções que geram links para usar domínio dinâmico

-- Função para gerar link do painel do cliente
CREATE OR REPLACE FUNCTION public.generate_painel_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.link_painel IS NULL THEN
    -- Usar um domínio genérico que será substituído no frontend
    NEW.link_painel = '/painel/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Função para gerar link público de referências
CREATE OR REPLACE FUNCTION public.generate_public_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.link_publico IS NULL THEN
    -- Usar um caminho relativo que será construído no frontend
    NEW.link_publico = '/referencia/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Função para gerar link público de POPs
CREATE OR REPLACE FUNCTION public.generate_pop_public_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.link_publico IS NULL AND NEW.categoria_documento = 'pop' THEN
    -- Usar um caminho relativo que será construído no frontend
    NEW.link_publico = '/pop/publico/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;