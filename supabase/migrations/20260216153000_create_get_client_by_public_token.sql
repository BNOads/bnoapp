-- Migration: create_get_client_by_public_token
-- Function to resolve public token to client_id securely

CREATE OR REPLACE FUNCTION get_client_by_public_token(token_input TEXT)
RETURNS TABLE (
  client_id UUID,
  client_nome TEXT,
  client_slug TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.nome as client_nome,
    c.slug as client_slug
  FROM client_public_panel cpp
  JOIN clientes c ON c.id = cpp.client_id
  WHERE cpp.public_token = token_input
  AND cpp.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to anon (public)
GRANT EXECUTE ON FUNCTION get_client_by_public_token(TEXT) TO anon, authenticated, service_role;
