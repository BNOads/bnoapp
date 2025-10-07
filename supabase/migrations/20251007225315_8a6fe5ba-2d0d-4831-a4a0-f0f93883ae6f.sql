-- Criar enum para severity de alertas
CREATE TYPE alert_severity AS ENUM ('info', 'warn', 'urgent');

-- Criar enum para status de alertas
CREATE TYPE alert_status AS ENUM ('open', 'closed');

-- Criar enum para canais de entrega
CREATE TYPE delivery_channel AS ENUM ('inapp', 'email', 'slack');

-- Tabela de alertas
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id UUID REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  rule TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  status alert_status NOT NULL DEFAULT 'open',
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de alertas por usuário
CREATE TABLE public.user_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  channel delivery_channel NOT NULL DEFAULT 'inapp',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_alerts_lancamento ON public.alerts(lancamento_id);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_user_alerts_user ON public.user_alerts(user_id);
CREATE INDEX idx_user_alerts_alert ON public.user_alerts(alert_id);
CREATE INDEX idx_user_alerts_read ON public.user_alerts(is_read);

-- RLS Policies para alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver alertas"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.ativo = true
    )
  );

CREATE POLICY "Sistema pode criar alertas"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar alertas"
  ON public.alerts FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies para user_alerts
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus próprios alertas"
  ON public.user_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode criar user_alerts"
  ON public.user_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários podem marcar como lido"
  ON public.user_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);