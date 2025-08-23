-- Criar tabela para tarefas
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cliente_id UUID REFERENCES public.clientes(id),
  atribuido_para UUID,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  prioridade TEXT NOT NULL DEFAULT 'media',
  data_vencimento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tipo TEXT NOT NULL DEFAULT 'equipe' -- 'equipe' ou 'cliente'
);

-- Criar tabela para links importantes
CREATE TABLE public.links_importantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  tipo TEXT NOT NULL DEFAULT 'geral',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar colunas ao cliente para novos campos
ALTER TABLE public.clientes 
ADD COLUMN status_cliente TEXT DEFAULT 'ativo',
ADD COLUMN whatsapp_grupo_url TEXT,
ADD COLUMN observacoes TEXT;

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_importantes ENABLE ROW LEVEL SECURITY;

-- Policies para tarefas
CREATE POLICY "Usuários autenticados podem ver tarefas"
ON public.tarefas FOR SELECT
USING (true);

CREATE POLICY "Usuários podem criar tarefas"
ON public.tarefas FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores podem atualizar suas tarefas"
ON public.tarefas FOR UPDATE
USING (auth.uid() = created_by);

-- Policies para links importantes
CREATE POLICY "Usuários autenticados podem ver links"
ON public.links_importantes FOR SELECT
USING (true);

CREATE POLICY "Usuários podem criar links"
ON public.links_importantes FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores podem atualizar seus links"
ON public.links_importantes FOR UPDATE
USING (auth.uid() = created_by);

-- Triggers para updated_at
CREATE TRIGGER update_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_links_importantes_updated_at
  BEFORE UPDATE ON public.links_importantes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();