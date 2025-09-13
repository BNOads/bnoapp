-- Criar tabela para acessos e logins
CREATE TABLE public.acessos_logins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_acesso TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('redes_sociais', 'ferramentas_ads', 'plataforma_cursos', 'emails', 'outros')),
  login_usuario TEXT,
  senha_criptografada TEXT, -- Será criptografada no frontend antes de salvar
  link_acesso TEXT,
  notas_adicionais TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Habilitar RLS
ALTER TABLE public.acessos_logins ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem ver acessos"
ON public.acessos_logins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true
  )
);

CREATE POLICY "Admins podem criar acessos"
ON public.acessos_logins
FOR INSERT
WITH CHECK (
  auth.uid() = created_by 
  AND is_admin_with_valid_reason(auth.uid())
);

CREATE POLICY "Admins podem atualizar acessos"
ON public.acessos_logins
FOR UPDATE
USING (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Admins podem excluir acessos"
ON public.acessos_logins
FOR DELETE
USING (is_admin_with_valid_reason(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_acessos_logins_updated_at
  BEFORE UPDATE ON public.acessos_logins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();