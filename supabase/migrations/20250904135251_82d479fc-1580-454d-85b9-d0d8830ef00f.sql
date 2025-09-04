-- Políticas para acesso público aos componentes do painel

-- Permitir acesso público a gravações
CREATE POLICY "Acesso público a gravações do painel" 
ON public.gravacoes 
FOR SELECT 
USING (true);

-- Permitir acesso público a links importantes
CREATE POLICY "Acesso público a links importantes do painel" 
ON public.links_importantes 
FOR SELECT 
USING (true);

-- Permitir acesso público a tarefas
CREATE POLICY "Acesso público a tarefas do painel" 
ON public.tarefas 
FOR SELECT 
USING (true);

-- Permitir acesso público a orçamentos por funil
CREATE POLICY "Acesso público a orçamentos do painel" 
ON public.orcamentos_funil 
FOR SELECT 
USING (true);