-- Criar tabela de histórico de versões de pautas
CREATE TABLE IF NOT EXISTS public.pauta_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id UUID NOT NULL REFERENCES public.reunioes_documentos(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  autor UUID NOT NULL,
  autor_nome TEXT NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  conteudo JSONB NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('criacao', 'autosave', 'manual', 'restaurada')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pauta_historico_pauta_id ON public.pauta_historico(pauta_id);
CREATE INDEX IF NOT EXISTS idx_pauta_historico_data_hora ON public.pauta_historico(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_pauta_historico_versao ON public.pauta_historico(pauta_id, versao DESC);

-- Adicionar campo para rastrear versão atual na tabela principal
ALTER TABLE public.reunioes_documentos 
ADD COLUMN IF NOT EXISTS versao_atual INTEGER DEFAULT 1;

-- RLS Policies
ALTER TABLE public.pauta_historico ENABLE ROW LEVEL SECURITY;

-- Authenticated users podem ver histórico
CREATE POLICY "Usuários autenticados podem ver histórico de pautas"
  ON public.pauta_historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.ativo = true
    )
  );

-- Sistema pode criar versões
CREATE POLICY "Sistema pode criar versões de histórico"
  ON public.pauta_historico FOR INSERT
  WITH CHECK (true);

-- Admins podem deletar versões antigas
CREATE POLICY "Admins podem deletar versões antigas"
  ON public.pauta_historico FOR DELETE
  USING (is_admin_with_valid_reason(auth.uid()));

-- Função para limpar versões antigas (manter apenas as últimas 100 por pauta)
CREATE OR REPLACE FUNCTION limpar_versoes_antigas()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.pauta_historico
  WHERE pauta_id = NEW.pauta_id
    AND id NOT IN (
      SELECT id FROM public.pauta_historico
      WHERE pauta_id = NEW.pauta_id
      ORDER BY versao DESC
      LIMIT 100
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para limpar versões antigas automaticamente
DROP TRIGGER IF EXISTS trigger_limpar_versoes_antigas ON public.pauta_historico;
CREATE TRIGGER trigger_limpar_versoes_antigas
  AFTER INSERT ON public.pauta_historico
  FOR EACH ROW
  EXECUTE FUNCTION limpar_versoes_antigas();