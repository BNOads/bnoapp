-- Tabela de colunas do CRM Kanban
CREATE TABLE public.crm_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  "order" INTEGER NOT NULL DEFAULT 0,
  column_sla_days INTEGER DEFAULT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de cards (leads) do CRM
CREATE TABLE public.crm_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.crm_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instagram TEXT,
  segment TEXT,
  origin TEXT,
  company TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  amount NUMERIC(10,2),
  owner_id UUID REFERENCES auth.users(id),
  tags JSONB DEFAULT '[]'::jsonb,
  next_action_at TIMESTAMP WITH TIME ZONE,
  converted_client_id UUID REFERENCES public.clientes(id),
  lost_reason TEXT,
  disqualify_reason TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de definições de campos personalizados
CREATE TABLE public.crm_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'date', 'url', 'email', 'phone')),
  field_options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de templates de card
CREATE TABLE public.crm_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_fields TEXT[] DEFAULT '{}'::text[],
  initial_tags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de atividades
CREATE TABLE public.crm_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de sessões de acesso ao CRM
CREATE TABLE public.crm_access_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_cards_column ON public.crm_cards(column_id);
CREATE INDEX idx_crm_cards_owner ON public.crm_cards(owner_id);
CREATE INDEX idx_crm_cards_next_action ON public.crm_cards(next_action_at);
CREATE INDEX idx_crm_activity_card ON public.crm_activity(card_id);
CREATE INDEX idx_crm_access_sessions_token ON public.crm_access_sessions(token);
CREATE INDEX idx_crm_access_sessions_expires ON public.crm_access_sessions(expires_at);

-- Trigger para updated_at
CREATE TRIGGER update_crm_columns_updated_at
  BEFORE UPDATE ON public.crm_columns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_cards_updated_at
  BEFORE UPDATE ON public.crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.crm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_access_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados podem ver e gerenciar
CREATE POLICY "Authenticated users can view columns"
  ON public.crm_columns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  ));

CREATE POLICY "Authenticated users can manage columns"
  ON public.crm_columns FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  ));

CREATE POLICY "Authenticated users can view cards"
  ON public.crm_cards FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  ));

CREATE POLICY "Authenticated users can manage cards"
  ON public.crm_cards FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  ));

CREATE POLICY "Authenticated users can view custom fields"
  ON public.crm_custom_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  ));

CREATE POLICY "Admins can manage custom fields"
  ON public.crm_custom_fields FOR ALL
  USING (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Authenticated users can view templates"
  ON public.crm_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  ));

CREATE POLICY "Admins can manage templates"
  ON public.crm_templates FOR ALL
  USING (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Authenticated users can view activity"
  ON public.crm_activity FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  ));

CREATE POLICY "System can insert activity"
  ON public.crm_activity FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can manage their sessions"
  ON public.crm_access_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Inserir colunas padrão
INSERT INTO public.crm_columns (name, color, "order", column_sla_days, is_default) VALUES
  ('Leads', '#6366f1', 0, NULL, true),
  ('Follow-up', '#f59e0b', 1, 2, true),
  ('Qualificação', '#8b5cf6', 2, 3, true),
  ('Desqualificado', '#6b7280', 3, NULL, true),
  ('Ganho', '#10b981', 4, NULL, true),
  ('Perdido', '#ef4444', 5, NULL, true);

-- Inserir templates padrão
INSERT INTO public.crm_templates (name, description, default_fields, required_fields, initial_tags) VALUES
  (
    'Infoproduto',
    'Template para leads de infoprodutos e lançamentos digitais',
    '{"segment": "Infoproduto", "origin": "Indicação"}'::jsonb,
    ARRAY['title', 'instagram', 'segment'],
    ARRAY['infoproduto', 'digital']
  ),
  (
    'Negócio Local',
    'Template para leads de negócios locais e serviços',
    '{"segment": "Negócio Local", "origin": "Frio"}'::jsonb,
    ARRAY['title', 'company', 'phone'],
    ARRAY['local', 'servicos']
  );