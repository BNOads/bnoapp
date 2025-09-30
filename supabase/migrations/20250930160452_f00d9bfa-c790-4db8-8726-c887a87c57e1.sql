-- Adicionar campos para compartilhamento público se não existirem
DO $$ 
BEGIN
  -- Adicionar coluna is_public se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referencias_criativos' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.referencias_criativos 
    ADD COLUMN is_public BOOLEAN DEFAULT false NOT NULL;
  END IF;

  -- Adicionar coluna public_slug se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referencias_criativos' AND column_name = 'public_slug'
  ) THEN
    ALTER TABLE public.referencias_criativos 
    ADD COLUMN public_slug TEXT UNIQUE;
  END IF;

  -- Adicionar coluna public_token se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referencias_criativos' AND column_name = 'public_token'
  ) THEN
    ALTER TABLE public.referencias_criativos 
    ADD COLUMN public_token TEXT;
  END IF;

  -- Adicionar coluna published_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referencias_criativos' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.referencias_criativos 
    ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Criar índice para busca por slug público
CREATE INDEX IF NOT EXISTS idx_referencias_public_slug 
ON public.referencias_criativos(public_slug) 
WHERE is_public = true;

-- Política RLS para acesso público via slug
DROP POLICY IF EXISTS "Acesso público a referências compartilhadas" ON public.referencias_criativos;
CREATE POLICY "Acesso público a referências compartilhadas"
ON public.referencias_criativos
FOR SELECT
TO public
USING (is_public = true AND public_slug IS NOT NULL);

-- Trigger para gerar slug público automaticamente
CREATE OR REPLACE FUNCTION public.handle_reference_public_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Se está sendo marcado como público e não tem slug
  IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
    -- Gerar token único se não existir
    IF NEW.public_token IS NULL THEN
      NEW.public_token := encode(gen_random_bytes(32), 'base64url');
    END IF;
    
    -- Gerar slug se não existir
    IF NEW.public_slug IS NULL THEN
      -- Criar slug base a partir do título
      base_slug := lower(
        regexp_replace(
          regexp_replace(
            unaccent(NEW.titulo),
            '[^a-zA-Z0-9\s-]', '', 'g'
          ),
          '\s+', '-', 'g'
        )
      );
      
      -- Limitar tamanho do slug
      base_slug := substring(base_slug from 1 for 50);
      final_slug := base_slug;
      
      -- Garantir unicidade
      WHILE EXISTS (
        SELECT 1 FROM public.referencias_criativos 
        WHERE public_slug = final_slug AND id != NEW.id
      ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
      END LOOP;
      
      NEW.public_slug := final_slug;
    END IF;
    
    -- Registrar data de publicação
    IF NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
  END IF;
  
  -- Se está sendo despublicado, limpar slug (manter token para possível republish)
  IF NEW.is_public = false AND OLD.is_public = true THEN
    NEW.public_slug := NULL;
    NEW.published_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS handle_reference_public_slug_trigger ON public.referencias_criativos;
CREATE TRIGGER handle_reference_public_slug_trigger
  BEFORE INSERT OR UPDATE ON public.referencias_criativos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_reference_public_slug();