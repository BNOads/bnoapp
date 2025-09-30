-- Add is_active and deleted_at columns to clientes table
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Create audit_log table for client status changes
CREATE TABLE IF NOT EXISTS public.clientes_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  acao text NOT NULL CHECK (acao IN ('inativar', 'reativar', 'apagar', 'restaurar')),
  motivo text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on audit log
ALTER TABLE public.clientes_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all audit logs
CREATE POLICY "Admins podem ver audit logs"
ON public.clientes_audit_log
FOR SELECT
USING (is_admin_with_valid_reason(auth.uid()));

-- Policy for system to insert audit logs
CREATE POLICY "Sistema pode inserir audit logs"
ON public.clientes_audit_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_clientes_is_active ON public.clientes(is_active);
CREATE INDEX IF NOT EXISTS idx_clientes_deleted_at ON public.clientes(deleted_at);