-- Migration: client_meta_settings
-- Stores per-client metric visibility and custom metric definitions

CREATE TABLE IF NOT EXISTS client_meta_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_event TEXT,
  metric_type TEXT DEFAULT 'number' CHECK (metric_type IN ('number', 'currency', 'percentage')),
  metric_label TEXT,
  is_visible BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_meta_settings
  ADD CONSTRAINT unique_client_metric UNIQUE (cliente_id, metric_name);

ALTER TABLE client_meta_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read client_meta_settings"
  ON client_meta_settings FOR SELECT
  TO authenticated
  USING (true);

-- Admin/dono can manage
CREATE POLICY "Admin can manage client_meta_settings"
  ON client_meta_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM colaboradores
      WHERE colaboradores.user_id = auth.uid()
      AND colaboradores.nivel_acesso IN ('admin', 'dono')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM colaboradores
      WHERE colaboradores.user_id = auth.uid()
      AND colaboradores.nivel_acesso IN ('admin', 'dono')
    )
  );

-- Anon users can read (for public panel)
CREATE POLICY "Anon can read client_meta_settings"
  ON client_meta_settings FOR SELECT
  TO anon
  USING (true);
