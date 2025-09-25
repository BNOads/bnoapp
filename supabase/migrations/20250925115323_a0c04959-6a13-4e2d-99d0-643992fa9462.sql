-- Add reply functionality to diario_bordo table
ALTER TABLE public.diario_bordo 
ADD COLUMN parent_id UUID REFERENCES public.diario_bordo(id) ON DELETE CASCADE;