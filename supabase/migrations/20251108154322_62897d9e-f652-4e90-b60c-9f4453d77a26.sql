-- Criar tabela para documento de reunião
CREATE TABLE IF NOT EXISTS public.documento_reuniao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL UNIQUE,
  conteudo_yjs TEXT,
  conteudo_json JSONB,
  clientes_relacionados JSONB DEFAULT '[]'::jsonb,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.documento_reuniao ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Todos podem visualizar documentos" ON public.documento_reuniao;
DROP POLICY IF EXISTS "Usuários autenticados podem criar documentos" ON public.documento_reuniao;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar documentos" ON public.documento_reuniao;

-- Policies
CREATE POLICY "Todos podem visualizar documentos"
  ON public.documento_reuniao
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar documentos"
  ON public.documento_reuniao
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar documentos"
  ON public.documento_reuniao
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Tabela para colaboração Yjs
CREATE TABLE IF NOT EXISTS public.documento_reuniao_colaboracao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.documento_reuniao(id) ON DELETE CASCADE,
  conteudo_yjs TEXT,
  conteudo_json JSONB,
  versao INTEGER DEFAULT 1,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_por UUID REFERENCES auth.users(id),
  UNIQUE(documento_id)
);

-- Enable RLS
ALTER TABLE public.documento_reuniao_colaboracao ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Todos podem visualizar colaboração" ON public.documento_reuniao_colaboracao;
DROP POLICY IF EXISTS "Usuários autenticados podem criar colaboração" ON public.documento_reuniao_colaboracao;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar colaboração" ON public.documento_reuniao_colaboracao;

-- Policies
CREATE POLICY "Todos podem visualizar colaboração"
  ON public.documento_reuniao_colaboracao
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar colaboração"
  ON public.documento_reuniao_colaboracao
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar colaboração"
  ON public.documento_reuniao_colaboracao
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Tabela para snapshots/backup
CREATE TABLE IF NOT EXISTS public.documento_reuniao_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.documento_reuniao(id) ON DELETE CASCADE,
  conteudo_yjs TEXT,
  conteudo_json JSONB,
  descricao TEXT,
  versao INTEGER,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.documento_reuniao_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Todos podem visualizar snapshots" ON public.documento_reuniao_snapshots;
DROP POLICY IF EXISTS "Usuários autenticados podem criar snapshots" ON public.documento_reuniao_snapshots;

-- Policies
CREATE POLICY "Todos podem visualizar snapshots"
  ON public.documento_reuniao_snapshots
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar snapshots"
  ON public.documento_reuniao_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Criar índices apenas se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documento_reuniao_ano') THEN
    CREATE INDEX idx_documento_reuniao_ano ON public.documento_reuniao(ano);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documento_colaboracao_documento') THEN
    CREATE INDEX idx_documento_colaboracao_documento ON public.documento_reuniao_colaboracao(documento_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documento_snapshots_documento') THEN
    CREATE INDEX idx_documento_snapshots_documento ON public.documento_reuniao_snapshots(documento_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documento_snapshots_criado') THEN
    CREATE INDEX idx_documento_snapshots_criado ON public.documento_reuniao_snapshots(criado_em DESC);
  END IF;
END $$;