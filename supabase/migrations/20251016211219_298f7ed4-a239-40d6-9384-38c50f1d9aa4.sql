-- Adicionar políticas para permitir que admins editem e excluam desafios

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Admins e gestores podem editar desafios" ON public.gamificacao_desafios;
DROP POLICY IF EXISTS "Admins e gestores podem excluir desafios" ON public.gamificacao_desafios;

-- Política para admins e gestores editarem desafios
CREATE POLICY "Admins e gestores podem editar desafios"
ON public.gamificacao_desafios
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND nivel_acesso IN ('admin', 'gestor_trafego')
    AND ativo = true
  )
);

-- Política para admins e gestores excluírem desafios
CREATE POLICY "Admins e gestores podem excluir desafios"
ON public.gamificacao_desafios
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND nivel_acesso IN ('admin', 'gestor_trafego')
    AND ativo = true
  )
);