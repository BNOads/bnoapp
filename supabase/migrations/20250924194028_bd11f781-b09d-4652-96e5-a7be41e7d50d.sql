-- Backfill existing references: enable public access when they previously had a link
UPDATE public.referencias_criativos 
SET 
  is_public = true,
  public_slug = COALESCE(
    public_slug,
    nullif(lower(regexp_replace(regexp_replace(titulo, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')), ''),
    id::text
  ),
  public_token = COALESCE(public_token, encode(gen_random_bytes(24), 'hex')),
  published_at = COALESCE(published_at, updated_at, created_at)
WHERE 
  ativo = true
  AND is_public = false
  AND (link_publico IS NOT NULL OR conteudo IS NOT NULL);

-- Ensure unique slugs
DO $$
DECLARE r RECORD; base_slug TEXT; candidate TEXT; i INTEGER; BEGIN
  FOR r IN SELECT id, public_slug FROM public.referencias_criativos LOOP
    base_slug := r.public_slug; candidate := base_slug; i := 1;
    WHILE EXISTS (SELECT 1 FROM public.referencias_criativos WHERE public_slug = candidate AND id <> r.id) LOOP
      i := i + 1; candidate := base_slug || '-' || i;
    END LOOP;
    IF candidate <> r.public_slug THEN
      UPDATE public.referencias_criativos SET public_slug = candidate WHERE id = r.id;
    END IF;
  END LOOP;
END $$;