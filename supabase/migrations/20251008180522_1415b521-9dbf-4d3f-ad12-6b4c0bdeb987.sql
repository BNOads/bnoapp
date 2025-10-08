-- Adicionar campo de acessos aos PDIs
ALTER TABLE public.pdis ADD COLUMN IF NOT EXISTS acessos_ids uuid[] DEFAULT '{}';

-- Criar tabela de comentários de PDI
CREATE TABLE IF NOT EXISTS public.pdi_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id uuid NOT NULL REFERENCES public.pdis(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comentario text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de comentários
ALTER TABLE public.pdi_comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para comentários de PDI
CREATE POLICY "Usuários autenticados podem ver comentários de PDI"
  ON public.pdi_comentarios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.ativo = true
    )
  );

CREATE POLICY "Usuários podem criar comentários em PDIs"
  ON public.pdi_comentarios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Criadores podem atualizar seus comentários"
  ON public.pdi_comentarios FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Criadores podem deletar seus comentários"
  ON public.pdi_comentarios FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Adicionar campo para marcar conclusão de aulas externas
-- O campo aulas_externas já existe como JSONB, vamos garantir que tem a estrutura correta
-- Não precisa alterar a tabela, só usar a estrutura: { titulo, descricao, url, duracao, concluida }

-- Atualizar política de visualização de PDIs para admins poderem ver todos
DROP POLICY IF EXISTS "Usuários podem ver seus próprios PDIs" ON public.pdis;

CREATE POLICY "Usuários podem ver seus próprios PDIs ou admins veem todos"
  ON public.pdis FOR SELECT
  TO authenticated
  USING (
    auth.uid() = colaborador_id 
    OR is_admin_with_valid_reason(auth.uid())
  );

-- Índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_pdi_comentarios_pdi_id ON public.pdi_comentarios(pdi_id);
CREATE INDEX IF NOT EXISTS idx_pdi_comentarios_created_at ON public.pdi_comentarios(created_at DESC);