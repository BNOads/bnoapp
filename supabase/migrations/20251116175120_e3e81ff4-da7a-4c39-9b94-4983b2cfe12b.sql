-- Adicionar coluna para API key do ClickUp na tabela clickup_user_mappings
ALTER TABLE clickup_user_mappings 
ADD COLUMN IF NOT EXISTS clickup_api_key TEXT;

-- Criar tabela para configurações do ClickUp se não existir
CREATE TABLE IF NOT EXISTS clickup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clickup_api_key TEXT NOT NULL,
  clickup_team_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE clickup_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuário só vê suas próprias configurações
CREATE POLICY "Usuários veem apenas suas configurações"
  ON clickup_config
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas configurações"
  ON clickup_config
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas configurações"
  ON clickup_config
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas configurações"
  ON clickup_config
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_clickup_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clickup_config_timestamp
  BEFORE UPDATE ON clickup_config
  FOR EACH ROW
  EXECUTE FUNCTION update_clickup_config_updated_at();