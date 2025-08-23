-- Habilitar RLS na tabela master_emails
ALTER TABLE public.master_emails ENABLE ROW LEVEL SECURITY;

-- Criar política para que apenas admins vejam emails master
CREATE POLICY "Apenas admins podem ver emails master" ON public.master_emails
  FOR SELECT USING (
    public.is_admin_with_valid_reason(auth.uid())
  );

-- Criar política para que apenas admins possam inserir emails master
CREATE POLICY "Apenas admins podem inserir emails master" ON public.master_emails
  FOR INSERT WITH CHECK (
    public.is_admin_with_valid_reason(auth.uid())
  );

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