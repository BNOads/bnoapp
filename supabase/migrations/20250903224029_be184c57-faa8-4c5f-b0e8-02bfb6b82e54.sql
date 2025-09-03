-- Criar tabela para histórico de conversas do assistente
CREATE TABLE public.assistente_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Criar tabela para mensagens do assistente
CREATE TABLE public.assistente_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.assistente_conversas(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistente_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistente_mensagens ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversas
CREATE POLICY "Usuarios podem ver suas proprias conversas" 
ON public.assistente_conversas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios podem criar suas proprias conversas" 
ON public.assistente_conversas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios podem atualizar suas proprias conversas" 
ON public.assistente_conversas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios podem deletar suas proprias conversas" 
ON public.assistente_conversas 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for mensagens
CREATE POLICY "Usuarios podem ver mensagens de suas conversas" 
ON public.assistente_mensagens 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.assistente_conversas c 
  WHERE c.id = assistente_mensagens.conversa_id 
  AND c.user_id = auth.uid()
));

CREATE POLICY "Usuarios podem criar mensagens em suas conversas" 
ON public.assistente_mensagens 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.assistente_conversas c 
  WHERE c.id = conversa_id 
  AND c.user_id = auth.uid()
));

-- Admins podem ver todas as conversas para auditoria
CREATE POLICY "Admins podem ver todas as conversas" 
ON public.assistente_conversas 
FOR SELECT 
USING (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Admins podem ver todas as mensagens" 
ON public.assistente_mensagens 
FOR SELECT 
USING (is_admin_with_valid_reason(auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_assistente_conversas_updated_at
BEFORE UPDATE ON public.assistente_conversas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_assistente_conversas_user_id ON public.assistente_conversas(user_id);
CREATE INDEX idx_assistente_conversas_created_at ON public.assistente_conversas(created_at DESC);
CREATE INDEX idx_assistente_mensagens_conversa_id ON public.assistente_mensagens(conversa_id);
CREATE INDEX idx_assistente_mensagens_created_at ON public.assistente_mensagens(created_at);