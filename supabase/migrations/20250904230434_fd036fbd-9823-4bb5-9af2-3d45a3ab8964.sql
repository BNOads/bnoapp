-- Criar tabela debriefings
CREATE TABLE public.debriefings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid REFERENCES public.clientes(id),
  cliente_nome text NOT NULL,
  nome_lancamento text NOT NULL,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  moeda text NOT NULL DEFAULT 'BRL',
  meta_roas numeric,
  meta_cpl numeric,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'processando', 'concluido')),
  
  -- Métricas calculadas
  leads_total integer,
  vendas_total integer,
  investimento_total numeric,
  faturamento_total numeric,
  roas numeric,
  cpl numeric,
  ticket_medio numeric,
  conversao_lead_venda numeric,
  
  -- Dados dos uploads
  dados_leads jsonb,
  dados_compradores jsonb,
  dados_trafego jsonb,
  
  -- Insights e campos qualitativos
  insights_automaticos jsonb DEFAULT '[]'::jsonb,
  o_que_funcionou text[],
  o_que_ajustar text[],
  proximos_passos text[],
  anexos jsonb DEFAULT '[]'::jsonb,
  
  -- Auditoria
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.debriefings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem ver debriefings" 
ON public.debriefings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  )
);

CREATE POLICY "Usuários podem criar debriefings" 
ON public.debriefings 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores e admins podem atualizar debriefings" 
ON public.debriefings 
FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  is_admin_with_valid_reason(auth.uid())
);

CREATE POLICY "Criadores e admins podem excluir debriefings" 
ON public.debriefings 
FOR DELETE 
USING (
  auth.uid() = created_by OR 
  is_admin_with_valid_reason(auth.uid())
);

-- Trigger para updated_at
CREATE TRIGGER update_debriefings_updated_at
  BEFORE UPDATE ON public.debriefings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_debriefings_cliente_id ON public.debriefings(cliente_id);
CREATE INDEX idx_debriefings_status ON public.debriefings(status);
CREATE INDEX idx_debriefings_created_by ON public.debriefings(created_by);
CREATE INDEX idx_debriefings_periodo ON public.debriefings(periodo_inicio, periodo_fim);