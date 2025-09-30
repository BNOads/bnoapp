-- Criar tabela de configuração do Google Sheets
CREATE TABLE IF NOT EXISTS public.financeiro_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  spreadsheet_id TEXT NOT NULL,
  aba_resumo_ano_1 TEXT NOT NULL DEFAULT 'Resumo_ano_1',
  aba_resumo_ano_2 TEXT NOT NULL DEFAULT 'Resumo_ano_2',
  aba_clientes_ativos TEXT NOT NULL DEFAULT 'Clientes_ativos',
  aba_movimentos TEXT NOT NULL DEFAULT 'Movimentos',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT single_config CHECK (id = 1)
);

-- Criar tabela para log de aliases não mapeados
CREATE TABLE IF NOT EXISTS public.finance_aliases_unmapped (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  header_original TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.financeiro_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_aliases_unmapped ENABLE ROW LEVEL SECURITY;

-- Policies para financeiro_config
CREATE POLICY "Admins podem ver configuração"
  ON public.financeiro_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.nivel_acesso = 'admin'
  ));

CREATE POLICY "Admins podem atualizar configuração"
  ON public.financeiro_config FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.nivel_acesso = 'admin'
  ));

-- Policies para finance_aliases_unmapped
CREATE POLICY "Sistema pode inserir aliases não mapeados"
  ON public.finance_aliases_unmapped FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins podem ver aliases não mapeados"
  ON public.finance_aliases_unmapped FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.nivel_acesso = 'admin'
  ));