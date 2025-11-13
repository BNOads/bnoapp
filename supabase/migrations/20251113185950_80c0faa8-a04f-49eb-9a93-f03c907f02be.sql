-- Criar tabela de histórico de versões do arquivo de reunião
CREATE TABLE IF NOT EXISTS public.arquivo_reuniao_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arquivo_id UUID NOT NULL REFERENCES public.arquivo_reuniao(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  autor UUID NOT NULL REFERENCES auth.users(id),
  autor_nome TEXT NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  conteudo JSONB NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('criacao', 'autosave', 'manual', 'restaurada')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_arquivo_historico_arquivo_id ON public.arquivo_reuniao_historico(arquivo_id);
CREATE INDEX IF NOT EXISTS idx_arquivo_historico_data_hora ON public.arquivo_reuniao_historico(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_arquivo_historico_tipo ON public.arquivo_reuniao_historico(tipo);

-- Enable RLS
ALTER TABLE public.arquivo_reuniao_historico ENABLE ROW LEVEL SECURITY;

-- Policy: Todos com acesso ao arquivo podem visualizar versões
CREATE POLICY "Visualizar histórico de arquivo acessível"
  ON public.arquivo_reuniao_historico
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.arquivo_reuniao ar
      WHERE ar.id = arquivo_reuniao_historico.arquivo_id
    )
  );

-- Policy: Apenas usuários autenticados podem criar versões
CREATE POLICY "Criar versão de arquivo"
  ON public.arquivo_reuniao_historico
  FOR INSERT
  WITH CHECK (auth.uid() = autor);

-- Trigger para limpar versões antigas (manter últimas 100)
CREATE OR REPLACE FUNCTION public.limpar_versoes_antigas_arquivo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.arquivo_reuniao_historico
  WHERE arquivo_id = NEW.arquivo_id
    AND id NOT IN (
      SELECT id FROM public.arquivo_reuniao_historico
      WHERE arquivo_id = NEW.arquivo_id
      ORDER BY versao DESC
      LIMIT 100
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_limpar_versoes_antigas_arquivo
  AFTER INSERT ON public.arquivo_reuniao_historico
  FOR EACH ROW
  EXECUTE FUNCTION public.limpar_versoes_antigas_arquivo();