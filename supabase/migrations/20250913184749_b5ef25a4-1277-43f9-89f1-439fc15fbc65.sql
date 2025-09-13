-- Create table for user notes
CREATE TABLE public.notas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

-- Create policies for notes
CREATE POLICY "Users can view their own notes" 
ON public.notas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" 
ON public.notas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
ON public.notas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
ON public.notas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create table for mind maps
CREATE TABLE public.mapas_mentais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  dados_mapa JSONB NOT NULL DEFAULT '{"nodes": [], "connections": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mapas_mentais ENABLE ROW LEVEL SECURITY;

-- Create policies for mind maps
CREATE POLICY "Users can view their own mind maps" 
ON public.mapas_mentais 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mind maps" 
ON public.mapas_mentais 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mind maps" 
ON public.mapas_mentais 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mind maps" 
ON public.mapas_mentais 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create table for funnels
CREATE TABLE public.funis_marketing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  dados_funil JSONB NOT NULL DEFAULT '{"elements": [], "connections": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funis_marketing ENABLE ROW LEVEL SECURITY;

-- Create policies for funnels
CREATE POLICY "Users can view their own funnels" 
ON public.funis_marketing 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own funnels" 
ON public.funis_marketing 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funnels" 
ON public.funis_marketing 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funnels" 
ON public.funis_marketing 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_notas_updated_at
BEFORE UPDATE ON public.notas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mapas_mentais_updated_at
BEFORE UPDATE ON public.mapas_mentais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funis_marketing_updated_at
BEFORE UPDATE ON public.funis_marketing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();