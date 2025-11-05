-- Adicionar campos de Google Sheets por cliente
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS google_sheet_id TEXT,
ADD COLUMN IF NOT EXISTS google_sheet_aba TEXT DEFAULT 'Dashboard',
ADD COLUMN IF NOT EXISTS google_sheet_ultima_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS google_sheet_sync_status TEXT DEFAULT 'nunca_sincronizado',
ADD COLUMN IF NOT EXISTS google_sheet_erro TEXT;

-- Comentários explicativos
COMMENT ON COLUMN public.clientes.google_sheet_id IS 'ID da planilha do Google Sheets vinculada ao cliente';
COMMENT ON COLUMN public.clientes.google_sheet_aba IS 'Nome da aba/sheet a ser lida na planilha';
COMMENT ON COLUMN public.clientes.google_sheet_ultima_sync IS 'Data e hora da última sincronização bem-sucedida';
COMMENT ON COLUMN public.clientes.google_sheet_sync_status IS 'Status da sincronização: nunca_sincronizado, sucesso, erro, em_andamento';
COMMENT ON COLUMN public.clientes.google_sheet_erro IS 'Mensagem de erro da última tentativa de sincronização (se houver)';

-- Criar tabela para logs de leitura
CREATE TABLE IF NOT EXISTS public.google_sheets_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  sheet_id TEXT NOT NULL,
  aba TEXT NOT NULL,
  colunas_lidas INTEGER,
  linhas_lidas INTEGER,
  metricas_identificadas JSONB DEFAULT '[]'::jsonb,
  erro TEXT,
  status TEXT NOT NULL DEFAULT 'sucesso',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_google_sheets_logs_cliente ON public.google_sheets_logs(cliente_id);
CREATE INDEX IF NOT EXISTS idx_google_sheets_logs_created ON public.google_sheets_logs(created_at DESC);

-- RLS para logs
ALTER TABLE public.google_sheets_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e gestores podem ver logs"
ON public.google_sheets_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.nivel_acesso IN ('admin', 'gestor_trafego')
    AND p.ativo = true
  )
);

CREATE POLICY "Sistema pode inserir logs"
ON public.google_sheets_logs
FOR INSERT
WITH CHECK (true);