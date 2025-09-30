-- Enable required extensions for token/slug generation
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- Ensure trigger to handle public fields (token, slug, published_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_referencias_public_fields'
  ) THEN
    CREATE TRIGGER trg_referencias_public_fields
    BEFORE INSERT OR UPDATE ON public.referencias_criativos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_reference_public_fields();
  END IF;
END $$;

-- Ensure trigger to generate link_publico when public_slug is present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_referencias_generate_public_link'
  ) THEN
    CREATE TRIGGER trg_referencias_generate_public_link
    BEFORE INSERT OR UPDATE ON public.referencias_criativos
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_public_link();
  END IF;
END $$;