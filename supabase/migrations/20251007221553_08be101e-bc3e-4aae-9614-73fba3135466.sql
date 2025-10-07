-- Inserir 11 lançamentos de outubro/novembro 2025
-- Usando o primeiro usuário admin como created_by

INSERT INTO public.lancamentos (
  nome_lancamento,
  tipo_lancamento,
  status_lancamento,
  data_inicio_captacao,
  investimento_total,
  ativo,
  cliente_id,
  created_by,
  created_at,
  updated_at
) VALUES
  -- 1. RUBIHAIR | NOV25
  (
    'RUBIHAIR | NOV25',
    'captacao_simples',
    'em_captacao',
    '2025-10-20',
    3000,
    true,
    '49262d7e-caf3-4ecd-b630-19e4a75fb264',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 2. FEBURJATO | OUT25
  (
    'FEBURJATO | OUT25',
    'captacao_simples',
    'em_captacao',
    '2025-10-07',
    1000,
    true,
    'b06a4e5d-f466-4aca-ab10-be6f47291026',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 3. PATRICIACARDOSO | OUT25
  (
    'PATRICIACARDOSO | OUT25',
    'captacao_simples',
    'em_captacao',
    '2025-10-07',
    2000,
    true,
    'c752d2fd-e226-4e2a-94d3-286222b6d929',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 4. PHDNOSEUA | WMB_OUT25
  (
    'PHDNOSEUA | WMB_OUT25',
    'tradicional',
    'em_captacao',
    '2025-10-01',
    60000,
    true,
    'd6a2dcc2-77df-4fe3-9fee-b3014a41a543',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 5. MYLLAMURTA | BLACK
  (
    'MYLLAMURTA | BLACK',
    'tradicional',
    'em_captacao',
    '2025-10-07',
    10000,
    true,
    'd90e66b5-5c4c-46df-8054-eccfb9a1437f',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 6. CARLALOUREIRO | LP_01
  (
    'CARLALOUREIRO | LP_01',
    'tradicional',
    'em_captacao',
    '2025-09-16',
    30000,
    true,
    'dcbe9fd8-c5be-4401-894f-33e296255ef2',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 7. BORAnaOBRA | IMBNO_OUT25
  (
    'BORAnaOBRA | IMBNO_OUT25',
    'tradicional',
    'em_captacao',
    '2025-09-25',
    5000,
    true,
    'b3ed96b9-7313-4bb9-96de-69d476129bce',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 8. RENATAVANUCCI | SVSC_OUT25
  (
    'RENATAVANUCCI | SVSC_OUT25',
    'tradicional',
    'em_captacao',
    '2025-09-22',
    5000,
    true,
    '920d7a0f-fb69-4f6a-8bca-3ed9602d30e7',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 9. BORAnaOBRA | BNOexp26_MET
  (
    'BORAnaOBRA | BNOexp26_MET',
    'tradicional',
    'em_captacao',
    '2025-09-25',
    6000,
    true,
    'b3ed96b9-7313-4bb9-96de-69d476129bce',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 10. DANIGUARDINI | OUT25
  (
    'DANIGUARDINI | OUT25',
    'captacao_simples',
    'em_captacao',
    '2025-09-29',
    2000,
    true,
    '47094275-40bd-4a56-a11b-d196b02eedf4',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  ),
  -- 11. FISIOEXPERIENCE | SET25
  (
    'FISIOEXPERIENCE | SET25',
    'captacao_simples',
    'em_captacao',
    '2025-09-23',
    4000,
    true,
    '326f52a8-147e-4073-a681-53be1cf580a7',
    (SELECT user_id FROM public.profiles WHERE nivel_acesso = 'admin' AND ativo = true LIMIT 1),
    now(),
    now()
  );