-- Add public sharing functionality to mind maps
ALTER TABLE public.mapas_mentais 
ADD COLUMN IF NOT EXISTS publico BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS link_publico TEXT,
ADD COLUMN IF NOT EXISTS compartilhado_em TIMESTAMP WITH TIME ZONE;

-- Create function to generate public link for mind maps
CREATE OR REPLACE FUNCTION public.generate_mindmap_public_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.publico = true AND OLD.publico = false THEN
    NEW.link_publico = '/mapa-mental/publico/' || NEW.id;
    NEW.compartilhado_em = now();
  ELSIF NEW.publico = false THEN
    NEW.link_publico = NULL;
    NEW.compartilhado_em = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic link generation
DROP TRIGGER IF EXISTS update_mindmap_public_link ON public.mapas_mentais;
CREATE TRIGGER update_mindmap_public_link
BEFORE UPDATE ON public.mapas_mentais
FOR EACH ROW
EXECUTE FUNCTION public.generate_mindmap_public_link();

-- Add RLS policy for public access to shared mind maps
DROP POLICY IF EXISTS "Public access to shared mind maps" ON public.mapas_mentais;
CREATE POLICY "Public access to shared mind maps"
ON public.mapas_mentais
FOR SELECT
USING (publico = true);