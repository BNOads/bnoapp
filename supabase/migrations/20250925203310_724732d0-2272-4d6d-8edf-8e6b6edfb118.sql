-- Criar tabelas para métricas de tráfego e overrides do debriefing

-- Tabela para cache de métricas consolidadas do período
CREATE TABLE IF NOT EXISTS public.debrief_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID,
  debriefing_id UUID,
  periodo_hash TEXT NOT NULL,
  fonte TEXT NOT NULL DEFAULT 'auto',
  janela_atribuicao TEXT NOT NULL DEFAULT '7d_click_1d_view',
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para overrides manuais dos valores
CREATE TABLE IF NOT EXISTS public.debrief_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID,
  debriefing_id UUID NOT NULL,
  periodo_hash TEXT NOT NULL,
  card_key TEXT NOT NULL,
  valor NUMERIC,
  fonte TEXT NOT NULL DEFAULT 'manual',
  autor_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_debrief_metrics_periodo_hash ON public.debrief_metrics(periodo_hash);
CREATE INDEX IF NOT EXISTS idx_debrief_metrics_debriefing_id ON public.debrief_metrics(debriefing_id);
CREATE INDEX IF NOT EXISTS idx_debrief_overrides_debriefing_id ON public.debrief_overrides(debriefing_id);
CREATE INDEX IF NOT EXISTS idx_debrief_overrides_card_key ON public.debrief_overrides(debriefing_id, card_key);

-- RLS para debrief_metrics
ALTER TABLE public.debrief_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver métricas"
  ON public.debrief_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.ativo = true
    )
  );

CREATE POLICY "Sistema pode inserir métricas"
  ON public.debrief_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar métricas"
  ON public.debrief_metrics FOR UPDATE
  USING (true);

-- RLS para debrief_overrides
ALTER TABLE public.debrief_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver overrides"
  ON public.debrief_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.ativo = true
    )
  );

CREATE POLICY "Gestores e admins podem criar overrides"
  ON public.debrief_overrides FOR INSERT
  WITH CHECK (
    auth.uid() = autor_id AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
        AND p.nivel_acesso IN ('admin', 'gestor_trafego')
        AND p.ativo = true
    )
  );

CREATE POLICY "Criadores podem atualizar seus overrides"
  ON public.debrief_overrides FOR UPDATE
  USING (auth.uid() = autor_id);

CREATE POLICY "Criadores e admins podem deletar overrides"
  ON public.debrief_overrides FOR DELETE
  USING (
    auth.uid() = autor_id OR 
    is_admin_with_valid_reason(auth.uid())
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_debrief_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_debrief_metrics_updated_at
  BEFORE UPDATE ON public.debrief_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_debrief_metrics_updated_at();