-- Fix ambiguous column reference in extrair_titulos_reuniao function
CREATE OR REPLACE FUNCTION extrair_titulos_reuniao(conteudo TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  titulos TEXT[];
  current_line TEXT;
BEGIN
  -- Extrair títulos que começam com ##
  SELECT array_agg(
    trim(substring(current_line from '^##\s*(.+)$'))
  ) INTO titulos
  FROM unnest(string_to_array(conteudo, E'\n')) AS current_line
  WHERE current_line ~ '^##\s+.+';
  
  RETURN COALESCE(titulos, ARRAY[]::TEXT[]);
END;
$$;