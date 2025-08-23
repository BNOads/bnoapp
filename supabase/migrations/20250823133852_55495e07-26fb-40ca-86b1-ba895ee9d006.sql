-- Criar função trigger para automaticamente dar permissões básicas aos novos colaboradores
CREATE OR REPLACE FUNCTION public.handle_new_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dar permissão básica de leitura própria para todos os colaboradores
  INSERT INTO public.permissoes_dados_sensíveis (
    user_id,
    tipo_acesso,
    motivo,
    campos_permitidos,
    ativo
  ) VALUES (
    NEW.user_id,
    'leitura_propria'::public.tipo_acesso_dados,
    'Permissão automática para colaborador',
    ARRAY['endereco', 'telefone_contato'],
    true
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger para aplicar permissões automaticamente
CREATE TRIGGER on_colaborador_created
  AFTER INSERT ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_permissions();

-- Dar permissões para colaboradores existentes se houver algum
INSERT INTO public.permissoes_dados_sensíveis (
  user_id,
  tipo_acesso,
  motivo,
  campos_permitidos,
  ativo
)
SELECT 
  c.user_id,
  'leitura_propria'::public.tipo_acesso_dados,
  'Permissão automática para colaborador existente',
  ARRAY['endereco', 'telefone_contato'],
  true
FROM public.colaboradores c
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissoes_dados_sensíveis pds
  WHERE pds.user_id = c.user_id
);