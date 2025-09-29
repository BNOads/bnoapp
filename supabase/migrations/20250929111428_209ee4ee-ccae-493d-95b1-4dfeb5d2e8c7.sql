-- Adicionar campo active na tabela orcamentos_funil
ALTER TABLE public.orcamentos_funil 
ADD COLUMN active boolean NOT NULL DEFAULT true;

-- Criar índice para performance
CREATE INDEX idx_orcamentos_funil_active ON public.orcamentos_funil(active);

-- Criar tabela de auditoria para mudanças de status
CREATE TABLE public.orcamentos_funil_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos_funil(id) ON DELETE CASCADE,
  previous_status boolean,
  new_status boolean NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.orcamentos_funil_audit_log ENABLE ROW LEVEL SECURITY;

-- Política para visualizar logs de auditoria
CREATE POLICY "Usuarios autenticados podem ver logs de auditoria"
ON public.orcamentos_funil_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  )
);

-- Política para inserir logs de auditoria (sistema)
CREATE POLICY "Sistema pode inserir logs de auditoria"
ON public.orcamentos_funil_audit_log
FOR INSERT
WITH CHECK (true);

-- Trigger para registrar mudanças de status
CREATE OR REPLACE FUNCTION public.registrar_mudanca_status_orcamento_funil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.active != NEW.active THEN
    INSERT INTO public.orcamentos_funil_audit_log (
      orcamento_id,
      previous_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.active,
      NEW.active,
      auth.uid(),
      'Alteração de status via sistema'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela orcamentos_funil
CREATE TRIGGER trigger_audit_orcamento_funil_status
  BEFORE UPDATE ON public.orcamentos_funil
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_status_orcamento_funil();