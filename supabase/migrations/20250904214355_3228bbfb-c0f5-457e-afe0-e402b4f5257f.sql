-- Criar tipos ENUM para status e tipos de lançamento
CREATE TYPE status_lancamento AS ENUM (
  'em_captacao',
  'cpl',
  'remarketing', 
  'finalizado',
  'pausado',
  'cancelado'
);

CREATE TYPE tipo_lancamento AS ENUM (
  'semente',
  'interno',
  'externo',
  'perpetuo',
  'flash',
  'evento',
  'outro'
);

-- Criar tabela de lançamentos
CREATE TABLE public.lancamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_responsavel UUID NOT NULL,
  status_lancamento status_lancamento NOT NULL DEFAULT 'em_captacao',
  tipo_lancamento tipo_lancamento NOT NULL,
  nome_lancamento TEXT NOT NULL,
  descricao TEXT,
  data_inicio_captacao DATE NOT NULL,
  data_fim_captacao DATE,
  datas_cpls DATE[] DEFAULT '{}',
  data_inicio_remarketing DATE,
  data_fim_remarketing DATE,
  investimento_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  link_dashboard TEXT,
  link_briefing TEXT,
  observacoes TEXT,
  meta_investimento NUMERIC(15,2),
  resultado_obtido NUMERIC(15,2),
  roi_percentual NUMERIC(5,2),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Criar índices para performance
CREATE INDEX idx_lancamentos_gestor ON public.lancamentos(gestor_responsavel);
CREATE INDEX idx_lancamentos_status ON public.lancamentos(status_lancamento);
CREATE INDEX idx_lancamentos_tipo ON public.lancamentos(tipo_lancamento);
CREATE INDEX idx_lancamentos_data_inicio ON public.lancamentos(data_inicio_captacao);
CREATE INDEX idx_lancamentos_ativo ON public.lancamentos(ativo);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lancamentos_updated_at
  BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem ver lançamentos"
  ON public.lancamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.ativo = true
    )
  );

CREATE POLICY "Usuários podem criar lançamentos"
  ON public.lancamentos FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Gestores podem atualizar seus lançamentos"
  ON public.lancamentos FOR UPDATE
  USING (
    auth.uid() = created_by OR 
    auth.uid() IN (
      SELECT c.user_id FROM colaboradores c 
      WHERE c.id = gestor_responsavel
    ) OR
    is_admin_with_valid_reason(auth.uid())
  );

CREATE POLICY "Admins podem gerenciar todos os lançamentos"
  ON public.lancamentos FOR ALL
  USING (is_admin_with_valid_reason(auth.uid()));

-- Criar tabela para histórico de alterações de status
CREATE TABLE public.historico_status_lancamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id UUID NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  status_anterior status_lancamento,
  status_novo status_lancamento NOT NULL,
  motivo TEXT,
  alterado_por UUID NOT NULL,
  data_alteracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS no histórico
ALTER TABLE public.historico_status_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver histórico de lançamentos"
  ON public.historico_status_lancamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() AND p.ativo = true
    )
  );

CREATE POLICY "Sistema pode inserir no histórico"
  ON public.historico_status_lancamentos FOR INSERT
  WITH CHECK (true);

-- Trigger para registrar mudanças de status
CREATE OR REPLACE FUNCTION public.registrar_mudanca_status_lancamento()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status_lancamento != NEW.status_lancamento THEN
    INSERT INTO public.historico_status_lancamentos (
      lancamento_id,
      status_anterior,
      status_novo,
      motivo,
      alterado_por
    ) VALUES (
      NEW.id,
      OLD.status_lancamento,
      NEW.status_lancamento,
      'Alteração via sistema',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_registrar_mudanca_status
  AFTER UPDATE ON public.lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_status_lancamento();