CREATE TABLE IF NOT EXISTS public.organograma_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID UNIQUE REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo_display TEXT,
  email TEXT,
  avatar_url TEXT,
  area TEXT NOT NULL DEFAULT 'servicos',
  ordem INTEGER NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT organograma_cards_area_check CHECK (
    area IN ('diretoria', 'administracao', 'gestao', 'comunicacao', 'servicos')
  ),
  CONSTRAINT organograma_cards_custom_colaborador_check CHECK (
    (is_custom = true AND colaborador_id IS NULL)
    OR
    (is_custom = false AND colaborador_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_organograma_cards_area_ordem
  ON public.organograma_cards(area, ordem);

CREATE INDEX IF NOT EXISTS idx_organograma_cards_colaborador_id
  ON public.organograma_cards(colaborador_id)
  WHERE colaborador_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.organograma_conexoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_a_id UUID NOT NULL REFERENCES public.organograma_cards(id) ON DELETE CASCADE,
  card_b_id UUID NOT NULL REFERENCES public.organograma_cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT organograma_conexoes_diff_check CHECK (card_a_id <> card_b_id),
  CONSTRAINT organograma_conexoes_order_check CHECK (card_a_id::text < card_b_id::text),
  CONSTRAINT organograma_conexoes_unique_pair UNIQUE (card_a_id, card_b_id)
);

CREATE INDEX IF NOT EXISTS idx_organograma_conexoes_card_a
  ON public.organograma_conexoes(card_a_id);

CREATE INDEX IF NOT EXISTS idx_organograma_conexoes_card_b
  ON public.organograma_conexoes(card_b_id);

ALTER TABLE public.organograma_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organograma_conexoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read organograma_cards" ON public.organograma_cards;
CREATE POLICY "Authenticated users can read organograma_cards"
  ON public.organograma_cards FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert organograma_cards" ON public.organograma_cards;
CREATE POLICY "Admins can insert organograma_cards"
  ON public.organograma_cards FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

DROP POLICY IF EXISTS "Admins can update organograma_cards" ON public.organograma_cards;
CREATE POLICY "Admins can update organograma_cards"
  ON public.organograma_cards FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

DROP POLICY IF EXISTS "Admins can delete organograma_cards" ON public.organograma_cards;
CREATE POLICY "Admins can delete organograma_cards"
  ON public.organograma_cards FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read organograma_conexoes" ON public.organograma_conexoes;
CREATE POLICY "Authenticated users can read organograma_conexoes"
  ON public.organograma_conexoes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert organograma_conexoes" ON public.organograma_conexoes;
CREATE POLICY "Admins can insert organograma_conexoes"
  ON public.organograma_conexoes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

DROP POLICY IF EXISTS "Admins can delete organograma_conexoes" ON public.organograma_conexoes;
CREATE POLICY "Admins can delete organograma_conexoes"
  ON public.organograma_conexoes FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND nivel_acesso IN ('admin', 'dono')
    )
  );

CREATE OR REPLACE FUNCTION public.organograma_cards_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organograma_cards_updated_at ON public.organograma_cards;

CREATE TRIGGER trg_organograma_cards_updated_at
  BEFORE UPDATE ON public.organograma_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.organograma_cards_touch_updated_at();

INSERT INTO public.organograma_cards (
  colaborador_id,
  nome,
  cargo_display,
  email,
  avatar_url,
  area,
  ordem,
  is_custom,
  ativo
)
SELECT
  c.id,
  c.nome,
  c.cargo_display,
  c.email,
  c.avatar_url,
  CASE
    WHEN c.nivel_acesso::text = 'dono' THEN 'diretoria'
    WHEN c.nivel_acesso::text = 'admin' THEN 'administracao'
    WHEN c.nivel_acesso::text IN ('gestor_trafego', 'gestor_projetos') THEN 'gestao'
    WHEN c.nivel_acesso::text IN ('cs', 'copywriter', 'designer', 'editor_video') THEN 'comunicacao'
    ELSE 'servicos'
  END AS area,
  ROW_NUMBER() OVER (
    PARTITION BY
      CASE
        WHEN c.nivel_acesso::text = 'dono' THEN 'diretoria'
        WHEN c.nivel_acesso::text = 'admin' THEN 'administracao'
        WHEN c.nivel_acesso::text IN ('gestor_trafego', 'gestor_projetos') THEN 'gestao'
        WHEN c.nivel_acesso::text IN ('cs', 'copywriter', 'designer', 'editor_video') THEN 'comunicacao'
        ELSE 'servicos'
      END
    ORDER BY c.nome
  ) - 1 AS ordem,
  false,
  true
FROM public.colaboradores c
ON CONFLICT (colaborador_id) DO NOTHING;
