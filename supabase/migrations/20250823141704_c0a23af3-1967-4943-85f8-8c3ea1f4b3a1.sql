-- Criar tabela de treinamentos
CREATE TABLE public.treinamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'video', -- video, documento, apresentacao, quiz, curso
  categoria text NOT NULL DEFAULT 'facebook_ads', -- facebook_ads, google_ads, analytics, etc
  nivel text NOT NULL DEFAULT 'iniciante', -- iniciante, intermediario, avancado
  duracao integer, -- em minutos
  url_conteudo text,
  thumbnail_url text,
  created_by uuid REFERENCES auth.users(id),
  ativo boolean NOT NULL DEFAULT true,
  visualizacoes integer DEFAULT 0,
  tags text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para treinamentos
CREATE POLICY "Usuários autenticados podem ver treinamentos" 
ON public.treinamentos 
FOR SELECT 
USING (ativo = true);

CREATE POLICY "Admins podem criar treinamentos" 
ON public.treinamentos 
FOR INSERT 
WITH CHECK (public.is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Criadores podem atualizar seus treinamentos" 
ON public.treinamentos 
FOR UPDATE 
USING (auth.uid() = created_by OR public.is_admin_with_valid_reason(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_treinamentos_updated_at
BEFORE UPDATE ON public.treinamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Corrigir tabela colaboradores - user_id deve ser opcional
ALTER TABLE public.colaboradores ALTER COLUMN user_id DROP NOT NULL;