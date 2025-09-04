-- Criar política para acesso público às referências ativas
CREATE POLICY "Acesso público a referências ativas"
ON public.referencias_criativos
FOR SELECT
TO anon, authenticated
USING (ativo = true);

-- Verificar se a política existe e está correta
SELECT polname, polcmd, polpermissive, polroles, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'referencias_criativos';