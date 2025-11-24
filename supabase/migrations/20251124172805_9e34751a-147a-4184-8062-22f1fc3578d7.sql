-- Corrigir políticas RLS da tabela client_roles
-- As políticas antigas referenciam 'profiles' que não existe, devem usar 'colaboradores'

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins, gestores and CS can manage client roles" ON public.client_roles;
DROP POLICY IF EXISTS "Authenticated users can view client_roles" ON public.client_roles;

-- Criar novas políticas usando a tabela colaboradores
CREATE POLICY "Admins e gestores podem gerenciar atribuições"
ON public.client_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
      AND c.nivel_acesso IN ('admin', 'gestor_trafego', 'cs')
      AND c.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
      AND c.nivel_acesso IN ('admin', 'gestor_trafego', 'cs')
      AND c.ativo = true
  )
);

-- Política de leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver atribuições"
ON public.client_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.user_id = auth.uid()
      AND c.ativo = true
  )
);