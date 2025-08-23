-- Função para criar perfis para usuários existentes que não têm perfil
DO $$
DECLARE
  user_record RECORD;
  is_master BOOLEAN;
BEGIN
  -- Para cada usuário sem perfil, criar perfil automaticamente
  FOR user_record IN 
    SELECT u.id, u.email, u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.user_id
    WHERE p.user_id IS NULL
  LOOP
    -- Verificar se é email master
    SELECT EXISTS(SELECT 1 FROM public.master_emails WHERE email = user_record.email) INTO is_master;
    
    -- Criar perfil
    INSERT INTO public.profiles (
      user_id, 
      nome, 
      email, 
      nivel_acesso, 
      ativo
    ) VALUES (
      user_record.id,
      COALESCE(split_part(user_record.email, '@', 1), 'Usuário'),
      user_record.email,
      CASE WHEN is_master THEN 'admin'::public.nivel_acesso ELSE 'cs'::public.nivel_acesso END,
      true
    );
    
    -- Criar colaborador
    INSERT INTO public.colaboradores (
      user_id,
      nome,
      email,
      nivel_acesso,
      ativo
    ) VALUES (
      user_record.id,
      COALESCE(split_part(user_record.email, '@', 1), 'Usuário'),
      user_record.email,
      CASE WHEN is_master THEN 'admin'::public.nivel_acesso ELSE 'cs'::public.nivel_acesso END,
      true
    );
    
    -- Se for master, dar permissões completas
    IF is_master THEN
      INSERT INTO public.permissoes_dados_sensíveis (
        user_id,
        tipo_acesso,
        motivo,
        campos_permitidos,
        ativo
      ) VALUES (
        user_record.id,
        'administracao'::public.tipo_acesso_dados,
        'Acesso master automático para: ' || user_record.email,
        ARRAY['todos'],
        true
      );
    END IF;
    
    RAISE NOTICE 'Perfil criado para %', user_record.email;
  END LOOP;
END $$;

-- Atualizar função para aplicar acesso master automaticamente
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
    
    -- Garantir que vai ter permissões após insert
    PERFORM pg_notify('grant_admin_permissions', NEW.user_id::text);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Função para processar notificações de permissões admin
CREATE OR REPLACE FUNCTION public.process_admin_permissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_record RECORD;
BEGIN
  -- Buscar usuários que precisam de permissões admin
  FOR notification_record IN
    SELECT p.user_id, p.email
    FROM public.profiles p
    WHERE p.nivel_acesso = 'admin'
      AND NOT EXISTS (
        SELECT 1 FROM public.permissoes_dados_sensíveis pds
        WHERE pds.user_id = p.user_id
      )
  LOOP
    INSERT INTO public.permissoes_dados_sensíveis (
      user_id,
      tipo_acesso,
      motivo,
      campos_permitidos,
      ativo
    ) VALUES (
      notification_record.user_id,
      'administracao'::public.tipo_acesso_dados,
      'Permissão admin automática para: ' || notification_record.email,
      ARRAY['todos'],
      true
    );
  END LOOP;
END;
$$;

-- Executar função para garantir permissões
SELECT public.process_admin_permissions();