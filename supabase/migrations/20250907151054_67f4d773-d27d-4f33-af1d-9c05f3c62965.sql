-- Verificar e ajustar políticas para orçamentos_funil
DROP POLICY IF EXISTS "Colaboradores podem gerenciar orçamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Acesso público a orçamentos do painel" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Usuarios autenticados podem ver orcamentos" ON public.orcamentos_funil;

-- Políticas para orçamentos_funil - colaboradores podem fazer tudo
CREATE POLICY "Colaboradores podem ver orcamentos" 
ON public.orcamentos_funil 
FOR SELECT 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);

CREATE POLICY "Colaboradores podem criar orcamentos" 
ON public.orcamentos_funil 
FOR INSERT 
WITH CHECK (
  (auth.uid() = created_by) AND
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);

CREATE POLICY "Colaboradores podem atualizar orcamentos" 
ON public.orcamentos_funil 
FOR UPDATE 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);

CREATE POLICY "Colaboradores podem deletar orcamentos" 
ON public.orcamentos_funil 
FOR DELETE 
USING (
  ((auth.uid() = created_by) OR is_admin_with_valid_reason(auth.uid())) AND
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);

-- Manter acesso público para o painel
CREATE POLICY "Acesso publico a orcamentos do painel" 
ON public.orcamentos_funil 
FOR SELECT 
USING (true);

-- Verificar e ajustar políticas para documentos/referências
DROP POLICY IF EXISTS "Colaboradores podem criar documentos" ON public.documentos;
DROP POLICY IF EXISTS "Colaboradores podem atualizar documentos" ON public.documentos;
DROP POLICY IF EXISTS "Usuarios autenticados podem ver documentos" ON public.documentos;

-- Políticas para documentos - colaboradores podem criar e editar
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