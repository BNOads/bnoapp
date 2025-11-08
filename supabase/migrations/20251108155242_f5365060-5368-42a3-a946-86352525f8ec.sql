-- Criar tabela para arquivo de reunião
CREATE TABLE IF NOT EXISTS public.arquivo_reuniao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL UNIQUE,
  conteudo JSONB NOT NULL DEFAULT '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1}}'::jsonb,
  clientes_relacionados JSONB DEFAULT '[]'::jsonb,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.arquivo_reuniao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Todos podem visualizar arquivos"
  ON public.arquivo_reuniao
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar arquivos"
  ON public.arquivo_reuniao
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar arquivos"
  ON public.arquivo_reuniao
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Tabela para backups diários
CREATE TABLE IF NOT EXISTS public.arquivo_reuniao_backup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  conteudo JSONB NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  criado_por UUID REFERENCES auth.users(id),
  descricao TEXT DEFAULT 'Backup automático'
);

-- Enable RLS
ALTER TABLE public.arquivo_reuniao_backup ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Todos podem visualizar backups"
  ON public.arquivo_reuniao_backup
  FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode criar backups"
  ON public.arquivo_reuniao_backup
  FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_arquivo_reuniao_ano ON public.arquivo_reuniao(ano);
CREATE INDEX IF NOT EXISTS idx_arquivo_backup_ano ON public.arquivo_reuniao_backup(ano);
CREATE INDEX IF NOT EXISTS idx_arquivo_backup_criado ON public.arquivo_reuniao_backup(criado_em DESC);