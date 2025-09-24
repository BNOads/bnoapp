-- Fix security issues: Add proper search_path to functions

-- Update generate_reference_slug function
CREATE OR REPLACE FUNCTION public.generate_reference_slug(titulo text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Generate slug from title: normalize, remove accents, lowercase, replace spaces with hyphens
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(titulo),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$;

-- Update generate_public_token function
CREATE OR REPLACE FUNCTION public.generate_public_token()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- Update handle_reference_public_fields function
CREATE OR REPLACE FUNCTION public.handle_reference_public_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Only process if is_public is being set to true
  IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
    -- Generate public token if not exists
    IF NEW.public_token IS NULL THEN
      NEW.public_token := generate_public_token();
    END IF;
    
    -- Generate public slug if not exists
    IF NEW.public_slug IS NULL THEN
      base_slug := generate_reference_slug(NEW.titulo);
      final_slug := base_slug;
      
      -- Check for unique slug
      WHILE EXISTS (SELECT 1 FROM public.referencias_criativos WHERE public_slug = final_slug AND id != NEW.id) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
      END LOOP;
      
      NEW.public_slug := final_slug;
    END IF;
    
    -- Set published timestamp
    IF NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
  END IF;
  
  -- Clear public fields if is_public is set to false
  IF NEW.is_public = false THEN
    NEW.public_slug := NULL;
    NEW.published_at := NULL;
    -- Keep public_token for potential re-enabling
  END IF;
  
  RETURN NEW;
END;
$$;