-- Create table for budget management by funnel stages
CREATE TABLE public.orcamentos_funil (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  nome_funil TEXT NOT NULL,
  valor_investimento NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Create table for budget history tracking
CREATE TABLE public.historico_orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL,
  valor_anterior NUMERIC(12,2),
  valor_novo NUMERIC(12,2) NOT NULL,
  motivo_alteracao TEXT,
  data_alteracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  alterado_por UUID NOT NULL
);

-- Create function to track budget changes
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

-- Create trigger for budget history
CREATE TRIGGER update_orcamento_history
  BEFORE UPDATE ON public.orcamentos_funil
  FOR EACH ROW
  EXECUTE FUNCTION public.create_orcamento_history();

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_orcamentos_funil_updated_at
  BEFORE UPDATE ON public.orcamentos_funil
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.orcamentos_funil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_orcamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orcamentos_funil
-- Authenticated users and public can view budgets (for public panel access)
CREATE POLICY "Usuarios autenticados e publico podem ver orcamentos"
ON public.orcamentos_funil
FOR SELECT
USING (
  true OR (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() 
        AND p.ativo = true 
        AND p.nivel_acesso IN ('admin', 'gestor_trafego', 'gestor_projetos', 'cs')
    )
  )
);

-- CS, managers and admins can create budgets
CREATE POLICY "CS gestores e admins podem criar orcamentos"
ON public.orcamentos_funil
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true 
      AND p.nivel_acesso IN ('admin', 'gestor_trafego', 'gestor_projetos', 'cs')
  )
);

-- CS, managers and admins can update budgets
CREATE POLICY "CS gestores e admins podem atualizar orcamentos"
ON public.orcamentos_funil
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true 
      AND p.nivel_acesso IN ('admin', 'gestor_trafego', 'gestor_projetos', 'cs')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true 
      AND p.nivel_acesso IN ('admin', 'gestor_trafego', 'gestor_projetos', 'cs')
  )
);

-- Admins and creators can delete budgets
CREATE POLICY "Admins e criadores podem deletar orcamentos"
ON public.orcamentos_funil
FOR DELETE
USING (
  (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid())) AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true 
      AND p.nivel_acesso IN ('admin', 'gestor_trafego', 'gestor_projetos', 'cs')
  )
);

-- RLS Policies for historico_orcamentos
-- Authenticated users can view budget history
CREATE POLICY "Usuarios autenticados podem ver historico orcamentos"
ON public.historico_orcamentos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true
  )
);

-- System can insert history records
CREATE POLICY "Sistema pode inserir histórico"
ON public.historico_orcamentos
FOR INSERT
WITH CHECK (true);