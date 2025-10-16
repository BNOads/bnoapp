-- Adicionar política de acesso público para referências
-- Permite que qualquer pessoa (mesmo sem autenticação) possa visualizar referências públicas

-- Remove política antiga se existir
DROP POLICY IF EXISTS "Public can view public references" ON public.referencias_criativos;
DROP POLICY IF EXISTS "Anyone can view public references" ON public.referencias_criativos;

-- Criar política de visualização pública
-- Permite acesso a referências que estão marcadas como públicas (is_public = true) e ativas
CREATE POLICY "Anyone can view public references"
ON public.referencias_criativos
FOR SELECT
TO anon, authenticated
USING (ativo = true AND is_public = true);

-- Permitir que o sistema atualize o view_count sem autenticação
DROP POLICY IF EXISTS "Anyone can update view count" ON public.referencias_criativos;

CREATE POLICY "Anyone can update view count"
ON public.referencias_criativos
FOR UPDATE
TO anon, authenticated
USING (ativo = true AND is_public = true)
WITH CHECK (ativo = true AND is_public = true);