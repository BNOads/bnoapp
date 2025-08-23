-- Adicionar colunas necessárias na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS auto_permission boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_drive_sync timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS drive_sync_error text DEFAULT NULL;

-- Criar tabela para armazenar criativos do Google Drive
CREATE TABLE IF NOT EXISTS public.creatives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  file_id text NOT NULL,
  name text NOT NULL,
  mime_type text,
  link_web_view text,
  link_direct text,
  icon_link text,
  thumbnail_link text,
  file_size bigint,
  modified_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  archived boolean DEFAULT false,
  UNIQUE(client_id, file_id)
);

-- Habilitar RLS
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para creatives
CREATE POLICY "Acesso público para visualização de criativos" 
ON public.creatives 
FOR SELECT 
USING (archived = false);

CREATE POLICY "Equipe pode gerenciar criativos" 
ON public.creatives 
FOR ALL 
USING (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_creatives_client_id ON public.creatives(client_id);
CREATE INDEX IF NOT EXISTS idx_creatives_file_id ON public.creatives(file_id);
CREATE INDEX IF NOT EXISTS idx_creatives_mime_type ON public.creatives(mime_type);
CREATE INDEX IF NOT EXISTS idx_creatives_archived ON public.creatives(archived);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_creatives_updated_at
  BEFORE UPDATE ON public.creatives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();