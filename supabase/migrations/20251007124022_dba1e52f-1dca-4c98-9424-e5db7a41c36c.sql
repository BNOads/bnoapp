-- Adicionar coluna slug à tabela clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS slug TEXT;

-- Criar índice único para o slug
CREATE UNIQUE INDEX IF NOT EXISTS clientes_slug_unique ON public.clientes(slug);

-- Função para gerar slug a partir do nome
CREATE OR REPLACE FUNCTION public.generate_cliente_slug(nome_cliente TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        extensions.unaccent(nome_cliente),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$;

-- Trigger para gerar slug automaticamente
CREATE OR REPLACE FUNCTION public.handle_cliente_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, extensions'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Só gerar slug se estiver vazio
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := public.generate_cliente_slug(NEW.nome);
    final_slug := base_slug;
    
    -- Verificar unicidade e adicionar número se necessário
    WHILE EXISTS (
      SELECT 1 FROM public.clientes 
      WHERE slug = final_slug AND id != NEW.id
    ) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_generate_cliente_slug ON public.clientes;
CREATE TRIGGER trigger_generate_cliente_slug
  BEFORE INSERT OR UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cliente_slug();

-- Migrar dados existentes - gerar slugs para clientes que não têm
DO $$
DECLARE
  cliente RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR cliente IN SELECT id, nome FROM public.clientes WHERE slug IS NULL OR slug = '' LOOP
    base_slug := public.generate_cliente_slug(cliente.nome);
    final_slug := base_slug;
    counter := 0;
    
    -- Verificar unicidade
    WHILE EXISTS (SELECT 1 FROM public.clientes WHERE slug = final_slug AND id != cliente.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    UPDATE public.clientes SET slug = final_slug WHERE id = cliente.id;
  END LOOP;
END;
$$;