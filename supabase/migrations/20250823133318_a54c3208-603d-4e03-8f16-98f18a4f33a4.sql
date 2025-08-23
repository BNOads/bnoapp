-- 1. Criar nova tabela para dados sensíveis separados
CREATE TABLE public.colaboradores_dados_sensíveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL UNIQUE REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  cpf TEXT,
  rg TEXT,
  endereco TEXT,
  telefone_contato TEXT,
  telefone_proximo TEXT,
  cnpj TEXT,
  razao_social TEXT,
  conta_bancaria TEXT,
  pix TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS na nova tabela
ALTER TABLE public.colaboradores_dados_sensíveis ENABLE ROW LEVEL SECURITY;

-- 3. Criar enum para tipos de acesso a dados sensíveis
CREATE TYPE public.tipo_acesso_dados AS ENUM ('leitura_propria', 'leitura_limitada', 'leitura_completa', 'administracao');

-- 4. Criar tabela de permissões específicas para dados sensíveis
CREATE TABLE public.permissoes_dados_sensíveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_acesso public.tipo_acesso_dados NOT NULL DEFAULT 'leitura_propria',
  campos_permitidos TEXT[], -- campos específicos que pode acessar
  motivo TEXT, -- justificativa do acesso
  concedido_por UUID REFERENCES auth.users(id),
  valido_ate TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.permissoes_dados_sensíveis ENABLE ROW LEVEL SECURITY;

-- 5. Criar função para verificar permissões específicas de dados sensíveis
CREATE OR REPLACE FUNCTION public.has_sensitive_data_permission(_user_id uuid, _permission_type public.tipo_acesso_dados)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.permissoes_dados_sensíveis pds
    JOIN public.profiles p ON p.user_id = pds.user_id
    WHERE pds.user_id = _user_id 
      AND pds.tipo_acesso = _permission_type
      AND pds.ativo = true
      AND (pds.valido_ate IS NULL OR pds.valido_ate > now())
      AND p.ativo = true
  )
$$;

-- 6. Criar função para verificar se é admin com motivo válido
CREATE OR REPLACE FUNCTION public.is_admin_with_valid_reason(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id 
      AND p.nivel_acesso = 'admin'
      AND p.ativo = true
  )
$$;