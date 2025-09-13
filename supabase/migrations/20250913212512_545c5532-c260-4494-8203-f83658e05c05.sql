-- Criar tabelas para a ferramenta UTM Builder

-- Tabela para armazenar presets de UTM
CREATE TABLE public.utm_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar histórico de URLs geradas
CREATE TABLE public.utm_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.utm_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_history ENABLE ROW LEVEL SECURITY;

-- Políticas para utm_presets
CREATE POLICY "Usuários podem ver seus próprios presets e globais"
ON public.utm_presets
FOR SELECT
USING (created_by = auth.uid() OR is_global = true);

CREATE POLICY "Usuários podem criar seus próprios presets"
ON public.utm_presets
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Usuários podem atualizar seus próprios presets"
ON public.utm_presets
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Usuários podem deletar seus próprios presets"
ON public.utm_presets
FOR DELETE
USING (created_by = auth.uid());

CREATE POLICY "Admins podem gerenciar presets globais"
ON public.utm_presets
FOR ALL
USING (is_admin_with_valid_reason(auth.uid()));

-- Políticas para utm_history
CREATE POLICY "Usuários podem ver seu próprio histórico"
ON public.utm_history
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Usuários podem criar no seu histórico"
ON public.utm_history
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Usuários podem deletar seu próprio histórico"
ON public.utm_history
FOR DELETE
USING (created_by = auth.uid());

-- Admins podem ver todo o histórico
CREATE POLICY "Admins podem ver todo histórico"
ON public.utm_history
FOR SELECT
USING (is_admin_with_valid_reason(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_utm_presets_updated_at
BEFORE UPDATE ON public.utm_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_utm_presets_created_by ON public.utm_presets(created_by);
CREATE INDEX idx_utm_presets_is_global ON public.utm_presets(is_global);
CREATE INDEX idx_utm_history_created_by ON public.utm_history(created_by);
CREATE INDEX idx_utm_history_created_at ON public.utm_history(created_at DESC);