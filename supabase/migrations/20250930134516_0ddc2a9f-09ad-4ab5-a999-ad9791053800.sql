-- Criar tabelas para o sistema financeiro

-- Tabela de sessões de acesso ao financeiro
CREATE TABLE IF NOT EXISTS public.financeiro_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de movimentos financeiros
CREATE TABLE IF NOT EXISTS public.financeiro_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_prevista DATE NOT NULL,
  movimento TEXT NOT NULL, -- nome do movimento
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  classificacao TEXT NOT NULL, -- categoria (despesa, receita, parceiro, etc)
  descricao TEXT,
  valor DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'realizado', 'pago', 'atrasado')),
  observacoes TEXT,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de clientes ativos (snapshot mensal para cálculo de LTV)
CREATE TABLE IF NOT EXISTS public.financeiro_clientes_ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
  ano_referencia INTEGER NOT NULL,
  mrr DECIMAL(15,2) NOT NULL, -- Monthly Recurring Revenue
  tempo_ativo_meses INTEGER NOT NULL DEFAULT 0,
  ltv DECIMAL(15,2) GENERATED ALWAYS AS (mrr * tempo_ativo_meses) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cliente_id, mes_referencia, ano_referencia)
);

-- Tabela de resumo mensal (cálculos agregados)
CREATE TABLE IF NOT EXISTS public.financeiro_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  faturamento_previsto DECIMAL(15,2) DEFAULT 0,
  faturamento_realizado DECIMAL(15,2) DEFAULT 0,
  despesas_previstas DECIMAL(15,2) DEFAULT 0,
  despesas_realizadas DECIMAL(15,2) DEFAULT 0,
  pagamento_parceiros_previsto DECIMAL(15,2) DEFAULT 0,
  pagamento_parceiros_realizado DECIMAL(15,2) DEFAULT 0,
  total_ads DECIMAL(15,2) DEFAULT 0, -- para cálculo de ROI
  clientes_ativos INTEGER DEFAULT 0,
  clientes_perdidos INTEGER DEFAULT 0, -- para churn rate
  colaboradores INTEGER DEFAULT 0,
  fechamento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mes, ano)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financeiro_movimentos_mes_ano ON public.financeiro_movimentos(mes_referencia, ano_referencia);
CREATE INDEX IF NOT EXISTS idx_financeiro_movimentos_tipo ON public.financeiro_movimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_movimentos_status ON public.financeiro_movimentos(status);
CREATE INDEX IF NOT EXISTS idx_financeiro_clientes_ativos_mes_ano ON public.financeiro_clientes_ativos(mes_referencia, ano_referencia);
CREATE INDEX IF NOT EXISTS idx_financeiro_mensal_ano ON public.financeiro_mensal(ano);

-- RLS Policies
ALTER TABLE public.financeiro_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_clientes_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_mensal ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (apenas admins com permissão especial)
CREATE POLICY "Admins podem gerenciar sessões financeiro"
  ON public.financeiro_access_sessions
  FOR ALL
  USING (true);

CREATE POLICY "Admins podem ver movimentos financeiros"
  ON public.financeiro_movimentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.nivel_acesso = 'admin'
    )
  );

CREATE POLICY "Admins podem gerenciar movimentos financeiros"
  ON public.financeiro_movimentos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.nivel_acesso = 'admin'
    )
  );

CREATE POLICY "Admins podem ver clientes ativos"
  ON public.financeiro_clientes_ativos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.nivel_acesso = 'admin'
    )
  );

CREATE POLICY "Admins podem gerenciar clientes ativos"
  ON public.financeiro_clientes_ativos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.nivel_acesso = 'admin'
    )
  );

CREATE POLICY "Admins podem ver resumo mensal"
  ON public.financeiro_mensal
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.nivel_acesso = 'admin'
    )
  );

CREATE POLICY "Sistema pode atualizar resumo mensal"
  ON public.financeiro_mensal
  FOR ALL
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_financeiro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financeiro_movimentos_updated_at
  BEFORE UPDATE ON public.financeiro_movimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();

CREATE TRIGGER update_financeiro_clientes_ativos_updated_at
  BEFORE UPDATE ON public.financeiro_clientes_ativos
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();

CREATE TRIGGER update_financeiro_mensal_updated_at
  BEFORE UPDATE ON public.financeiro_mensal
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_updated_at();