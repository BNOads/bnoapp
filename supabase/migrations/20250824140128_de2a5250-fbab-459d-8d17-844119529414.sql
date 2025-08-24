-- Sistema de Gamificação e Gestão Completo

-- Tabela para logs de estudo
CREATE TABLE public.logs_estudo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aula_id UUID,
  treinamento_id UUID,
  tempo_estudado INTEGER NOT NULL DEFAULT 0, -- em minutos
  pontos_ganhos INTEGER NOT NULL DEFAULT 0,
  tipo_atividade TEXT NOT NULL DEFAULT 'video', -- video, quiz, leitura
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para streak de estudos
CREATE TABLE public.streaks_estudo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  streak_atual INTEGER NOT NULL DEFAULT 0,
  streak_maximo INTEGER NOT NULL DEFAULT 0,
  ultima_atividade DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para reuniões agendadas
CREATE TABLE public.reunioes_agendadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracao_prevista INTEGER, -- em minutos
  tipo TEXT NOT NULL DEFAULT 'reuniao', -- reuniao, treinamento, apresentacao
  cliente_id UUID,
  organizador_id UUID NOT NULL,
  participantes_obrigatorios UUID[] DEFAULT '{}',
  participantes_opcionais UUID[] DEFAULT '{}',
  link_meet TEXT,
  status TEXT NOT NULL DEFAULT 'agendada', -- agendada, em_andamento, finalizada, cancelada
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para presenças em reuniões
CREATE TABLE public.presencas_reunioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reuniao_id UUID NOT NULL,
  user_id UUID NOT NULL,
  horario_entrada TIMESTAMP WITH TIME ZONE,
  horario_saida TIMESTAMP WITH TIME ZONE,
  tempo_presenca INTEGER DEFAULT 0, -- em minutos
  pontos_ganhos INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ausente', -- presente, ausente, atrasado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reuniao_id, user_id)
);

-- Tabela para rankings
CREATE TABLE public.rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL, -- estudo, reunioes, geral
  periodo TEXT NOT NULL, -- semanal, mensal, geral
  posicao INTEGER,
  pontos_totais INTEGER NOT NULL DEFAULT 0,
  pontos_estudo INTEGER NOT NULL DEFAULT 0,
  pontos_reunioes INTEGER NOT NULL DEFAULT 0,
  streak_estudo INTEGER NOT NULL DEFAULT 0,
  reunioes_participadas INTEGER NOT NULL DEFAULT 0,
  tempo_estudo_total INTEGER NOT NULL DEFAULT 0, -- em minutos
  tempo_reunioes_total INTEGER NOT NULL DEFAULT 0, -- em minutos
  data_referencia DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tipo, periodo, data_referencia)
);

-- Tabela para conquistações/medalhas
CREATE TABLE public.conquistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL, -- estudo, reunioes, streak, geral
  condicao JSONB NOT NULL, -- {tipo: "streak", valor: 7, operador: ">="}
  icone TEXT,
  cor TEXT DEFAULT '#FFD700',
  pontos_bonus INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para conquistas dos usuários
CREATE TABLE public.user_conquistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conquista_id UUID NOT NULL,
  data_obtencao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pontos_ganhos INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, conquista_id)
);

-- Tabela para sistema de avisos
CREATE TABLE public.avisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info', -- info, alerta, sucesso, erro
  prioridade TEXT NOT NULL DEFAULT 'normal', -- baixa, normal, alta, critica
  destinatarios TEXT[] DEFAULT '{}', -- all, admin, colaborador, cliente, ou user_ids específicos
  canais JSONB DEFAULT '{}', -- {painel: true, slack: true, email: false}
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data_fim TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para leitura de avisos
CREATE TABLE public.avisos_leitura (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aviso_id UUID NOT NULL,
  user_id UUID NOT NULL,
  lido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, user_id)
);

-- Tabela para preferências de layout por cliente
CREATE TABLE public.clientes_layout (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL UNIQUE,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#2563eb',
  cor_secundaria TEXT DEFAULT '#64748b',
  cor_acento TEXT DEFAULT '#f59e0b',
  tema TEXT NOT NULL DEFAULT 'light', -- light, dark, auto
  fonte TEXT DEFAULT 'Inter',
  configuracoes JSONB DEFAULT '{}', -- configurações adicionais
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para webhooks do Slack
CREATE TABLE public.slack_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  canal TEXT,
  tipos_aviso TEXT[] DEFAULT '{}', -- quais tipos de aviso enviar
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_logs_estudo_user_id ON public.logs_estudo(user_id);
CREATE INDEX idx_logs_estudo_created_at ON public.logs_estudo(created_at);
CREATE INDEX idx_presencas_reunioes_user_id ON public.presencas_reunioes(user_id);
CREATE INDEX idx_rankings_user_periodo ON public.rankings(user_id, periodo, data_referencia);
CREATE INDEX idx_avisos_ativo_data ON public.avisos(ativo, data_inicio, data_fim);

-- Habilitar RLS
ALTER TABLE public.logs_estudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks_estudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes_agendadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas_reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_leitura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_layout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_webhooks ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança

-- Logs de estudo: usuários veem apenas seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios logs de estudo" ON public.logs_estudo
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios logs" ON public.logs_estudo
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os logs" ON public.logs_estudo
  FOR ALL USING (is_admin_with_valid_reason(auth.uid()));

-- Streaks: usuários veem apenas seus próprios dados
CREATE POLICY "Usuários podem ver seu próprio streak" ON public.streaks_estudo
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio streak" ON public.streaks_estudo
  FOR ALL USING (auth.uid() = user_id);

-- Reuniões agendadas: team access
CREATE POLICY "Team pode ver reuniões" ON public.reunioes_agendadas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.ativo = true)
  );

CREATE POLICY "Admins podem gerenciar reuniões" ON public.reunioes_agendadas
  FOR ALL USING (is_admin_with_valid_reason(auth.uid()));

-- Presenças: usuários veem suas presenças, admins veem tudo
CREATE POLICY "Usuários podem ver suas presenças" ON public.presencas_reunioes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode registrar presenças" ON public.presencas_reunioes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar presenças" ON public.presencas_reunioes
  FOR ALL USING (is_admin_with_valid_reason(auth.uid()));

-- Rankings: visível para team
CREATE POLICY "Team pode ver rankings" ON public.rankings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.ativo = true)
  );

-- Conquistas: visível para todos autenticados
CREATE POLICY "Usuários podem ver conquistas" ON public.conquistas
  FOR SELECT USING (ativo = true);

CREATE POLICY "Admins podem gerenciar conquistas" ON public.conquistas
  FOR ALL USING (is_admin_with_valid_reason(auth.uid()));

-- User conquistas: usuários veem suas conquistas
CREATE POLICY "Usuários podem ver suas conquistas" ON public.user_conquistas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode conceder conquistas" ON public.user_conquistas
  FOR INSERT WITH CHECK (true);

-- Avisos: visível baseado em destinatários
CREATE POLICY "Usuários podem ver avisos relevantes" ON public.avisos
  FOR SELECT USING (
    ativo = true 
    AND (data_inicio IS NULL OR data_inicio <= now())
    AND (data_fim IS NULL OR data_fim >= now())
    AND (
      'all' = ANY(destinatarios)
      OR auth.uid()::text = ANY(destinatarios)
      OR EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() 
        AND p.nivel_acesso::text = ANY(destinatarios)
      )
    )
  );

CREATE POLICY "Admins podem gerenciar avisos" ON public.avisos
  FOR ALL USING (is_admin_with_valid_reason(auth.uid()));

-- Leitura de avisos: usuários podem marcar como lido
CREATE POLICY "Usuários podem marcar avisos como lidos" ON public.avisos_leitura
  FOR ALL USING (auth.uid() = user_id);

-- Layout de clientes: acesso público para visualização
CREATE POLICY "Acesso público para layout de clientes" ON public.clientes_layout
  FOR SELECT USING (ativo = true);

CREATE POLICY "Admins podem gerenciar layouts" ON public.clientes_layout
  FOR ALL USING (is_admin_with_valid_reason(auth.uid()));

-- Slack webhooks: apenas admins
CREATE POLICY "Apenas admins podem gerenciar webhooks" ON public.slack_webhooks
  FOR ALL USING (is_admin_with_valid_reason(auth.uid()));

-- Triggers para atualizar updated_at
CREATE TRIGGER update_streaks_estudo_updated_at
  BEFORE UPDATE ON public.streaks_estudo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reunioes_agendadas_updated_at
  BEFORE UPDATE ON public.reunioes_agendadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rankings_updated_at
  BEFORE UPDATE ON public.rankings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_avisos_updated_at
  BEFORE UPDATE ON public.avisos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_layout_updated_at
  BEFORE UPDATE ON public.clientes_layout
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir algumas conquistas padrão
INSERT INTO public.conquistas (nome, descricao, tipo, condicao, icone, pontos_bonus) VALUES
('Primeira Aula', 'Completou sua primeira aula', 'estudo', '{"tipo": "aulas_concluidas", "valor": 1, "operador": ">="}', '🎯', 10),
('Estudante Dedicado', 'Completou 10 aulas', 'estudo', '{"tipo": "aulas_concluidas", "valor": 10, "operador": ">="}', '📚', 50),
('Maratonista', 'Estudou por 5 horas em uma semana', 'estudo', '{"tipo": "tempo_semanal", "valor": 300, "operador": ">="}', '🏃', 30),
('Streak Iniciante', 'Manteve uma sequência de 3 dias estudando', 'streak', '{"tipo": "streak_dias", "valor": 3, "operador": ">="}', '🔥', 20),
('Streak Veterano', 'Manteve uma sequência de 7 dias estudando', 'streak', '{"tipo": "streak_dias", "valor": 7, "operador": ">="}', '🌟', 100),
('Participativo', 'Participou de 10 reuniões', 'reunioes', '{"tipo": "reunioes_participadas", "valor": 10, "operador": ">="}', '🤝', 50),
('Pontual', 'Chegou no horário em 5 reuniões consecutivas', 'reunioes', '{"tipo": "reunioes_pontuais", "valor": 5, "operador": ">="}', '⏰', 25);