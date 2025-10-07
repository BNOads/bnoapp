-- Criar tabela para links úteis dos lançamentos
CREATE TABLE IF NOT EXISTS public.lancamento_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.lancamento_links ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários autenticados podem ver links"
  ON public.lancamento_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.ativo = true
    )
  );

CREATE POLICY "Usuários podem criar links"
  ON public.lancamento_links FOR INSERT
  WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Usuários podem atualizar links"
  ON public.lancamento_links FOR UPDATE
  USING (auth.uid() = criado_por OR is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Usuários podem deletar links"
  ON public.lancamento_links FOR DELETE
  USING (auth.uid() = criado_por OR is_admin_with_valid_reason(auth.uid()));

-- Índices
CREATE INDEX idx_lancamento_links_lancamento_id ON public.lancamento_links(lancamento_id);
CREATE INDEX idx_lancamento_links_ordem ON public.lancamento_links(lancamento_id, ordem);