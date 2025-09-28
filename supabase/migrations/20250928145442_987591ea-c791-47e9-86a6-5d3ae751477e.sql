-- Adicionar campo funnel_status na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN funnel_status boolean NOT NULL DEFAULT true;

-- Criar tabela para auditoria de mudanças de status do funil
CREATE TABLE public.funnel_status_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  old_status boolean,
  new_status boolean NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funnel_status_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas para o audit log
CREATE POLICY "Admins podem ver logs de auditoria"
ON public.funnel_status_audit_log
FOR SELECT
USING (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Sistema pode inserir logs"
ON public.funnel_status_audit_log
FOR INSERT
WITH CHECK (true);