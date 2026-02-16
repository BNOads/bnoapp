-- Migration: client_public_panel_and_updates
-- Creates client_public_panel table and updates meta_client_ad_accounts

-- 1. Create client_public_panel table
CREATE TABLE IF NOT EXISTS client_public_panel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id)
);

-- RLS for client_public_panel
ALTER TABLE client_public_panel ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage client_public_panel"
  ON client_public_panel FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM colaboradores
      WHERE colaboradores.user_id = auth.uid()
      AND colaboradores.nivel_acesso IN ('admin', 'dono')
    )
  );

-- Public access (read only by token lookup) implementation will be done via Edge Function or specific query, 
-- but we might want to allow anon select if we use direct Supabase client with a special filter?
-- For now, let's keep it restricted and assume the Edge Function / specific query handles the token verification.
-- BUT, if we want the frontend to read it directly given a token, we might need a policy.
-- Actually, usually the dashboard app will use the token to fetch the *Client ID* via an Edge Function, 
-- and then use that Client ID to fetch dashboard data. 
-- The dashboard data (metrics) needs to be accessible to anon IF a valid token is present/validated.
-- This is complex with RLS. 
-- EASIER APPROACH: The Edge Function `validate-public-token` returns the Client ID and a signed JWT (custom claims) 
-- that allows access to that specific client's data. 
-- OR: We just have an Edge Function that returns the dashboard data directly.

-- Let's just create the table for now. 

-- 2. Update meta_client_ad_accounts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meta_client_ad_accounts' AND column_name = 'account_name') THEN
        ALTER TABLE meta_client_ad_accounts ADD COLUMN account_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meta_client_ad_accounts' AND column_name = 'account_status') THEN
        ALTER TABLE meta_client_ad_accounts ADD COLUMN account_status TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meta_client_ad_accounts' AND column_name = 'currency') THEN
        ALTER TABLE meta_client_ad_accounts ADD COLUMN currency TEXT;
    END IF;
END $$;
