-- Corrigir a função removendo primeiro o trigger
DROP TRIGGER IF EXISTS trigger_registrar_mudanca_status ON public.lancamentos;
DROP FUNCTION IF EXISTS public.registrar_mudanca_status_lancamento();

-- Recriar a função com search_path seguro
CREATE OR REPLACE FUNCTION public.registrar_mudanca_status_lancamento()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF OLD.status_lancamento != NEW.status_lancamento THEN
    INSERT INTO public.historico_status_lancamentos (
      lancamento_id,
      status_anterior,
      status_novo,
      motivo,
      alterado_por
    ) VALUES (
      NEW.id,
      OLD.status_lancamento,
      NEW.status_lancamento,
      'Alteração via sistema',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER trigger_registrar_mudanca_status
  AFTER UPDATE ON public.lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_status_lancamento();