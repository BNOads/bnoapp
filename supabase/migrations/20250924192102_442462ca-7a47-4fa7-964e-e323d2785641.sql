-- Add public access control fields to referencias_criativos
ALTER TABLE public.referencias_criativos 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS public_token text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS public_slug text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create index for public slug
CREATE INDEX IF NOT EXISTS idx_referencias_public_slug ON public.referencias_criativos(public_slug) WHERE public_slug IS NOT NULL;

-- Create index for public token
CREATE INDEX IF NOT EXISTS idx_referencias_public_token ON public.referencias_criativos(public_token) WHERE public_token IS NOT NULL;

-- Function to generate public slug from title
CREATE OR REPLACE FUNCTION public.generate_reference_slug(titulo text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
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

-- Function to generate unique public token
CREATE OR REPLACE FUNCTION public.generate_public_token()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- Trigger to auto-generate public_slug when is_public is set to true
CREATE OR REPLACE FUNCTION public.handle_reference_public_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for auto-generating public fields
DROP TRIGGER IF EXISTS trigger_reference_public_fields ON public.referencias_criativos;
CREATE TRIGGER trigger_reference_public_fields
  BEFORE INSERT OR UPDATE ON public.referencias_criativos
  FOR EACH ROW EXECUTE FUNCTION handle_reference_public_fields();

-- Update existing public link generation trigger to use new fields
CREATE OR REPLACE FUNCTION public.generate_public_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_public = true AND NEW.public_slug IS NOT NULL AND (OLD.link_publico IS NULL OR OLD.link_publico = '') THEN
    NEW.link_publico = '/referencia/publica/' || NEW.public_slug;
  ELSIF NEW.is_public = false THEN
    NEW.link_publico = NULL;
  END IF;
  RETURN NEW;
END;
$$;