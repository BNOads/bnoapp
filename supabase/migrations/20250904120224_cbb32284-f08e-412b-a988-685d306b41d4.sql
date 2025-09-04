-- Adicionar coluna para controlar primeiro login
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primeiro_login boolean DEFAULT true;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS primeiro_login boolean DEFAULT true;

-- Criar tabela para tokens de recuperação de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas para tokens de recuperação
CREATE POLICY "Apenas o sistema pode gerenciar tokens de reset" 
ON password_reset_tokens FOR ALL 
USING (false);

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