-- Permitir que usuários autenticados possam criar e editar blocos de reunião
-- Verificar se existem políticas restritivas na tabela reunioes_blocos

-- Primeiro, verificar se a tabela tem RLS habilitado
ALTER TABLE public.reunioes_blocos ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir que usuários autenticados gerenciem blocos de reunião
DROP POLICY IF EXISTS "Usuarios autenticados podem gerenciar blocos de reuniao" ON reunioes_blocos;

CREATE POLICY "Usuarios autenticados podem gerenciar blocos de reuniao" 
ON reunioes_blocos 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true
  )
);