-- Tabela para armazenar estado Yjs do Arquivo de Reuniao (edicao colaborativa)
CREATE TABLE IF NOT EXISTS public.arquivo_reuniao_colaboracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id UUID NOT NULL UNIQUE REFERENCES public.arquivo_reuniao(id) ON DELETE CASCADE,
  conteudo_yjs TEXT,
  conteudo_json JSONB,
  versao INTEGER DEFAULT 1,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arquivo_reuniao_colab_arquivo_id
  ON public.arquivo_reuniao_colaboracao(arquivo_id);

CREATE INDEX IF NOT EXISTS idx_arquivo_reuniao_colab_atualizado_em
  ON public.arquivo_reuniao_colaboracao(atualizado_em DESC);

ALTER TABLE public.arquivo_reuniao_colaboracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read arquivo_reuniao_colaboracao"
  ON public.arquivo_reuniao_colaboracao FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert arquivo_reuniao_colaboracao"
  ON public.arquivo_reuniao_colaboracao FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update arquivo_reuniao_colaboracao"
  ON public.arquivo_reuniao_colaboracao FOR UPDATE
  TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);
