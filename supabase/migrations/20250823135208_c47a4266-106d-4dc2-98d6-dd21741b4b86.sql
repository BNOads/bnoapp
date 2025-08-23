-- Desabilitar triggers temporariamente
ALTER TABLE public.colaboradores DISABLE TRIGGER handle_master_permissions_colaboradores;
ALTER TABLE public.colaboradores DISABLE TRIGGER on_colaborador_created;

-- Verificar estado atual dos usuários
SELECT 
  u.email,
  p.nivel_acesso as perfil_nivel,
  c.nivel_acesso as colaborador_nivel,
  CASE WHEN pds.user_id IS NOT NULL THEN pds.tipo_acesso::text ELSE 'sem_permissao' END as permissoes
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
LEFT JOIN public.colaboradores c ON u.id = c.user_id
LEFT JOIN public.permissoes_dados_sensíveis pds ON u.id = pds.user_id
ORDER BY u.email;