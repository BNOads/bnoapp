-- Atualizar a política para permitir acesso público mais amplo
DROP POLICY IF EXISTS "Acesso publico apenas para referencias com link publico" ON public.referencias_criativos;

-- Criar nova política para acesso público a referências ativas
CREATE POLICY "Acesso público para referências ativas" 
ON public.referencias_criativos 
FOR SELECT 
TO anon, authenticated
USING (ativo = true);