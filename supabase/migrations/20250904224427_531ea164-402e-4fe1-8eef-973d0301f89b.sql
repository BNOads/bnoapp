-- Remove duplicated lancamentos based on nome_lancamento and cliente_id
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY nome_lancamento, cliente_id, data_inicio_captacao 
      ORDER BY created_at ASC
    ) as rn
  FROM public.lancamentos
  WHERE ativo = true
)
DELETE FROM public.lancamentos 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);