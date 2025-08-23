-- Atualizar políticas RLS para permitir acesso público aos dados do cliente
-- Permite visualização pública dos dados básicos do cliente
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON public.clientes;
CREATE POLICY "Acesso público para visualização de clientes"
ON public.clientes FOR SELECT
USING (true);

-- Permite visualização pública das gravações
DROP POLICY IF EXISTS "Usuários autenticados podem ver gravações" ON public.gravacoes;
CREATE POLICY "Acesso público para visualização de gravações"
ON public.gravacoes FOR SELECT
USING (true);

-- Permite visualização pública das reuniões
DROP POLICY IF EXISTS "Usuários autenticados podem ver reuniões" ON public.reunioes;
CREATE POLICY "Acesso público para visualização de reuniões"
ON public.reunioes FOR SELECT
USING (true);

-- Permite visualização pública das tarefas
DROP POLICY IF EXISTS "Usuários autenticados podem ver tarefas" ON public.tarefas;
CREATE POLICY "Acesso público para visualização de tarefas"
ON public.tarefas FOR SELECT
USING (true);

-- Permite visualização pública dos links importantes
DROP POLICY IF EXISTS "Usuários autenticados podem ver links" ON public.links_importantes;
CREATE POLICY "Acesso público para visualização de links"
ON public.links_importantes FOR SELECT
USING (true);