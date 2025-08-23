-- Adicionar política RLS para permitir DELETE na tabela clientes
CREATE POLICY "Admins e gestores podem excluir clientes" 
ON public.clientes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = auth.uid() 
      AND p.nivel_acesso = ANY (ARRAY['admin'::nivel_acesso, 'gestor_trafego'::nivel_acesso])
  )
);