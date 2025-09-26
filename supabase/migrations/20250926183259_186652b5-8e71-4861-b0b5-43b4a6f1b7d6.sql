-- Create tables for Yjs collaboration and history (corrected)

-- Table for storing Yjs snapshots/checkpoints
CREATE TABLE public.yjs_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  block_id TEXT NOT NULL,
  snapshot_data BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  operations_count INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

-- Create index for faster queries
CREATE INDEX idx_yjs_snapshots_document_block ON public.yjs_snapshots (document_id, block_id);
CREATE INDEX idx_yjs_snapshots_created_at ON public.yjs_snapshots (created_at DESC);

-- Enable RLS
ALTER TABLE public.yjs_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for yjs_snapshots (simplified for document access)
CREATE POLICY "Users can view snapshots for accessible documents"
ON public.yjs_snapshots
FOR SELECT
TO authenticated
USING (true); -- For now, allow all authenticated users to read

CREATE POLICY "Users can create snapshots"
ON public.yjs_snapshots
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Table for storing collaboration permissions
CREATE TABLE public.collaboration_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  permission_type TEXT NOT NULL CHECK (permission_type IN ('edit', 'view', 'admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(document_id, user_id)
);

-- Create indexes
CREATE INDEX idx_collaboration_permissions_document_user ON public.collaboration_permissions (document_id, user_id);
CREATE INDEX idx_collaboration_permissions_user ON public.collaboration_permissions (user_id);

-- Enable RLS
ALTER TABLE public.collaboration_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for collaboration_permissions
CREATE POLICY "Users can view their own permissions"
ON public.collaboration_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all permissions"
ON public.collaboration_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.nivel_acesso = 'admin'
  )
);

-- Function to get user collaboration permissions
CREATE OR REPLACE FUNCTION public.get_user_collaboration_permission(
  _document_id UUID,
  _user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  permission TEXT;
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id 
    AND p.nivel_acesso = 'admin'
  ) THEN
    RETURN 'admin';
  END IF;

  -- Check explicit permissions
  SELECT cp.permission_type INTO permission
  FROM public.collaboration_permissions cp
  WHERE cp.document_id = _document_id
    AND cp.user_id = _user_id
    AND cp.is_active = true
    AND (cp.expires_at IS NULL OR cp.expires_at > now())
  ORDER BY 
    CASE cp.permission_type 
      WHEN 'admin' THEN 1
      WHEN 'edit' THEN 2
      WHEN 'view' THEN 3
    END
  LIMIT 1;

  -- Default to 'edit' for authenticated users if no explicit permission
  IF permission IS NULL AND _user_id IS NOT NULL THEN
    RETURN 'edit';
  END IF;

  RETURN COALESCE(permission, 'view');
END;
$$;

-- Function to create Yjs snapshot
CREATE OR REPLACE FUNCTION public.create_yjs_snapshot(
  _document_id UUID,
  _block_id TEXT,
  _snapshot_data BYTEA,
  _version INTEGER DEFAULT 1,
  _operations_count INTEGER DEFAULT 0,
  _description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot_id UUID;
  user_permission TEXT;
BEGIN
  -- Check user permissions
  SELECT public.get_user_collaboration_permission(_document_id) INTO user_permission;
  
  IF user_permission NOT IN ('edit', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to create snapshot';
  END IF;

  -- Insert snapshot
  INSERT INTO public.yjs_snapshots (
    document_id,
    block_id,
    snapshot_data,
    created_by,
    version,
    operations_count,
    description
  ) VALUES (
    _document_id,
    _block_id,
    _snapshot_data,
    auth.uid(),
    _version,
    _operations_count,
    _description
  ) RETURNING id INTO snapshot_id;

  -- Keep only last 50 snapshots per block to prevent table bloat
  DELETE FROM public.yjs_snapshots
  WHERE document_id = _document_id 
    AND block_id = _block_id
    AND id NOT IN (
      SELECT id FROM public.yjs_snapshots
      WHERE document_id = _document_id AND block_id = _block_id
      ORDER BY created_at DESC
      LIMIT 50
    );

  RETURN snapshot_id;
END;
$$;