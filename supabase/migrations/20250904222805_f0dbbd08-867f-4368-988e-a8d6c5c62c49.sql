-- Remove gestor_responsavel column and related constraints from lancamentos table
ALTER TABLE public.lancamentos DROP COLUMN IF EXISTS gestor_responsavel;

-- Update any existing triggers that might reference gestor_responsavel
-- The status history trigger should still work without gestor_responsavel