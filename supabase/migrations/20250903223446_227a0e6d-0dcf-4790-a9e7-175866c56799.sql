-- Fix RLS policies for critical security vulnerabilities

-- 1. Fix profiles table to prevent privilege escalation
DROP POLICY IF EXISTS "Sistema pode inserir perfis" ON public.profiles;
CREATE POLICY "Usuarios podem inserir apenas seu proprio perfil com nivel CS" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND nivel_acesso = 'cs');

-- Add unique constraint to prevent duplicate profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 2. Fix clientes table - restrict public access to authenticated users only
DROP POLICY IF EXISTS "Acesso público para visualização de clientes" ON public.clientes;
CREATE POLICY "Usuarios autenticados podem ver clientes" 
ON public.clientes 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 3. Fix reunioes table - restrict public access
DROP POLICY IF EXISTS "Acesso público para visualização de reuniões" ON public.reunioes;
CREATE POLICY "Usuarios autenticados podem ver reunioes" 
ON public.reunioes 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 4. Fix gravacoes table - restrict public access
DROP POLICY IF EXISTS "Acesso público para visualização de gravações" ON public.gravacoes;
CREATE POLICY "Usuarios autenticados podem ver gravacoes" 
ON public.gravacoes 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 5. Fix orcamentos_funil table - restrict public access
DROP POLICY IF EXISTS "Acesso público para visualização de orçamentos" ON public.orcamentos_funil;
CREATE POLICY "Usuarios autenticados podem ver orcamentos" 
ON public.orcamentos_funil 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 6. Fix historico_orcamentos table - restrict public access
DROP POLICY IF EXISTS "Acesso público para visualização de histórico" ON public.historico_orcamentos;
CREATE POLICY "Usuarios autenticados podem ver historico orcamentos" 
ON public.historico_orcamentos 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 7. Fix tarefas table - restrict public access
DROP POLICY IF EXISTS "Acesso público para visualização de tarefas" ON public.tarefas;
CREATE POLICY "Usuarios autenticados podem ver tarefas" 
ON public.tarefas 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 8. Fix documentos table - restrict to authenticated users only
DROP POLICY IF EXISTS "Usuários autenticados podem ver documentos" ON public.documentos;
CREATE POLICY "Usuarios autenticados podem ver documentos" 
ON public.documentos 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 9. Fix interacoes table - restrict to authenticated users only
DROP POLICY IF EXISTS "Usuários autenticados podem ver interações" ON public.interacoes;
CREATE POLICY "Usuarios autenticados podem ver interacoes" 
ON public.interacoes 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 10. Fix uploads_clientes table - restrict to authenticated users only
DROP POLICY IF EXISTS "Usuários autenticados podem ver uploads" ON public.uploads_clientes;
CREATE POLICY "Usuarios autenticados podem ver uploads" 
ON public.uploads_clientes 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 11. Fix links_importantes table - restrict to authenticated users only
DROP POLICY IF EXISTS "Acesso público para visualização de links" ON public.links_importantes;
CREATE POLICY "Usuarios autenticados podem ver links importantes" 
ON public.links_importantes 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 12. Fix creatives table - CRITICAL: Remove dangerous "ALL true" policy
DROP POLICY IF EXISTS "Equipe pode gerenciar criativos" ON public.creatives;
CREATE POLICY "Usuarios autenticados podem ver criativos" 
ON public.creatives 
FOR SELECT 
USING (archived = false AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

CREATE POLICY "Admins podem inserir criativos" 
ON public.creatives 
FOR INSERT 
WITH CHECK (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Admins podem atualizar criativos" 
ON public.creatives 
FOR UPDATE 
USING (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Admins podem excluir criativos" 
ON public.creatives 
FOR DELETE 
USING (is_admin_with_valid_reason(auth.uid()));

-- 13. Fix criativos table - restrict public access
DROP POLICY IF EXISTS "Acesso público para visualização de criativos" ON public.criativos;
CREATE POLICY "Usuarios autenticados podem ver criativos" 
ON public.criativos 
FOR SELECT 
USING (ativo = true AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));

-- 14. Fix referencias_criativos table - restrict public access to only public links
DROP POLICY IF EXISTS "Acesso público para visualização de referências" ON public.referencias_criativos;
CREATE POLICY "Acesso publico apenas para referencias com link publico" 
ON public.referencias_criativos 
FOR SELECT 
USING (ativo = true AND link_publico IS NOT NULL);

CREATE POLICY "Usuarios autenticados podem ver referencias" 
ON public.referencias_criativos 
FOR SELECT 
USING (ativo = true AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.ativo = true));