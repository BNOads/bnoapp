-- Fix ambiguous variable/alias in extrair_titulos_reuniao
CREATE OR REPLACE FUNCTION public.extrair_titulos_reuniao(conteudo text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  titulos TEXT[];
BEGIN
  -- Extract headings that start with ## from the provided content
  -- Use table alias and column name to avoid ambiguity with PL/pgSQL variables
  SELECT array_agg(trim(substring(t.line_text from '^##\s*(.+)$')))
  INTO titulos
  FROM (
    SELECT unnest(string_to_array(conteudo, E'\n')) AS line_text
  ) AS t
  WHERE t.line_text ~ '^##\s+.+';

  RETURN COALESCE(titulos, ARRAY[]::TEXT[]);
END;
$function$;