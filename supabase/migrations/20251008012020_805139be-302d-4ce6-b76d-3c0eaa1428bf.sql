-- Remover a tabela tarefas antiga se existir
DROP TABLE IF EXISTS public.tarefas CASCADE;

-- Criar ENUM para prioridade
DO $$ BEGIN
  CREATE TYPE prioridade_tarefa AS ENUM ('copa_mundo', 'libertadores', 'brasileirao');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar ENUM para status
DO $$ BEGIN
  CREATE TYPE status_tarefa AS ENUM ('pendente', 'em_andamento', 'concluida', 'adiada');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar ENUM para recorrência
DO $$ BEGIN
  CREATE TYPE recorrencia_tarefa AS ENUM ('nenhuma', 'diaria', 'semanal', 'mensal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de tarefas
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cliente_id UUID REFERENCES public.clientes(id),
  responsavel_id UUID REFERENCES public.colaboradores(id),
  data_vencimento DATE NOT NULL,
  prioridade prioridade_tarefa NOT NULL DEFAULT 'brasileirao',
  status status_tarefa NOT NULL DEFAULT 'pendente',
  recorrencia recorrencia_tarefa NOT NULL DEFAULT 'nenhuma',
  eh_tarefa_bnoapp BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de subtarefas
CREATE TABLE public.subtarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  concluida BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de comentários
CREATE TABLE public.comentarios_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES public.colaboradores(id),
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de anexos
CREATE TABLE public.anexos_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho_arquivo INTEGER,
  uploaded_by UUID NOT NULL REFERENCES public.colaboradores(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos_tarefas ENABLE ROW LEVEL SECURITY;

-- Políticas para tarefas
CREATE POLICY "Usuários autenticados podem ver tarefas"
ON public.tarefas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.ativo = true
  )
);

CREATE POLICY "Usuários podem criar tarefas"
ON public.tarefas FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores e admins podem atualizar tarefas"
ON public.tarefas FOR UPDATE
USING (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Criadores e admins podem deletar tarefas"
ON public.tarefas FOR DELETE
USING (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid()));

-- Políticas para subtarefas
CREATE POLICY "Usuários podem ver subtarefas"
ON public.subtarefas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tarefas t
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE t.id = subtarefas.tarefa_id AND p.ativo = true
  )
);

CREATE POLICY "Usuários podem criar subtarefas"
ON public.subtarefas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tarefas
    WHERE id = tarefa_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar subtarefas"
ON public.subtarefas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tarefas
    WHERE id = tarefa_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar subtarefas"
ON public.subtarefas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tarefas
    WHERE id = tarefa_id AND created_by = auth.uid()
  )
);

-- Políticas para comentários
CREATE POLICY "Usuários podem ver comentários"
ON public.comentarios_tarefas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tarefas t
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE t.id = comentarios_tarefas.tarefa_id AND p.ativo = true
  )
);

CREATE POLICY "Usuários podem criar comentários"
ON public.comentarios_tarefas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN colaboradores c ON c.user_id = p.user_id
    WHERE c.id = autor_id AND p.user_id = auth.uid()
  )
);

-- Políticas para anexos
CREATE POLICY "Usuários podem ver anexos"
ON public.anexos_tarefas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tarefas t
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE t.id = anexos_tarefas.tarefa_id AND p.ativo = true
  )
);

CREATE POLICY "Usuários podem criar anexos"
ON public.anexos_tarefas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN colaboradores c ON c.user_id = p.user_id
    WHERE c.id = uploaded_by AND p.user_id = auth.uid()
  )
);

-- Triggers para updated_at
CREATE TRIGGER update_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();