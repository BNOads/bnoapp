-- Função para gerar senha baseada no email
CREATE OR REPLACE FUNCTION generate_initial_password(email_input text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Retorna o próprio email como senha inicial
  RETURN email_input;
END;
$$;