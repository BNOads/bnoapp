-- Remover a política antiga que restringe apenas a admins e gestores de tráfego
DROP POLICY IF EXISTS "Admins e gestores podem atualizar clientes" ON public.clientes;

-- Criar nova política permitindo que todos os colaboradores autenticados possam atualizar clientes
CREATE POLICY "Colaboradores autenticados podem atualizar clientes"
ON public.clientes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true
      AND p.nivel_acesso IN (
        'admin', 
        'dono', 
        'gestor_trafego', 
        'gestor_projetos', 
        'cs', 
        'webdesigner', 
        'editor_video'
      )
  )
);