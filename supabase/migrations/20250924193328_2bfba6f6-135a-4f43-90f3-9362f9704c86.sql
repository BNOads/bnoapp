-- Migration to backfill existing references with public access fields
-- This allows existing references to be accessed via public links

-- Update existing references to enable public access for backward compatibility
UPDATE public.referencias_criativos 
SET 
  is_public = true,
  public_slug = lower(
    regexp_replace(
      regexp_replace(
        titulo,
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  ),
  public_token = encode(gen_random_bytes(32), 'base64url'),
  published_at = created_at
WHERE 
  is_public IS NULL 
  AND ativo = true
  AND titulo IS NOT NULL 
  AND titulo != '';

-- Handle duplicate slugs by adding a counter suffix
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  -- Find all references with duplicate slugs
  FOR rec IN 
    SELECT public_slug, array_agg(id ORDER BY created_at) as ids
    FROM public.referencias_criativos 
    WHERE public_slug IS NOT NULL
    GROUP BY public_slug 
    HAVING count(*) > 1
  LOOP
    -- Keep the first one as is, add counter to others
    FOR i IN 2..array_length(rec.ids, 1) LOOP
      counter := i - 1;
      final_slug := rec.public_slug || '-' || counter;
      
      -- Make sure this new slug is unique
      WHILE EXISTS (SELECT 1 FROM public.referencias_criativos WHERE public_slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := rec.public_slug || '-' || counter;
      END LOOP;
      
      -- Update the duplicate
      UPDATE public.referencias_criativos 
      SET public_slug = final_slug 
      WHERE id = rec.ids[i];
    END LOOP;
  END LOOP;
END $$;