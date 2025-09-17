-- Corrigir a política RLS para reunioes_blocos que está causando o erro ao salvar
-- A política atual verifica se o usuário é criador do documento ou admin, mas não permite inserção correta

-- Primeiro, remover a política problemática
DROP POLICY IF EXISTS "Usuarios podem gerenciar blocos de seus documentos" ON public.reunioes_blocos;

-- Criar políticas separadas mais específicas para reunioes_blocos
-- Permitir visualização para usuários autenticados
CREATE POLICY "Usuarios autenticados podem ver blocos" 
ON public.reunioes_blocos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  )
);

-- Permitir inserção para criadores de documentos ou admins
CREATE POLICY "Usuarios podem inserir blocos em seus documentos" 
ON public.reunioes_blocos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reunioes_documentos rd
    WHERE rd.id = documento_id 
    AND (rd.created_by = auth.uid() OR is_admin_with_valid_reason(auth.uid()))
  )
);

-- Permitir atualização para criadores de documentos ou admins
CREATE POLICY "Usuarios podem atualizar blocos de seus documentos" 
ON public.reunioes_blocos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.reunioes_documentos rd
    WHERE rd.id = documento_id 
    AND (rd.created_by = auth.uid() OR is_admin_with_valid_reason(auth.uid()))
  )
);

-- Permitir exclusão para criadores de documentos ou admins
CREATE POLICY "Usuarios podem deletar blocos de seus documentos" 
ON public.reunioes_blocos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.reunioes_documentos rd
    WHERE rd.id = documento_id 
    AND (rd.created_by = auth.uid() OR is_admin_with_valid_reason(auth.uid()))
  )
);