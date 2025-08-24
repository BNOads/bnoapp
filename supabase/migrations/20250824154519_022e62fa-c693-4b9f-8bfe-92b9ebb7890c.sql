-- Criar tabela de PDIs (Planos de Desenvolvimento Individual)
CREATE TABLE public.pdis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_limite DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para associar aulas aos PDIs
CREATE TABLE public.pdi_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdi_id UUID NOT NULL REFERENCES public.pdis(id) ON DELETE CASCADE,
  aula_id UUID NOT NULL REFERENCES public.aulas(id),
  concluida BOOLEAN NOT NULL DEFAULT false,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pdi_id, aula_id)
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.pdis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_aulas ENABLE ROW LEVEL SECURITY;

-- Políticas para PDIs
CREATE POLICY "Usuários podem ver seus próprios PDIs" 
ON public.pdis 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c 
    WHERE c.id = colaborador_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins podem gerenciar todos os PDIs" 
ON public.pdis 
FOR ALL 
USING (is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Admins podem criar PDIs" 
ON public.pdis 
FOR INSERT 
WITH CHECK (is_admin_with_valid_reason(auth.uid()));

-- Políticas para PDI Aulas
CREATE POLICY "Usuários podem ver aulas de seus PDIs" 
ON public.pdi_aulas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.pdis p 
    JOIN public.colaboradores c ON c.id = p.colaborador_id 
    WHERE p.id = pdi_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem marcar aulas como concluídas" 
ON public.pdi_aulas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.pdis p 
    JOIN public.colaboradores c ON c.id = p.colaborador_id 
    WHERE p.id = pdi_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins podem gerenciar todas as aulas de PDI" 
ON public.pdi_aulas 
FOR ALL 
USING (is_admin_with_valid_reason(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pdis_updated_at
BEFORE UPDATE ON public.pdis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();