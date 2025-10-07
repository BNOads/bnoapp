-- Ajustar a função do trigger para aceitar NULL no auth.uid() durante migrações
CREATE OR REPLACE FUNCTION public.registrar_mudanca_status_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      COALESCE(auth.uid(), NEW.created_by)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Marcar todos os lançamentos como finalizados
UPDATE lancamentos 
SET status_lancamento = 'finalizado'
WHERE ativo = true AND status_lancamento != 'finalizado';

-- Desativar as duplicatas, mantendo apenas a versão mais recente
WITH ranked_lancamentos AS (
  SELECT 
    id,
    nome_lancamento,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(nome_lancamento)) 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM lancamentos
  WHERE ativo = true
)
UPDATE lancamentos
SET ativo = false
WHERE id IN (
  SELECT id 
  FROM ranked_lancamentos 
  WHERE rn > 1
);