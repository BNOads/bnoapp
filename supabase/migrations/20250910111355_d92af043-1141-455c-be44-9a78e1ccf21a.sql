-- Add links_externos column to pdis table
ALTER TABLE public.pdis ADD COLUMN links_externos JSONB DEFAULT '[]'::jsonb;