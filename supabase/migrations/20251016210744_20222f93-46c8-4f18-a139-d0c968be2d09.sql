-- Criar políticas RLS para gamificacao_acoes
-- Permitir que usuários autenticados possam criar suas próprias ações

-- Habilitar RLS na tabela se ainda não estiver
ALTER TABLE public.gamificacao_acoes ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuarios podem criar acoes" ON public.gamificacao_acoes;
DROP POLICY IF EXISTS "Usuarios podem ver acoes" ON public.gamificacao_acoes;
DROP POLICY IF EXISTS "Admins podem gerenciar acoes" ON public.gamificacao_acoes;

-- Política para permitir que usuários autenticados vejam todas as ações
CREATE POLICY "Usuarios podem ver acoes"
ON public.gamificacao_acoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
  )
);

-- Política para permitir que usuários criem ações em desafios ativos
CREATE POLICY "Usuarios podem criar acoes"
ON public.gamificacao_acoes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = colaborador_id
    AND c.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM public.gamificacao_desafios d
    WHERE d.id = desafio_id
    AND d.ativo = true
  )
);

-- Política para admins e gestores gerenciarem todas as ações
CREATE POLICY "Admins podem gerenciar acoes"
ON public.gamificacao_acoes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.nivel_acesso IN ('admin', 'gestor_trafego')
    AND p.ativo = true
  )
);