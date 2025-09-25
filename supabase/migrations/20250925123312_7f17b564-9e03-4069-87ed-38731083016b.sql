-- Add status column to creatives and new RPC to persist manual statuses
-- 1) Add column if not exists
ALTER TABLE public.creatives
ADD COLUMN IF NOT EXISTS status text;

-- 2) New function to update status reliably and bypass RLS via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_creative_status_v2(
  creative_id uuid,
  new_status_text text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  is_active_bool BOOLEAN;
  result JSON;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF new_status_text IS NULL THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  -- Normalizar
  new_status_text := lower(new_status_text);
  is_active_bool := (new_status_text = 'ativo');

  UPDATE public.creatives
  SET 
    is_active = is_active_bool,
    status = new_status_text,
    activated_at = CASE WHEN is_active_bool THEN now() ELSE NULL END,
    activated_by = CASE WHEN is_active_bool THEN current_user_id ELSE NULL END,
    updated_at = now()
  WHERE id = creative_id;

  SELECT json_build_object(
    'success', true,
    'message', 'Status atualizado com sucesso'
  ) INTO result;

  RETURN result;
END;
$$;
