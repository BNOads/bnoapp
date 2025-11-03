-- Adicionar política para permitir acesso público de leitura às tarefas
-- Isso permitirá que clientes vejam suas tarefas mesmo sem autenticação

CREATE POLICY "Acesso público de leitura às tarefas"
ON public.tarefas
FOR SELECT
TO public
USING (true);