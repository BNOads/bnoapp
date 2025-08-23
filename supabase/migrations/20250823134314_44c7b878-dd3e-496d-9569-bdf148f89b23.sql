-- Habilitar RLS na tabela master_emails
ALTER TABLE public.master_emails ENABLE ROW LEVEL SECURITY;

-- Criar política para que apenas admins possam ver e gerenciar emails master
CREATE POLICY "Apenas admins podem gerenciar emails master" ON public.master_emails
  FOR ALL USING (
    public.is_admin_with_valid_reason(auth.uid())
  );