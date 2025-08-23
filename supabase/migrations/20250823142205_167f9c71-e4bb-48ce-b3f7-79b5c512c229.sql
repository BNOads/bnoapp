-- Criar tabela de aulas
CREATE TABLE public.aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treinamento_id UUID NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  url_youtube TEXT NOT NULL,
  duracao INTEGER, -- duração em segundos
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Criar tabela de progresso dos usuários
CREATE TABLE public.progresso_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  tempo_assistido INTEGER DEFAULT 0, -- tempo em segundos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, aula_id)
);

-- Enable RLS
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_aulas ENABLE ROW LEVEL SECURITY;

-- Políticas para aulas
CREATE POLICY "Usuários autenticados podem ver aulas ativas" 
ON public.aulas 
FOR SELECT 
USING (ativo = true);

CREATE POLICY "Admins podem criar aulas" 
ON public.aulas 
FOR INSERT 
WITH CHECK (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Criadores e admins podem atualizar aulas" 
ON public.aulas 
FOR UPDATE 
USING ((auth.uid() = created_by) OR is_admin_with_valid_reason(auth.uid()));

-- Políticas para progresso
CREATE POLICY "Usuários podem ver seu próprio progresso" 
ON public.progresso_aulas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio progresso" 
ON public.progresso_aulas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio progresso" 
ON public.progresso_aulas 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE TRIGGER update_aulas_updated_at
  BEFORE UPDATE ON public.aulas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_progresso_aulas_updated_at
  BEFORE UPDATE ON public.progresso_aulas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();