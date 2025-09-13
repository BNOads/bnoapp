-- Create enum for document status
CREATE TYPE public.status_documento_reuniao AS ENUM ('rascunho', 'pauta_criada', 'ata_concluida', 'arquivado');

-- Create enum for block types
CREATE TYPE public.tipo_bloco_reuniao AS ENUM ('titulo', 'descricao', 'participantes', 'pauta', 'decisoes', 'acoes');

-- Create table for meeting documents (by day)
CREATE TABLE public.reunioes_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  dia INTEGER NOT NULL CHECK (dia >= 1 AND dia <= 31),
  titulo_reuniao TEXT NOT NULL,
  descricao TEXT,
  participantes TEXT[],
  status public.status_documento_reuniao NOT NULL DEFAULT 'rascunho',
  contribuidores UUID[] DEFAULT '{}',
  ultima_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cliente_id UUID REFERENCES public.clientes(id),
  
  -- Ensure unique document per day
  UNIQUE(ano, mes, dia)
);

-- Create table for meeting document blocks
CREATE TABLE public.reunioes_blocos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.reunioes_documentos(id) ON DELETE CASCADE,
  tipo public.tipo_bloco_reuniao NOT NULL,
  titulo TEXT,
  conteudo JSONB NOT NULL DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 0,
  ancora TEXT, -- URL anchor slug
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for meeting templates
CREATE TABLE public.reunioes_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  blocos_template JSONB NOT NULL DEFAULT '[]',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reunioes_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes_blocos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reunioes_documentos
CREATE POLICY "Usuarios autenticados podem ver documentos de reuniao"
ON public.reunioes_documentos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.ativo = true
));

CREATE POLICY "Usuarios podem criar documentos de reuniao"
ON public.reunioes_documentos
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores e admins podem atualizar documentos"
ON public.reunioes_documentos
FOR UPDATE
USING (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Criadores e admins podem deletar documentos"
ON public.reunioes_documentos
FOR DELETE
USING (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid()));

-- RLS Policies for reunioes_blocos
CREATE POLICY "Usuarios autenticados podem ver blocos de reuniao"
ON public.reunioes_blocos
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.user_id = auth.uid() AND p.ativo = true
));

CREATE POLICY "Usuarios podem gerenciar blocos de seus documentos"
ON public.reunioes_blocos
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.reunioes_documentos rd
  WHERE rd.id = reunioes_blocos.documento_id
  AND (rd.created_by = auth.uid() OR is_admin_with_valid_reason(auth.uid()))
));

-- RLS Policies for reunioes_templates
CREATE POLICY "Usuarios autenticados podem ver templates"
ON public.reunioes_templates
FOR SELECT
USING (ativo = true);

CREATE POLICY "Admins podem gerenciar templates"
ON public.reunioes_templates
FOR ALL
USING (is_admin_with_valid_reason(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_reunioes_documentos_data ON public.reunioes_documentos (ano, mes, dia);
CREATE INDEX idx_reunioes_documentos_status ON public.reunioes_documentos (status);
CREATE INDEX idx_reunioes_blocos_documento ON public.reunioes_blocos (documento_id);
CREATE INDEX idx_reunioes_blocos_ordem ON public.reunioes_blocos (documento_id, ordem);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_reunioes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_reunioes_documentos_updated_at
  BEFORE UPDATE ON public.reunioes_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reunioes_updated_at();

CREATE TRIGGER update_reunioes_blocos_updated_at
  BEFORE UPDATE ON public.reunioes_blocos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reunioes_updated_at();

-- Insert default templates
INSERT INTO public.reunioes_templates (nome, descricao, blocos_template) VALUES
('Pauta Simples', 'Template básico para reuniões gerais', '[
  {"tipo": "titulo", "titulo": "Objetivos da Reunião", "conteudo": {"texto": ""}},
  {"tipo": "participantes", "titulo": "Participantes", "conteudo": {"lista": []}},
  {"tipo": "pauta", "titulo": "Agenda", "conteudo": {"itens": []}},
  {"tipo": "decisoes", "titulo": "Decisões", "conteudo": {"texto": ""}},
  {"tipo": "acoes", "titulo": "Próximos Passos", "conteudo": {"checklist": []}}
]'),
('1:1', 'Template para reuniões individuais', '[
  {"tipo": "titulo", "titulo": "Check-in Individual", "conteudo": {"texto": ""}},
  {"tipo": "participantes", "titulo": "Participantes", "conteudo": {"lista": []}},
  {"tipo": "pauta", "titulo": "Pontos a Discutir", "conteudo": {"itens": ["Como está se sentindo?", "Desafios atuais", "Objetivos e metas", "Feedback"]}},
  {"tipo": "decisoes", "titulo": "Acordos", "conteudo": {"texto": ""}},
  {"tipo": "acoes", "titulo": "Action Items", "conteudo": {"checklist": []}}
]'),
('Alinhamento Semanal', 'Template para reuniões de alinhamento da equipe', '[
  {"tipo": "titulo", "titulo": "Alinhamento Semanal", "conteudo": {"texto": ""}},
  {"tipo": "participantes", "titulo": "Equipe Presente", "conteudo": {"lista": []}},
  {"tipo": "pauta", "titulo": "Agenda", "conteudo": {"itens": ["Retrospectiva da semana", "Principais entregas", "Bloqueios e dificuldades", "Planejamento próxima semana"]}},
  {"tipo": "decisoes", "titulo": "Decisões", "conteudo": {"texto": ""}},
  {"tipo": "acoes", "titulo": "Action Items", "conteudo": {"checklist": []}}
]'),
('Comitê', 'Template para reuniões de comitê ou governança', '[
  {"tipo": "titulo", "titulo": "Reunião de Comitê", "conteudo": {"texto": ""}},
  {"tipo": "participantes", "titulo": "Membros do Comitê", "conteudo": {"lista": []}},
  {"tipo": "pauta", "titulo": "Ordem do Dia", "conteudo": {"itens": ["Aprovação da ata anterior", "Relatórios", "Novos negócios", "Outros assuntos"]}},
  {"tipo": "decisoes", "titulo": "Resoluções", "conteudo": {"texto": ""}},
  {"tipo": "acoes", "titulo": "Ações Deliberadas", "conteudo": {"checklist": []}}
]');