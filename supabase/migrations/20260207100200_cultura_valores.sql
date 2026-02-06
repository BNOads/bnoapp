-- Values grid table for the Missao, Visao & Valores tab
CREATE TABLE IF NOT EXISTS public.cultura_valores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  icone TEXT NOT NULL DEFAULT 'Star',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_cultura_valores_ordem ON public.cultura_valores(ordem);

ALTER TABLE public.cultura_valores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cultura_valores"
  ON public.cultura_valores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert cultura_valores"
  ON public.cultura_valores FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

CREATE POLICY "Admins can update cultura_valores"
  ON public.cultura_valores FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

CREATE POLICY "Admins can delete cultura_valores"
  ON public.cultura_valores FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );
