-- Key-value config table for Missao, Visao, and other culture texts
CREATE TABLE IF NOT EXISTS public.cultura_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL DEFAULT '',
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cultura_config_chave ON public.cultura_config(chave);

ALTER TABLE public.cultura_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cultura_config"
  ON public.cultura_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert cultura_config"
  ON public.cultura_config FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

CREATE POLICY "Admins can update cultura_config"
  ON public.cultura_config FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

-- Seed initial rows
INSERT INTO public.cultura_config (chave, valor) VALUES
  ('missao', ''),
  ('visao', '')
ON CONFLICT (chave) DO NOTHING;
