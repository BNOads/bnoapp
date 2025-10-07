-- Remove duplicados da tabela lancamentos
-- Mantém apenas o registro mais recente por (nome_lancamento, cliente_id, data_inicio_captacao)
-- e desativa os demais

WITH duplicados AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY nome_lancamento, COALESCE(cliente_id::text, 'NULL'), data_inicio_captacao 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM public.lancamentos
  WHERE ativo = true
)
UPDATE public.lancamentos
SET ativo = false
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);