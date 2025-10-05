-- Criar tabela de auditoria de downloads
CREATE TABLE IF NOT EXISTS public.creative_downloads_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  creative_id UUID NOT NULL,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  is_batch BOOLEAN DEFAULT false,
  batch_size INTEGER DEFAULT 1,
  ip_address INET,
  user_agent TEXT,
  download_duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.creative_downloads_audit ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver seus próprios downloads
CREATE POLICY "Usuários podem ver seus próprios downloads"
ON public.creative_downloads_audit
FOR SELECT
USING (auth.uid() = user_id);

-- Política: admins podem ver todos os downloads
CREATE POLICY "Admins podem ver todos os downloads"
ON public.creative_downloads_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.nivel_acesso = 'admin'
    AND p.ativo = true
  )
);

-- Política: sistema pode inserir registros de auditoria
CREATE POLICY "Sistema pode inserir registros de auditoria"
ON public.creative_downloads_audit
FOR INSERT
WITH CHECK (true);

-- Criar índices para consultas
CREATE INDEX idx_creative_downloads_user_date 
ON public.creative_downloads_audit(user_id, created_at DESC);

CREATE INDEX idx_creative_downloads_client 
ON public.creative_downloads_audit(client_id, created_at DESC);