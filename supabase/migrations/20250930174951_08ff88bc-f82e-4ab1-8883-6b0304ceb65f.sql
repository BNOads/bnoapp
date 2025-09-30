-- Ensure extensions are available in the recommended schema and fix functions that depend on them
-- 1) Make sure the extensions schema exists and required extensions are enabled there
CREATE SCHEMA IF NOT EXISTS extensions;

-- Enable required extensions in the extensions schema (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- 2) Recreate functions to reference extensions schema explicitly and include it in search_path

-- Generate a secure public token using pgcrypto from the extensions schema
CREATE OR REPLACE FUNCTION public.generate_public_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $$
BEGIN
  RETURN encode(extensions.gen_random_bytes(32), 'base64url');
END;
$$;

-- Helper to generate a slug, using unaccent from extensions schema
CREATE OR REPLACE FUNCTION public.generate_reference_slug(titulo text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        extensions.unaccent(titulo),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$;

-- Handle public fields and ensure token/slug generation works without relying on public search_path only
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
      NEW.public_token := encode(extensions.gen_random_bytes(32), 'base64url');
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