-- Adicionar política para permitir que qualquer usuário autenticado possa atualizar lançamentos
-- Isso permite que gestores de tráfego e outros membros da equipe atualizem o checklist

-- Remover política antiga que restringe apenas ao criador
DROP POLICY IF EXISTS "Criadores podem atualizar seus lançamentos" ON public.lancamentos;

-- Criar nova política que permite qualquer usuário autenticado atualizar lançamentos
CREATE POLICY "Usuários autenticados podem atualizar lançamentos" 
ON public.lancamentos 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);