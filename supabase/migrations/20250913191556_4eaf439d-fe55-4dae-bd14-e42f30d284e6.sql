-- Add public sharing functionality to marketing funnels
ALTER TABLE public.funis_marketing 
ADD COLUMN IF NOT EXISTS publico BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS link_publico TEXT,
ADD COLUMN IF NOT EXISTS compartilhado_em TIMESTAMP WITH TIME ZONE;

-- Create function to generate public link for funnels
CREATE OR REPLACE FUNCTION public.generate_funnel_public_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.publico = true AND (OLD.publico IS NULL OR OLD.publico = false) THEN
    NEW.link_publico = '/funil/publico/' || NEW.id;
    NEW.compartilhado_em = now();
  ELSIF NEW.publico = false THEN
    NEW.link_publico = NULL;
    NEW.compartilhado_em = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic link generation
DROP TRIGGER IF EXISTS update_funnel_public_link ON public.funis_marketing;
CREATE TRIGGER update_funnel_public_link
BEFORE UPDATE ON public.funis_marketing
FOR EACH ROW
EXECUTE FUNCTION public.generate_funnel_public_link();

-- Add RLS policy for public access to shared funnels
DROP POLICY IF EXISTS "Public access to shared funnels" ON public.funis_marketing;
CREATE POLICY "Public access to shared funnels"
ON public.funis_marketing
FOR SELECT
USING (publico = true);