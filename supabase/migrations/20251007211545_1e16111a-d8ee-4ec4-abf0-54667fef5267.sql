-- Associar cliente e gestor (convertendo primary_gestor_user_id -> colaboradores.id) para finalizados
WITH matches AS (
  SELECT 
    l.id AS lanc_id,
    c.id AS cliente_id,
    col.id AS gestor_colab_id,
    ROW_NUMBER() OVER (
      PARTITION BY l.id 
      ORDER BY 
        CASE 
          WHEN c.slug IS NOT NULL AND lower(l.nome_lancamento) LIKE '%' || lower(c.slug) || '%' THEN 1
          WHEN c.aliases IS NOT NULL AND EXISTS (
            SELECT 1 FROM unnest(c.aliases) a 
            WHERE a IS NOT NULL AND lower(l.nome_lancamento) LIKE '%' || lower(a) || '%'
          ) THEN 2
          WHEN lower(l.nome_lancamento) LIKE '%' || lower(c.nome) || '%' THEN 3
          ELSE 4
        END,
        length(c.nome) DESC
    ) AS rn
  FROM public.lancamentos l
  JOIN public.clientes c ON (
    (c.slug IS NOT NULL AND lower(l.nome_lancamento) LIKE '%' || lower(c.slug) || '%')
    OR (c.aliases IS NOT NULL AND EXISTS (
      SELECT 1 FROM unnest(c.aliases) a 
      WHERE a IS NOT NULL AND lower(l.nome_lancamento) LIKE '%' || lower(a) || '%')
    )
    OR (lower(l.nome_lancamento) LIKE '%' || lower(c.nome) || '%')
  )
  LEFT JOIN public.colaboradores col ON col.user_id = c.primary_gestor_user_id
  WHERE l.status_lancamento = 'finalizado' AND l.cliente_id IS NULL
)
UPDATE public.lancamentos l
SET 
  cliente_id = m.cliente_id,
  gestor_responsavel_id = COALESCE(l.gestor_responsavel_id, m.gestor_colab_id)
FROM matches m
WHERE l.id = m.lanc_id AND m.rn = 1;

-- Preencher gestor para finalizados que já têm cliente, mas estão sem gestor
UPDATE public.lancamentos AS l
SET gestor_responsavel_id = col.id
FROM public.clientes c
LEFT JOIN public.colaboradores col ON col.user_id = c.primary_gestor_user_id
WHERE l.status_lancamento = 'finalizado'
  AND l.cliente_id = c.id
  AND l.gestor_responsavel_id IS NULL
  AND col.id IS NOT NULL;