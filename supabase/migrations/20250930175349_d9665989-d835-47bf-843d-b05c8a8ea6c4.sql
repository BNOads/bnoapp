-- Criar/recriar triggers para gerar slug/token e link público em referencias_criativos
-- Remover triggers antigos se existirem
DROP TRIGGER IF EXISTS trg_referencias_public_fields ON public.referencias_criativos;
DROP TRIGGER IF EXISTS trg_referencias_generate_public_link ON public.referencias_criativos;

-- Criar triggers BEFORE UPDATE/INSERT para gerar campos públicos automaticamente
CREATE TRIGGER trg_referencias_public_fields
BEFORE INSERT OR UPDATE ON public.referencias_criativos
FOR EACH ROW
EXECUTE FUNCTION public.handle_reference_public_slug();

CREATE TRIGGER trg_referencias_generate_public_link
BEFORE INSERT OR UPDATE ON public.referencias_criativos
FOR EACH ROW
EXECUTE FUNCTION public.generate_public_link();