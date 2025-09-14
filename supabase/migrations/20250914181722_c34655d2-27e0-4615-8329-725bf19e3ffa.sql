-- Criar tabela para mapear campanhas às etapas por cliente
CREATE TABLE public.campaign_stage_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid REFERENCES public.clientes(id),
  campaign_name text NOT NULL,
  stage text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, campaign_name)
);

-- Enable RLS
ALTER TABLE public.campaign_stage_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view campaign mappings" 
ON public.campaign_stage_mappings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.ativo = true
));

CREATE POLICY "Admins can manage campaign mappings" 
ON public.campaign_stage_mappings 
FOR ALL 
USING (is_admin_with_valid_reason(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_campaign_stage_mappings_updated_at
BEFORE UPDATE ON public.campaign_stage_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();