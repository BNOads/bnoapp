-- Fix base64url error by generating URL-safe token via base64 + translate
CREATE OR REPLACE FUNCTION public.generate_public_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $$
DECLARE
  token text;
BEGIN
  -- Generate random bytes, encode to base64, then make URL-safe and strip padding
  token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_');
  token := regexp_replace(token, '=+$', '');
  RETURN token;
END;
$$;

-- Update slug handler to use the generate_public_token() function instead of unsupported 'base64url'
CREATE OR REPLACE FUNCTION public.handle_reference_public_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- If being set public and previously was not
  IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
    -- Generate token if missing
    IF NEW.public_token IS NULL THEN
      NEW.public_token := public.generate_public_token();
    END IF;

    -- Generate slug if missing
    IF NEW.public_slug IS NULL THEN
      base_slug := lower(
        regexp_replace(
          regexp_replace(
            extensions.unaccent(NEW.titulo),
            '[^a-zA-Z0-9\s-]', '', 'g'
          ),
          '\s+', '-', 'g'
        )
      );

      base_slug := substring(base_slug from 1 for 50);
      final_slug := base_slug;

      WHILE EXISTS (
        SELECT 1 FROM public.referencias_criativos 
        WHERE public_slug = final_slug AND id != NEW.id
      ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
      END LOOP;

      NEW.public_slug := final_slug;
    END IF;

    IF NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
  END IF;

  -- If unpublishing, clear slug and publication date (keep token)
  IF NEW.is_public = false AND OLD.is_public = true THEN
    NEW.public_slug := NULL;
    NEW.published_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure references default to public
ALTER TABLE public.referencias_criativos
ALTER COLUMN is_public SET DEFAULT true;

-- Ensure triggers exist (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_handle_reference_public_fields'
  ) THEN
    CREATE TRIGGER trg_handle_reference_public_fields
    BEFORE INSERT OR UPDATE ON public.referencias_criativos
    FOR EACH ROW EXECUTE FUNCTION public.handle_reference_public_fields();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_handle_reference_public_slug'
  ) THEN
    CREATE TRIGGER trg_handle_reference_public_slug
    BEFORE INSERT OR UPDATE ON public.referencias_criativos
    FOR EACH ROW EXECUTE FUNCTION public.handle_reference_public_slug();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_generate_public_link_referencias'
  ) THEN
    CREATE TRIGGER trg_generate_public_link_referencias
    BEFORE INSERT OR UPDATE ON public.referencias_criativos
    FOR EACH ROW EXECUTE FUNCTION public.generate_public_link();
  END IF;
END$$;