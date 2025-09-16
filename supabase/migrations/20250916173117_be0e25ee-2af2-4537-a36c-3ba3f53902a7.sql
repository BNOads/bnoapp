-- Criar tabela para mensagens semanais dos clientes
CREATE TABLE public.mensagens_semanais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  gestor_id UUID NOT NULL,
  cs_id UUID,
  semana_referencia DATE NOT NULL,
  mensagem TEXT NOT NULL,
  enviado BOOLEAN NOT NULL DEFAULT false,
  enviado_por UUID,
  enviado_em TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Garantir apenas uma mensagem por cliente por semana
  UNIQUE(cliente_id, semana_referencia)
);

-- Enable RLS
ALTER TABLE public.mensagens_semanais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Gestores podem gerenciar mensagens de seus clientes"
ON public.mensagens_semanais
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = mensagens_semanais.cliente_id
    AND (c.primary_gestor_user_id = auth.uid() OR c.primary_cs_user_id = auth.uid())
  )
  OR is_admin_with_valid_reason(auth.uid())
);

CREATE POLICY "CS pode marcar como enviado"
ON public.mensagens_semanais
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.nivel_acesso IN ('cs', 'admin')
    AND p.ativo = true
  )
);

CREATE POLICY "Usuários autenticados podem visualizar mensagens"
ON public.mensagens_semanais
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_mensagens_semanais_updated_at
BEFORE UPDATE ON public.mensagens_semanais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_mensagens_semanais_cliente_semana ON public.mensagens_semanais(cliente_id, semana_referencia);
CREATE INDEX idx_mensagens_semanais_gestor ON public.mensagens_semanais(gestor_id);
CREATE INDEX idx_mensagens_semanais_enviado ON public.mensagens_semanais(enviado);