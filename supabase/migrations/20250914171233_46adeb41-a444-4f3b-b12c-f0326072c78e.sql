-- Criar tabela para mapear usuários Lovable <-> ClickUp
CREATE TABLE public.clickup_user_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clickup_user_id TEXT NOT NULL,
  clickup_username TEXT NOT NULL,
  clickup_email TEXT NOT NULL,
  clickup_profile_picture TEXT,
  clickup_team_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, clickup_team_id)
);

-- Enable RLS
ALTER TABLE public.clickup_user_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own mappings" 
ON public.clickup_user_mappings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mappings" 
ON public.clickup_user_mappings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mappings" 
ON public.clickup_user_mappings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mappings" 
ON public.clickup_user_mappings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_clickup_user_mappings_updated_at
BEFORE UPDATE ON public.clickup_user_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();