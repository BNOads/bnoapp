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

-- 2. Remover campos sensíveis da tabela principal colaboradores
ALTER TABLE public.colaboradores 
DROP COLUMN IF EXISTS cpf,
DROP COLUMN IF EXISTS rg,
DROP COLUMN IF EXISTS endereco,
DROP COLUMN IF EXISTS telefone_contato,
DROP COLUMN IF EXISTS telefone_proximo,
DROP COLUMN IF EXISTS cnpj,
DROP COLUMN IF EXISTS razao_social,
DROP COLUMN IF EXISTS conta_bancaria,
DROP COLUMN IF EXISTS pix;

-- 3. Habilitar RLS na nova tabela
ALTER TABLE public.colaboradores_dados_sensíveis ENABLE ROW LEVEL SECURITY;

-- 4. Criar enum para tipos de acesso a dados sensíveis
CREATE TYPE public.tipo_acesso_dados AS ENUM ('leitura_propria', 'leitura_limitada', 'leitura_completa', 'administracao');

-- 5. Criar tabela de permissões específicas para dados sensíveis
CREATE TABLE public.permissoes_dados_sensíveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_acesso tipo_acesso_dados NOT NULL DEFAULT 'leitura_propria',
  campos_permitidos TEXT[], -- campos específicos que pode acessar
  motivo TEXT, -- justificativa do acesso
  concedido_por UUID REFERENCES auth.users(id),
  valido_ate TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.permissoes_dados_sensíveis ENABLE ROW LEVEL SECURITY;