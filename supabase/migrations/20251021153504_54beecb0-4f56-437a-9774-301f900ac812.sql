-- Função para recalcular o ranking de um desafio específico
CREATE OR REPLACE FUNCTION recalcular_ranking_desafio(desafio_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar ranking existente do desafio
  DELETE FROM gamificacao_ranking WHERE desafio_id = desafio_uuid;
  
  -- Inserir novo ranking apenas com ações aprovadas
  INSERT INTO gamificacao_ranking (
    colaborador_id,
    desafio_id,
    total_pontos,
    total_acoes,
    posicao,
    ultima_acao,
    created_at,
    updated_at
  )
  SELECT 
    colaborador_id,
    desafio_id,
    COALESCE(SUM(pontos), 0) as total_pontos,
    COUNT(*) as total_acoes,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pontos), 0) DESC, MAX(data_registro) DESC) as posicao,
    MAX(data_registro) as ultima_acao,
    NOW() as created_at,
    NOW() as updated_at
  FROM gamificacao_acoes
  WHERE desafio_id = desafio_uuid 
    AND aprovado = true  -- Apenas ações aprovadas
  GROUP BY colaborador_id, desafio_id
  ORDER BY total_pontos DESC, ultima_acao DESC;
END;
$$;

-- Trigger para recalcular ranking quando uma ação é inserida, atualizada ou deletada
CREATE OR REPLACE FUNCTION trigger_recalcular_ranking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se for UPDATE ou DELETE, usar o OLD.desafio_id
  -- Se for INSERT, usar o NEW.desafio_id
  IF TG_OP = 'DELETE' THEN
    PERFORM recalcular_ranking_desafio(OLD.desafio_id);
    RETURN OLD;
  ELSE
    PERFORM recalcular_ranking_desafio(NEW.desafio_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Dropar trigger existente se houver
DROP TRIGGER IF EXISTS trigger_atualizar_ranking ON gamificacao_acoes;

-- Criar trigger que dispara após qualquer mudança em gamificacao_acoes
CREATE TRIGGER trigger_atualizar_ranking
AFTER INSERT OR UPDATE OR DELETE ON gamificacao_acoes
FOR EACH ROW
EXECUTE FUNCTION trigger_recalcular_ranking();

-- Recalcular rankings existentes para desafios ativos
DO $$
DECLARE
  desafio_record RECORD;
BEGIN
  FOR desafio_record IN 
    SELECT id FROM gamificacao_desafios WHERE ativo = true
  LOOP
    PERFORM recalcular_ranking_desafio(desafio_record.id);
  END LOOP;
END $$;