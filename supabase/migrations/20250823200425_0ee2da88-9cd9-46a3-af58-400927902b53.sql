-- Criar tabela para criativos
CREATE TABLE public.criativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  nome TEXT NOT NULL,
  link_externo TEXT NOT NULL,
  tipo_criativo TEXT NOT NULL CHECK (tipo_criativo IN ('imagem', 'video', 'pdf', 'outros')),
  tags TEXT[] DEFAULT '{}',
  descricao TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Adicionar índices para performance
CREATE INDEX idx_criativos_cliente_id ON public.criativos(cliente_id);
CREATE INDEX idx_criativos_tags ON public.criativos USING GIN(tags);
CREATE INDEX idx_criativos_tipo ON public.criativos(tipo_criativo);

-- Habilitar RLS
ALTER TABLE public.criativos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Visualização pública (clientes podem ver)
CREATE POLICY "Acesso público para visualização de criativos" 
ON public.criativos 
FOR SELECT 
USING (ativo = true);

-- Apenas equipe autenticada pode inserir
CREATE POLICY "Equipe pode criar criativos" 
ON public.criativos 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Apenas criadores podem atualizar
CREATE POLICY "Criadores podem atualizar criativos" 
ON public.criativos 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Apenas criadores podem excluir
CREATE POLICY "Criadores podem excluir criativos" 
ON public.criativos 
FOR DELETE 
USING (auth.uid() = created_by);

-- Trigger para updated_at
CREATE TRIGGER update_criativos_updated_at
BEFORE UPDATE ON public.criativos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();