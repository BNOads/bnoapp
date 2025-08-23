-- Função para aplicar permissões de admin automaticamente para colaboradores
CREATE OR REPLACE FUNCTION public.handle_master_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o usuário é admin, dar permissões completas
  IF NEW.nivel_acesso = 'admin' THEN
    INSERT INTO public.permissoes_dados_sensíveis (
      user_id,
      tipo_acesso,
      motivo,
      campos_permitidos,
      ativo
    ) VALUES (
      NEW.user_id,
      'administracao'::public.tipo_acesso_dados,
      'Permissão automática para administrador',
      ARRAY['todos'],
      true
    ) ON CONFLICT (user_id) DO UPDATE SET
      tipo_acesso = 'administracao'::public.tipo_acesso_dados,
      motivo = 'Permissão automática para administrador',
      campos_permitidos = ARRAY['todos'],
      ativo = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para aplicar permissões de admin automaticamente
CREATE TRIGGER handle_master_permissions_colaboradores
  AFTER INSERT ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.handle_master_user_permissions();