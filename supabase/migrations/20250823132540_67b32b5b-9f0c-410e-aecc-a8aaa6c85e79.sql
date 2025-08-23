-- Criar enum para tipos de usuário/níveis de acesso
CREATE TYPE public.nivel_acesso AS ENUM ('admin', 'gestor_trafego', 'cs', 'designer');

-- Criar enum para categoria de clientes
CREATE TYPE public.categoria_cliente AS ENUM ('negocio_local', 'infoproduto');

-- Criar enum para estado civil
CREATE TYPE public.estado_civil AS ENUM ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel');

-- Criar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  nivel_acesso nivel_acesso NOT NULL DEFAULT 'cs',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de colaboradores com informações detalhadas
CREATE TABLE public.colaboradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  data_nascimento DATE,
  estado_civil estado_civil,
  cpf TEXT UNIQUE,
  rg TEXT,
  endereco TEXT,
  tamanho_camisa TEXT,
  telefone_contato TEXT,
  telefone_proximo TEXT,
  cnpj TEXT,
  razao_social TEXT,
  conta_bancaria TEXT,
  pix TEXT,
  nivel_acesso nivel_acesso NOT NULL DEFAULT 'cs',
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_admissao DATE DEFAULT CURRENT_DATE,
  tempo_plataforma INTEGER DEFAULT 0, -- em minutos
  progresso_treinamentos JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria categoria_cliente NOT NULL,
  nicho TEXT,
  etapa_atual TEXT,
  progresso_etapa INTEGER DEFAULT 0, -- porcentagem 0-100
  funis_trabalhando TEXT[],
  link_painel TEXT UNIQUE,
  pasta_drive_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  total_acessos INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela de documentos
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'sop', 'contrato', 'checklist', 'template'
  conteudo TEXT,
  url_arquivo TEXT,
  versao INTEGER DEFAULT 1,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de reuniões
CREATE TABLE public.reunioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracao INTEGER, -- em minutos
  link_gravacao TEXT,
  link_meet TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  participantes UUID[],
  status TEXT DEFAULT 'agendada', -- 'agendada', 'realizada', 'cancelada'
  resumo_ia TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de gravações
CREATE TABLE public.gravacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  url_gravacao TEXT NOT NULL,
  duracao INTEGER, -- em segundos
  thumbnail_url TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  reuniao_id UUID REFERENCES public.reunioes(id) ON DELETE SET NULL,
  visualizacoes INTEGER DEFAULT 0,
  tags TEXT[],
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de interações/timeline
CREATE TABLE public.interacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'reuniao', 'tarefa', 'upload', 'acesso_painel', 'gravacao'
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_interacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  reuniao_id UUID REFERENCES public.reunioes(id) ON DELETE SET NULL,
  gravacao_id UUID REFERENCES public.gravacoes(id) ON DELETE SET NULL,
  documento_id UUID REFERENCES public.documentos(id) ON DELETE SET NULL,
  metadados JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de uploads de clientes
CREATE TABLE public.uploads_clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho_arquivo BIGINT,
  url_drive TEXT,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gravacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads_clientes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os perfis" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.nivel_acesso = 'admin'
    )
  );

-- Políticas RLS para colaboradores
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.colaboradores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios dados" ON public.colaboradores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar todos colaboradores" ON public.colaboradores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.nivel_acesso = 'admin'
    )
  );

-- Políticas RLS para clientes (todos usuários autenticados podem ver)
CREATE POLICY "Usuários autenticados podem ver clientes" ON public.clientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem criar clientes" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins e gestores podem atualizar clientes" ON public.clientes
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.nivel_acesso IN ('admin', 'gestor_trafego')
    )
  );

-- Políticas RLS para documentos
CREATE POLICY "Usuários autenticados podem ver documentos" ON public.documentos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar documentos" ON public.documentos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores podem atualizar seus documentos" ON public.documentos
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Políticas RLS para reuniões
CREATE POLICY "Usuários autenticados podem ver reuniões" ON public.reunioes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar reuniões" ON public.reunioes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores podem atualizar suas reuniões" ON public.reunioes
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Políticas RLS para gravações
CREATE POLICY "Usuários autenticados podem ver gravações" ON public.gravacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar gravações" ON public.gravacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores podem atualizar suas gravações" ON public.gravacoes
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Políticas RLS para interações
CREATE POLICY "Usuários autenticados podem ver interações" ON public.interacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar interações" ON public.interacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Políticas RLS para uploads de clientes
CREATE POLICY "Usuários autenticados podem ver uploads" ON public.uploads_clientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem fazer uploads" ON public.uploads_clientes
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by IS NULL OR auth.uid() = uploaded_by
  );

-- Criar função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar timestamps automaticamente
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaboradores_updated_at
  BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reunioes_updated_at
  BEFORE UPDATE ON public.reunioes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gravacoes_updated_at
  BEFORE UPDATE ON public.gravacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX idx_clientes_categoria ON public.clientes(categoria);
CREATE INDEX idx_clientes_ativo ON public.clientes(ativo);
CREATE INDEX idx_clientes_created_by ON public.clientes(created_by);
CREATE INDEX idx_reunioes_cliente_id ON public.reunioes(cliente_id);
CREATE INDEX idx_reunioes_data_hora ON public.reunioes(data_hora);
CREATE INDEX idx_gravacoes_cliente_id ON public.gravacoes(cliente_id);
CREATE INDEX idx_interacoes_cliente_id ON public.interacoes(cliente_id);
CREATE INDEX idx_interacoes_tipo ON public.interacoes(tipo);
CREATE INDEX idx_interacoes_data ON public.interacoes(data_interacao);

-- Criar função para gerar link do painel automaticamente
CREATE OR REPLACE FUNCTION public.generate_painel_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.link_painel IS NULL THEN
    NEW.link_painel = 'https://app.bnoads.com/painel/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar link do painel automaticamente
CREATE TRIGGER generate_painel_link_trigger
  BEFORE INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.generate_painel_link();