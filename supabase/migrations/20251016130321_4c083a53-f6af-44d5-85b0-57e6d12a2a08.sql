-- Criar tabela de checklists de criativos
CREATE TABLE public.checklist_criativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  funil TEXT NOT NULL,
  responsavel_id UUID REFERENCES auth.users(id),
  progresso_percentual NUMERIC DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Criar tabela de itens do checklist
CREATE TABLE public.checklist_criativos_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.checklist_criativos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL, -- video, imagem, texto, outro
  formato TEXT, -- 1x1, 9x16, etc
  especificacoes TEXT,
  referencias JSONB DEFAULT '[]'::jsonb, -- array de IDs de referências
  concluido BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.checklist_criativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_criativos_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para checklist_criativos
CREATE POLICY "Authenticated users can view checklists"
  ON public.checklist_criativos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.ativo = true
    )
  );

CREATE POLICY "Public can view checklists"
  ON public.checklist_criativos
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create checklists"
  ON public.checklist_criativos
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update checklists"
  ON public.checklist_criativos
  FOR UPDATE
  USING (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid()));

CREATE POLICY "Creators and admins can delete checklists"
  ON public.checklist_criativos
  FOR DELETE
  USING (auth.uid() = created_by OR is_admin_with_valid_reason(auth.uid()));

-- Políticas para checklist_criativos_itens
CREATE POLICY "Authenticated users can view items"
  ON public.checklist_criativos_itens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.ativo = true
    )
  );

CREATE POLICY "Public can view items"
  ON public.checklist_criativos_itens
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create items"
  ON public.checklist_criativos_itens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM checklist_criativos
      WHERE checklist_criativos.id = checklist_id
      AND (checklist_criativos.created_by = auth.uid() OR is_admin_with_valid_reason(auth.uid()))
    )
  );

CREATE POLICY "Authorized users can update items"
  ON public.checklist_criativos_itens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM checklist_criativos
      WHERE checklist_criativos.id = checklist_id
      AND (checklist_criativos.created_by = auth.uid() OR is_admin_with_valid_reason(auth.uid()))
    )
  );

CREATE POLICY "Authorized users can delete items"
  ON public.checklist_criativos_itens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM checklist_criativos
      WHERE checklist_criativos.id = checklist_id
      AND (checklist_criativos.created_by = auth.uid() OR is_admin_with_valid_reason(auth.uid()))
    )
  );

-- Função para atualizar progresso do checklist
CREATE OR REPLACE FUNCTION update_checklist_progresso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_items INTEGER;
  completed_items INTEGER;
  new_percentage NUMERIC;
BEGIN
  -- Contar total e concluídos
  SELECT COUNT(*), COUNT(*) FILTER (WHERE concluido = true)
  INTO total_items, completed_items
  FROM checklist_criativos_itens
  WHERE checklist_id = COALESCE(NEW.checklist_id, OLD.checklist_id);
  
  -- Calcular percentual
  IF total_items > 0 THEN
    new_percentage := (completed_items::NUMERIC / total_items::NUMERIC) * 100;
  ELSE
    new_percentage := 0;
  END IF;
  
  -- Atualizar checklist
  UPDATE checklist_criativos
  SET 
    progresso_percentual = new_percentage,
    updated_at = now()
  WHERE id = COALESCE(NEW.checklist_id, OLD.checklist_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para atualizar progresso
CREATE TRIGGER update_checklist_progresso_trigger
AFTER INSERT OR UPDATE OR DELETE ON checklist_criativos_itens
FOR EACH ROW
EXECUTE FUNCTION update_checklist_progresso();

-- Trigger para updated_at
CREATE TRIGGER update_checklist_criativos_updated_at
BEFORE UPDATE ON checklist_criativos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_itens_updated_at
BEFORE UPDATE ON checklist_criativos_itens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_checklist_criativos_cliente ON checklist_criativos(cliente_id);
CREATE INDEX idx_checklist_criativos_responsavel ON checklist_criativos(responsavel_id);
CREATE INDEX idx_checklist_itens_checklist ON checklist_criativos_itens(checklist_id);
CREATE INDEX idx_checklist_itens_ordem ON checklist_criativos_itens(checklist_id, ordem);