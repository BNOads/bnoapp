-- Função para dar acesso master a um email específico
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

  -- Se o usuário existe
  IF _user_id IS NOT NULL THEN
    -- Atualizar perfil para admin
    UPDATE public.profiles 
    SET nivel_acesso = 'admin'
    WHERE user_id = _user_id;
    
    -- Atualizar colaborador para admin
    UPDATE public.colaboradores 
    SET nivel_acesso = 'admin'
    WHERE user_id = _user_id;
    
    -- Dar permissão de administração completa
    INSERT INTO public.permissoes_dados_sensíveis (
      user_id,
      tipo_acesso,
      motivo,
      campos_permitidos,
      ativo
    ) VALUES (
      _user_id,
      'administracao'::public.tipo_acesso_dados,
      'Acesso master concedido',
      ARRAY['todos'],
      true
    ) ON CONFLICT (user_id) DO UPDATE SET
      tipo_acesso = 'administracao'::public.tipo_acesso_dados,
      motivo = 'Acesso master concedido',
      campos_permitidos = ARRAY['todos'],
      ativo = true;
      
    RAISE NOTICE 'Acesso master concedido para %', _email;
  ELSE
    RAISE NOTICE 'Usuário % não encontrado. Será configurado automaticamente quando se registrar.', _email;
  END IF;
END;
$$;

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

-- Função para aplicar acesso master automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.check_and_apply_master_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o email está na lista de emails master
  IF EXISTS (SELECT 1 FROM public.master_emails WHERE email = NEW.email) THEN
    -- Atualizar para admin
    NEW.nivel_acesso = 'admin';
    
    -- Inserir permissão de administração (será feito após o insert)
    PERFORM pg_notify('master_access_needed', NEW.user_id::text || ',' || NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela profiles
CREATE TRIGGER check_master_access_profiles
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_and_apply_master_access();

-- Aplicar trigger na tabela colaboradores  
CREATE TRIGGER check_master_access_colaboradores
  BEFORE INSERT ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.check_and_apply_master_access();

-- Função para processar notificações de acesso master
CREATE OR REPLACE FUNCTION public.process_master_access_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_data text[];
  _user_id uuid;
  _email text;
BEGIN
  -- Parse da notificação
  notification_data := string_to_array(NEW.email, ',');
  _user_id := notification_data[1]::uuid;
  _email := notification_data[2];
  
  -- Dar permissão de administração completa
  INSERT INTO public.permissoes_dados_sensíveis (
    user_id,
    tipo_acesso,
    motivo,
    campos_permitidos,
    ativo
  ) VALUES (
    _user_id,
    'administracao'::public.tipo_acesso_dados,
    'Acesso master automático para: ' || _email,
    ARRAY['todos'],
    true
  ) ON CONFLICT (user_id) DO UPDATE SET
    tipo_acesso = 'administracao'::public.tipo_acesso_dados,
    motivo = 'Acesso master automático para: ' || _email,
    campos_permitidos = ARRAY['todos'],
    ativo = true;
    
  RETURN NEW;
END;
$$;

-- Aplicar acesso master para o email especificado (se já existir)
SELECT public.grant_master_access_to_email('contato@jpconfins.com.br');

-- Garantir que admins tenham todas as permissões necessárias
DO $$
DECLARE
  admin_user RECORD;
BEGIN
  FOR admin_user IN 
    SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin'
  LOOP
    INSERT INTO public.permissoes_dados_sensíveis (
      user_id,
      tipo_acesso,
      motivo,
      campos_permitidos,
      ativo
    ) VALUES (
      admin_user.user_id,
      'administracao'::public.tipo_acesso_dados,
      'Permissão de administração completa',
      ARRAY['todos'],
      true
    ) ON CONFLICT (user_id) DO UPDATE SET
      tipo_acesso = 'administracao'::public.tipo_acesso_dados,
      motivo = 'Permissão de administração completa',
      campos_permitidos = ARRAY['todos'],
      ativo = true;
  END LOOP;
END $$;