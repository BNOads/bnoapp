-- Remover políticas públicas SELECT e substituir com acesso autenticado

-- Colaboradores
DROP POLICY IF EXISTS "Usuarios autenticados podem ver todos colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos colaboradores" ON public.colaboradores;

CREATE POLICY "Authenticated users can view colaboradores"
ON public.colaboradores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Clientes
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Acesso público ao painel do cliente" ON public.clientes;

CREATE POLICY "Authenticated users can view clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Debriefings
DROP POLICY IF EXISTS "Acesso público a todos os debriefings" ON public.debriefings;

CREATE POLICY "Authenticated users can view debriefings"
ON public.debriefings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Lancamentos
DROP POLICY IF EXISTS "Usuários autenticados podem ver lançamentos" ON public.lancamentos;

CREATE POLICY "Authenticated users can view lancamentos"
ON public.lancamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Gravacoes
DROP POLICY IF EXISTS "Acesso público a gravações do painel" ON public.gravacoes;
DROP POLICY IF EXISTS "Usuarios autenticados podem ver gravacoes" ON public.gravacoes;

CREATE POLICY "Authenticated users can view gravacoes"
ON public.gravacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Links Importantes
DROP POLICY IF EXISTS "Acesso público a links importantes do painel" ON public.links_importantes;
DROP POLICY IF EXISTS "Usuarios autenticados podem ver links importantes" ON public.links_importantes;

CREATE POLICY "Authenticated users can view links_importantes"
ON public.links_importantes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Reunioes
DROP POLICY IF EXISTS "Usuarios autenticados podem ver reunioes" ON public.reunioes;

CREATE POLICY "Authenticated users can view reunioes"
ON public.reunioes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Criativos
DROP POLICY IF EXISTS "Usuarios autenticados podem ver criativos" ON public.criativos;

CREATE POLICY "Authenticated users can view criativos"
ON public.criativos
FOR SELECT
TO authenticated
USING (
  ativo = true AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Treinamentos
DROP POLICY IF EXISTS "Usuários autenticados podem ver treinamentos" ON public.treinamentos;

CREATE POLICY "Authenticated users can view treinamentos"
ON public.treinamentos
FOR SELECT
TO authenticated
USING (
  ativo = true AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Aulas
DROP POLICY IF EXISTS "Usuários autenticados podem ver aulas ativas" ON public.aulas;

CREATE POLICY "Authenticated users can view aulas"
ON public.aulas
FOR SELECT
TO authenticated
USING (
  ativo = true AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Kickoffs
DROP POLICY IF EXISTS "Usuarios autenticados podem ver kickoffs" ON public.kickoffs;

CREATE POLICY "Authenticated users can view kickoffs"
ON public.kickoffs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Interacoes
DROP POLICY IF EXISTS "Usuarios autenticados podem ver interacoes" ON public.interacoes;

CREATE POLICY "Authenticated users can view interacoes"
ON public.interacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Documentos (manter acesso público apenas para POPs com link ativo)
DROP POLICY IF EXISTS "Colaboradores podem gerenciar todos os documentos" ON public.documentos;

CREATE POLICY "Authenticated users can view documentos"
ON public.documentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  ) OR (categoria_documento = 'pop' AND link_publico_ativo = true)
);

-- Avisos
DROP POLICY IF EXISTS "Usuários podem ver avisos relevantes" ON public.avisos;

CREATE POLICY "Authenticated users can view avisos"
ON public.avisos
FOR SELECT
TO authenticated
USING (
  ativo = true 
  AND (data_inicio IS NULL OR data_inicio <= now())
  AND (data_fim IS NULL OR data_fim >= now())
  AND (
    'all' = ANY(destinatarios) 
    OR auth.uid()::text = ANY(destinatarios)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
      AND p.nivel_acesso::text = ANY(avisos.destinatarios)
    )
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Client Roles
DROP POLICY IF EXISTS "Authenticated users can view client roles" ON public.client_roles;

CREATE POLICY "Authenticated users can view client_roles"
ON public.client_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.nivel_acesso IN ('admin', 'gestor_trafego', 'cs')
    AND p.ativo = true
  )
);

-- Reunioes Agendadas
DROP POLICY IF EXISTS "Team pode ver reuniões" ON public.reunioes_agendadas;

CREATE POLICY "Authenticated users can view reunioes_agendadas"
ON public.reunioes_agendadas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Reunioes Documentos
DROP POLICY IF EXISTS "Usuarios autenticados podem ver documentos de reuniao" ON public.reunioes_documentos;

CREATE POLICY "Authenticated users can view reunioes_documentos"
ON public.reunioes_documentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- Debrief Metrics
DROP POLICY IF EXISTS "Usuários autenticados podem ver métricas" ON public.debrief_metrics;

CREATE POLICY "Authenticated users can view debrief_metrics"
ON public.debrief_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);