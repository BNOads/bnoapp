-- Remover todas as políticas existentes de orçamentos_funil
DROP POLICY IF EXISTS "Colaboradores podem ver orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Colaboradores podem criar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Colaboradores podem atualizar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Colaboradores podem deletar orcamentos" ON public.orcamentos_funil;
DROP POLICY IF EXISTS "Acesso publico a orcamentos do painel" ON public.orcamentos_funil;

-- Criar políticas completas para orçamentos_funil
CREATE POLICY "Colaboradores podem gerenciar todos os orcamentos" 
ON public.orcamentos_funil 
FOR ALL 
USING (
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
) 
WITH CHECK (
  (auth.uid() = created_by) AND
  EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))
);

-- Manter acesso público para o painel
CREATE POLICY "Acesso publico para painel cliente" 
ON public.orcamentos_funil 
FOR SELECT 
USING (true);

-- Remover todas as políticas existentes de documentos
DROP POLICY IF EXISTS "Colaboradores podem criar documentos" ON public.documentos;
DROP POLICY IF EXISTS "Colaboradores podem atualizar documentos" ON public.documentos;
DROP POLICY IF EXISTS "Usuarios autenticados podem ver documentos" ON public.documentos;

-- Criar políticas completas para documentos/referências
CREATE POLICY "Colaboradores podem gerenciar todos os documentos" 
ON public.documentos 
FOR ALL 
USING (
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true)))) OR 
  ((categoria_documento = 'pop'::text) AND (link_publico_ativo = true))
) 
WITH CHECK (
  (auth.uid() = created_by) AND
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);