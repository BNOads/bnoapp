-- Add team assignment fields to clients table
ALTER TABLE public.clientes 
ADD COLUMN primary_gestor_user_id UUID REFERENCES public.colaboradores(user_id),
ADD COLUMN primary_cs_user_id UUID REFERENCES public.colaboradores(user_id);

-- Create client_roles table for team assignments
CREATE TABLE public.client_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.colaboradores(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('gestor', 'cs')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  since TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique primary roles per client
  UNIQUE (client_id, role, is_primary) DEFERRABLE INITIALLY DEFERRED,
  UNIQUE (client_id, user_id, role)
);

-- Enable RLS on client_roles
ALTER TABLE public.client_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_roles
CREATE POLICY "Authenticated users can view client roles" 
ON public.client_roles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() AND p.ativo = true
));

CREATE POLICY "Admins and gestores can manage client roles" 
ON public.client_roles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = auth.uid() 
    AND p.nivel_acesso IN ('admin', 'gestor_trafego') 
    AND p.ativo = true
));

-- Function to sync primary assignments
CREATE OR REPLACE FUNCTION public.sync_primary_assignments()
RETURNS TRIGGER AS $$
BEGIN
  -- Update primary gestor
  UPDATE public.clientes 
  SET primary_gestor_user_id = (
    SELECT cr.user_id 
    FROM public.client_roles cr
    WHERE cr.client_id = COALESCE(NEW.client_id, OLD.client_id)
      AND cr.role = 'gestor' 
      AND cr.is_primary = true
    LIMIT 1
  )
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);
  
  -- Update primary CS
  UPDATE public.clientes 
  SET primary_cs_user_id = (
    SELECT cr.user_id 
    FROM public.client_roles cr
    WHERE cr.client_id = COALESCE(NEW.client_id, OLD.client_id)
      AND cr.role = 'cs' 
      AND cr.is_primary = true
    LIMIT 1
  )
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to sync primary assignments
CREATE TRIGGER sync_primary_assignments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.client_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_primary_assignments();

-- Function to ensure only one primary per role per client
CREATE OR REPLACE FUNCTION public.ensure_single_primary()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a role as primary, unset others
  IF NEW.is_primary = true THEN
    UPDATE public.client_roles 
    SET is_primary = false
    WHERE client_id = NEW.client_id 
      AND role = NEW.role 
      AND id != NEW.id;
  END IF;
  
  -- If removing the last person in a role, promote the oldest
  IF TG_OP = 'DELETE' AND OLD.is_primary = true THEN
    UPDATE public.client_roles 
    SET is_primary = true
    WHERE client_id = OLD.client_id 
      AND role = OLD.role 
      AND id = (
        SELECT id FROM public.client_roles 
        WHERE client_id = OLD.client_id AND role = OLD.role 
        ORDER BY since ASC 
        LIMIT 1
      );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to ensure single primary
CREATE TRIGGER ensure_single_primary_trigger
  BEFORE INSERT OR UPDATE ON public.client_roles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary();

CREATE TRIGGER ensure_single_primary_after_delete_trigger
  AFTER DELETE ON public.client_roles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary();

-- Add indexes for performance
CREATE INDEX idx_client_roles_client_id ON public.client_roles(client_id);
CREATE INDEX idx_client_roles_user_id ON public.client_roles(user_id);
CREATE INDEX idx_client_roles_primary ON public.client_roles(client_id, role, is_primary) WHERE is_primary = true;

-- Update trigger for updated_at
CREATE TRIGGER update_client_roles_updated_at
  BEFORE UPDATE ON public.client_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();