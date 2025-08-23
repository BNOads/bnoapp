-- Primeiro, adicionar constraint único para user_id na tabela de permissões
ALTER TABLE public.permissoes_dados_sensíveis 
ADD CONSTRAINT unique_user_id UNIQUE (user_id);

-- Criar tabela para emails com acesso master automático
CREATE TABLE IF NOT EXISTS public.master_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir o email master
INSERT INTO public.master_emails (email) 
VALUES ('contato@jpconfins.com.br') 
ON CONFLICT (email) DO NOTHING;

-- Função simplificada para dar acesso master
CREATE OR REPLACE FUNCTION public.grant_master_access_to_email(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Buscar user_id pelo email na tabela auth.users
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;

  -- Se o usuário existe, dar acesso master
  IF _user_id IS NOT NULL THEN
    -- Atualizar perfil para admin
    UPDATE public.profiles 
    SET nivel_acesso = 'admin'
    WHERE user_id = _user_id;
    
    -- Atualizar colaborador para admin
    UPDATE public.colaboradores 
    SET nivel_acesso = 'admin'
    WHERE user_id = _user_id;
    
    -- Inserir ou atualizar permissão de administração
    INSERT INTO public.permissoes_dados_sensíveis (
      user_id,
      tipo_acesso,
      motivo,
      campos_permitidos,
      ativo
    ) VALUES (
      _user_id,
      'administracao'::public.tipo_acesso_dados,
      'Acesso master concedido para: ' || _email,
      ARRAY['todos'],
      true
    ) ON CONFLICT (user_id) DO UPDATE SET
      tipo_acesso = 'administracao'::public.tipo_acesso_dados,
      motivo = 'Acesso master concedido para: ' || _email,
      campos_permitidos = ARRAY['todos'],
      ativo = true;
      
    RAISE NOTICE 'Acesso master concedido para %', _email;
  ELSE
    RAISE NOTICE 'Usuário % ainda não se registrou. Acesso será aplicado automaticamente quando se registrar.', _email;
  END IF;
END;
$$;

-- Executar a função para o email especificado
SELECT public.grant_master_access_to_email('contato@jpconfins.com.br');