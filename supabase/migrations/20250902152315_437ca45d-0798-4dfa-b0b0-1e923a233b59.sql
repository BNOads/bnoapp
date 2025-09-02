-- Criar tabela para orçamentos por funil
CREATE TABLE public.orcamentos_funil (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  nome_funil TEXT NOT NULL,
  valor_investimento DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT
);

-- Criar tabela para histórico de alterações dos orçamentos
CREATE TABLE public.historico_orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos_funil(id) ON DELETE CASCADE,
  valor_anterior DECIMAL(10,2),
  valor_novo DECIMAL(10,2) NOT NULL,
  motivo_alteracao TEXT,
  alterado_por UUID NOT NULL,
  data_alteracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para referência de criativos
CREATE TABLE public.referencias_criativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  conteudo JSONB NOT NULL DEFAULT '[]'::jsonb,
  link_publico TEXT UNIQUE,
  data_expiracao TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_template BOOLEAN NOT NULL DEFAULT false,
  permissoes_edicao JSONB DEFAULT '[]'::jsonb,
  links_externos JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.orcamentos_funil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referencias_criativos ENABLE ROW LEVEL SECURITY;

-- Políticas para orçamentos_funil
CREATE POLICY "Acesso público para visualização de orçamentos" 
ON public.orcamentos_funil 
FOR SELECT 
USING (true);

CREATE POLICY "Admins podem gerenciar orçamentos" 
ON public.orcamentos_funil 
FOR ALL 
USING (is_admin_with_valid_reason(auth.uid()));

-- Políticas para histórico_orcamentos
CREATE POLICY "Acesso público para visualização de histórico" 
ON public.historico_orcamentos 
FOR SELECT 
USING (true);

CREATE POLICY "Sistema pode inserir histórico" 
ON public.historico_orcamentos 
FOR INSERT 
WITH CHECK (true);

-- Políticas para referencias_criativos
CREATE POLICY "Acesso público para visualização de referências" 
ON public.referencias_criativos 
FOR SELECT 
USING (ativo = true);

CREATE POLICY "Equipe pode gerenciar referências" 
ON public.referencias_criativos 
FOR ALL 
USING (is_admin_with_valid_reason(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_orcamentos_funil_updated_at
BEFORE UPDATE ON public.orcamentos_funil
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referencias_criativos_updated_at
BEFORE UPDATE ON public.referencias_criativos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar histórico de alterações
CREATE OR REPLACE FUNCTION public.create_orcamento_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.valor_investimento != NEW.valor_investimento THEN
    INSERT INTO public.historico_orcamentos (
      orcamento_id,
      valor_anterior,
      valor_novo,
      motivo_alteracao,
      alterado_por
    ) VALUES (
      NEW.id,
      OLD.valor_investimento,
      NEW.valor_investimento,
      'Alteração de valor',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;