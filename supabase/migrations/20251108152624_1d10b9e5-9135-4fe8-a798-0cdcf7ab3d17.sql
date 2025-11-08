-- Criar tabela para armazenar estado Yjs das pautas
CREATE TABLE public.pauta_colaboracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pauta_id UUID NOT NULL UNIQUE,
  conteudo_yjs BYTEA,
  conteudo_json JSONB,
  versao INTEGER DEFAULT 1,
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_pauta_id FOREIGN KEY (pauta_id) REFERENCES public.reunioes_documentos(id) ON DELETE CASCADE
);

CREATE INDEX idx_pauta_colaboracao_pauta_id ON public.pauta_colaboracao(pauta_id);
CREATE INDEX idx_pauta_colaboracao_atualizado_em ON public.pauta_colaboracao(atualizado_em DESC);

-- RLS Policies
ALTER TABLE public.pauta_colaboracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ler colaborações"
  ON public.pauta_colaboracao FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar colaborações"
  ON public.pauta_colaboracao FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar colaborações"
  ON public.pauta_colaboracao FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);