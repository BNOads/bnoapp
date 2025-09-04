-- Criar política para acesso público às referências ativas
CREATE POLICY "Acesso público a referências ativas"
ON public.referencias_criativos
FOR SELECT
TO anon, authenticated
USING (ativo = true);