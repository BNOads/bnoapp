-- Criar tabela para layout de ferramentas por usuário
CREATE TABLE IF NOT EXISTS public.user_tools_layout (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  positions JSONB DEFAULT '[]'::jsonb,
  hidden JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- Enable RLS
ALTER TABLE public.user_tools_layout ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuário só pode ver e modificar seu próprio layout
CREATE POLICY "Users can view their own layout"
  ON public.user_tools_layout
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own layout"
  ON public.user_tools_layout
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own layout"
  ON public.user_tools_layout
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Adicionar campo sort_order à tabela orcamentos_funil
ALTER TABLE public.orcamentos_funil 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Criar índice para melhor performance na ordenação
CREATE INDEX IF NOT EXISTS idx_orcamentos_funil_sort 
  ON public.orcamentos_funil(cliente_id, nome_funil, sort_order);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_tools_layout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_tools_layout_timestamp
  BEFORE UPDATE ON public.user_tools_layout
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tools_layout_updated_at();