-- Atualizar política para permitir referências gerais (cliente_id null)
DROP POLICY IF EXISTS "Acesso público para visualização de referências" ON public.referencias_criativos;

CREATE POLICY "Acesso público para visualização de referências" 
ON public.referencias_criativos 
FOR SELECT 
USING (ativo = true);

-- Atualizar política para equipe poder gerenciar todas as referências
DROP POLICY IF EXISTS "Equipe pode gerenciar referências" ON public.referencias_criativos;

CREATE POLICY "Equipe pode gerenciar referências" 
ON public.referencias_criativos 
FOR ALL 
USING (is_admin_with_valid_reason(auth.uid()));