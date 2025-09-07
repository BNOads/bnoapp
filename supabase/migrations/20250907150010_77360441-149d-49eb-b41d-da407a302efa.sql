-- Atualizar políticas para permitir colaboradores gerenciarem orçamentos de funis
DROP POLICY IF EXISTS "Admins podem gerenciar orçamentos" ON public.orcamentos_funil;

-- Nova política para orçamentos - colaboradores podem criar e editar
CREATE POLICY "Colaboradores podem gerenciar orçamentos" 
ON public.orcamentos_funil 
FOR ALL 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);

-- Atualizar políticas para permitir colaboradores gerenciarem documentos/referências
DROP POLICY IF EXISTS "Usuarios autenticados podem ver documentos" ON public.documentos;
DROP POLICY IF EXISTS "Criadores podem atualizar seus documentos" ON public.documentos;
DROP POLICY IF EXISTS "Usuários podem criar documentos" ON public.documentos;

-- Novas políticas para documentos/referências
CREATE POLICY "Usuarios autenticados podem ver documentos" 
ON public.documentos 
FOR SELECT 
USING (
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))) OR 
  ((categoria_documento = 'pop'::text) AND (link_publico_ativo = true))
);

CREATE POLICY "Colaboradores podem criar documentos" 
ON public.documentos 
FOR INSERT 
WITH CHECK (
  (auth.uid() = created_by) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);

CREATE POLICY "Colaboradores podem atualizar documentos" 
ON public.documentos 
FOR UPDATE 
USING (
  ((auth.uid() = created_by) OR is_admin_with_valid_reason(auth.uid())) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);

-- Atualizar políticas para permitir colaboradores alterarem seus perfis
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;

CREATE POLICY "Usuarios podem atualizar seu proprio perfil" 
ON public.profiles 
FOR UPDATE 
USING (
  (auth.uid() = user_id) AND
  (ativo = true)
);

-- Atualizar políticas para permitir colaboradores alterarem dados próprios
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON public.colaboradores;

CREATE POLICY "Colaboradores podem atualizar seus proprios dados" 
ON public.colaboradores 
FOR UPDATE 
USING (
  (auth.uid() = user_id) AND
  (ativo = true)
);