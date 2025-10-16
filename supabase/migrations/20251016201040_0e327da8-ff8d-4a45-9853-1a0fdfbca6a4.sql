-- Criar enum para tipo de medição dos desafios
CREATE TYPE tipo_medicao_desafio AS ENUM ('quantidade_acoes', 'pontuacao', 'check_in_diario');

-- Criar enum para critério de vitória
CREATE TYPE criterio_vitoria AS ENUM ('maior_numero_acoes', 'maior_pontuacao', 'maior_consistencia');

-- Tabela de desafios mensais
CREATE TABLE public.gamificacao_desafios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo_medicao tipo_medicao_desafio NOT NULL DEFAULT 'pontuacao',
  criterio_vitoria criterio_vitoria NOT NULL DEFAULT 'maior_pontuacao',
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  notificado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de ações registradas pelos colaboradores
CREATE TABLE public.gamificacao_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desafio_id UUID NOT NULL REFERENCES public.gamificacao_desafios(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  comprovacao TEXT,
  pontos INTEGER NOT NULL DEFAULT 5,
  aprovado BOOLEAN DEFAULT true,
  data_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de ranking (calculada automaticamente)
CREATE TABLE public.gamificacao_ranking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL,
  desafio_id UUID NOT NULL REFERENCES public.gamificacao_desafios(id) ON DELETE CASCADE,
  total_pontos INTEGER NOT NULL DEFAULT 0,
  total_acoes INTEGER NOT NULL DEFAULT 0,
  posicao INTEGER,
  ultima_acao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, desafio_id)
);

-- Tabela de conquistas/medalhas dos colaboradores
CREATE TABLE public.gamificacao_conquistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL,
  desafio_id UUID NOT NULL REFERENCES public.gamificacao_desafios(id) ON DELETE CASCADE,
  posicao INTEGER NOT NULL,
  pontos_finais INTEGER NOT NULL,
  acoes_finais INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, desafio_id)
);

-- Índices para melhor performance
CREATE INDEX idx_gamificacao_acoes_desafio ON public.gamificacao_acoes(desafio_id);
CREATE INDEX idx_gamificacao_acoes_colaborador ON public.gamificacao_acoes(colaborador_id);
CREATE INDEX idx_gamificacao_ranking_desafio ON public.gamificacao_ranking(desafio_id);
CREATE INDEX idx_gamificacao_ranking_colaborador ON public.gamificacao_ranking(colaborador_id);

-- Habilitar RLS
ALTER TABLE public.gamificacao_desafios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamificacao_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamificacao_ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamificacao_conquistas ENABLE ROW LEVEL SECURITY;

-- Policies para gamificacao_desafios
CREATE POLICY "Todos podem ver desafios ativos"
ON public.gamificacao_desafios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Admins e gestores podem criar desafios"
ON public.gamificacao_desafios FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() 
    AND nivel_acesso IN ('admin', 'gestor_trafego')
    AND ativo = true
  )
);

CREATE POLICY "Admins e gestores podem atualizar desafios"
ON public.gamificacao_desafios FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() 
    AND nivel_acesso IN ('admin', 'gestor_trafego')
    AND ativo = true
  )
);

-- Policies para gamificacao_acoes
CREATE POLICY "Todos podem ver ações aprovadas"
ON public.gamificacao_acoes FOR SELECT
USING (
  aprovado = true AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Colaboradores podem registrar suas ações"
ON public.gamificacao_acoes FOR INSERT
WITH CHECK (
  colaborador_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Admins podem atualizar ações"
ON public.gamificacao_acoes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() 
    AND nivel_acesso = 'admin'
    AND ativo = true
  )
);

-- Policies para gamificacao_ranking
CREATE POLICY "Todos podem ver ranking"
ON public.gamificacao_ranking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Sistema pode atualizar ranking"
ON public.gamificacao_ranking FOR ALL
USING (true);

-- Policies para gamificacao_conquistas
CREATE POLICY "Todos podem ver conquistas"
ON public.gamificacao_conquistas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Sistema pode criar conquistas"
ON public.gamificacao_conquistas FOR INSERT
WITH CHECK (true);

-- Função para atualizar ranking automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_ranking_gamificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir ou atualizar o ranking do colaborador
  INSERT INTO public.gamificacao_ranking (
    colaborador_id,
    desafio_id,
    total_pontos,
    total_acoes,
    ultima_acao
  )
  VALUES (
    NEW.colaborador_id,
    NEW.desafio_id,
    NEW.pontos,
    1,
    NEW.data_registro
  )
  ON CONFLICT (colaborador_id, desafio_id)
  DO UPDATE SET
    total_pontos = gamificacao_ranking.total_pontos + NEW.pontos,
    total_acoes = gamificacao_ranking.total_acoes + 1,
    ultima_acao = NEW.data_registro,
    updated_at = now();

  -- Recalcular posições para o desafio
  WITH ranked AS (
    SELECT 
      colaborador_id,
      ROW_NUMBER() OVER (ORDER BY total_pontos DESC, total_acoes DESC) as nova_posicao
    FROM public.gamificacao_ranking
    WHERE desafio_id = NEW.desafio_id
  )
  UPDATE public.gamificacao_ranking r
  SET posicao = ranked.nova_posicao
  FROM ranked
  WHERE r.colaborador_id = ranked.colaborador_id
    AND r.desafio_id = NEW.desafio_id;

  RETURN NEW;
END;
$$;

-- Trigger para atualizar ranking quando uma ação for aprovada
CREATE TRIGGER trigger_atualizar_ranking
AFTER INSERT ON public.gamificacao_acoes
FOR EACH ROW
WHEN (NEW.aprovado = true)
EXECUTE FUNCTION public.atualizar_ranking_gamificacao();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_gamificacao_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_desafios_updated_at
BEFORE UPDATE ON public.gamificacao_desafios
FOR EACH ROW
EXECUTE FUNCTION public.update_gamificacao_updated_at();

CREATE TRIGGER update_ranking_updated_at
BEFORE UPDATE ON public.gamificacao_ranking
FOR EACH ROW
EXECUTE FUNCTION public.update_gamificacao_updated_at();