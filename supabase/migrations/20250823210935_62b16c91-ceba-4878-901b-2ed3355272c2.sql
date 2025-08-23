-- Adicionar colunas para controle de status ativo dos criativos
ALTER TABLE public.creatives 
ADD COLUMN is_active BOOLEAN DEFAULT false,
ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN activated_by UUID REFERENCES auth.users(id);

-- Criar índice para consultas por status ativo
CREATE INDEX idx_creatives_is_active ON public.creatives(is_active);

-- Criar função para atualizar status do criativo
CREATE OR REPLACE FUNCTION public.update_creative_status(
  creative_id UUID,
  new_status BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  -- Verificar se o usuário está autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Atualizar o status do criativo
  UPDATE public.creatives 
  SET 
    is_active = new_status,
    activated_at = CASE 
      WHEN new_status = true THEN now()
      ELSE activated_at
    END,
    activated_by = CASE 
      WHEN new_status = true THEN current_user_id
      ELSE activated_by
    END,
    updated_at = now()
  WHERE id = creative_id;
  
  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'message', CASE 
      WHEN new_status = true THEN 'Criativo marcado como ativo'
      ELSE 'Criativo marcado como inativo'
    END
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;