-- Fix ambiguous column reference in extrair_titulos_reuniao function
CREATE OR REPLACE FUNCTION extrair_titulos_reuniao(conteudo TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  titulos TEXT[];
  line_text TEXT;
BEGIN
  -- Extrair títulos que começam com ##
  SELECT array_agg(
    trim(substring(line_text from '^##\s*(.+)$'))
  ) INTO titulos
  FROM unnest(string_to_array(conteudo, E'\n')) AS line_text
  WHERE line_text ~ '^##\s+.+';
  
  RETURN COALESCE(titulos, ARRAY[]::TEXT[]);
END;
$$;