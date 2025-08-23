-- Primeiro, vamos criar perfis para usuários existentes sem duplicar permissões
INSERT INTO public.profiles (user_id, nome, email, nivel_acesso, ativo)
SELECT 
  u.id,
  COALESCE(split_part(u.email, '@', 1), 'Usuário'),
  u.email,
  CASE WHEN EXISTS(SELECT 1 FROM public.master_emails m WHERE m.email = u.email) 
       THEN 'admin'::public.nivel_acesso 
       ELSE 'cs'::public.nivel_acesso 
  END,
  true
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;

-- Criar colaboradores para usuários existentes
INSERT INTO public.colaboradores (user_id, nome, email, nivel_acesso, ativo)
SELECT 
  u.id,
  COALESCE(split_part(u.email, '@', 1), 'Usuário'),
  u.email,
  CASE WHEN EXISTS(SELECT 1 FROM public.master_emails m WHERE m.email = u.email) 
       THEN 'admin'::public.nivel_acesso 
       ELSE 'cs'::public.nivel_acesso 
  END,
  true
FROM auth.users u
LEFT JOIN public.colaboradores c ON u.id = c.user_id
WHERE c.user_id IS NULL;

-- Dar permissões de administração para todos os usuários admin
INSERT INTO public.permissoes_dados_sensíveis (user_id, tipo_acesso, motivo, campos_permitidos, ativo)
SELECT 
  p.user_id,
  'administracao'::public.tipo_acesso_dados,
  'Permissão de administração master',
  ARRAY['todos'],
  true
FROM public.profiles p
WHERE p.nivel_acesso = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissoes_dados_sensíveis pds 
    WHERE pds.user_id = p.user_id AND pds.tipo_acesso = 'administracao'::public.tipo_acesso_dados
  );

-- Atualizar permissões existentes para admin
UPDATE public.permissoes_dados_sensíveis 
SET 
  tipo_acesso = 'administracao'::public.tipo_acesso_dados,
  motivo = 'Atualizado para acesso master',
  campos_permitidos = ARRAY['todos'],
  ativo = true
WHERE user_id IN (
  SELECT p.user_id FROM public.profiles p WHERE p.nivel_acesso = 'admin'
);