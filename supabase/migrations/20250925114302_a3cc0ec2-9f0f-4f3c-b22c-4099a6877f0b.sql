-- Criar tabela para o diário de bordo dos clientes
CREATE TABLE public.diario_bordo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  autor_id UUID NOT NULL,
  texto TEXT NOT NULL,
  reacoes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_diario_bordo_cliente_id ON public.diario_bordo(cliente_id);
CREATE INDEX idx_diario_bordo_created_at ON public.diario_bordo(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.diario_bordo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem ver entradas do diário"
  ON public.diario_bordo
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.ativo = true
    )
  );

CREATE POLICY "Gestores e admins podem criar entradas"
  ON public.diario_bordo
  FOR INSERT
  WITH CHECK (
    auth.uid() = autor_id AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
        AND p.ativo = true 
        AND p.nivel_acesso IN ('admin', 'gestor_trafego')
    )
  );

CREATE POLICY "Autores e admins podem atualizar suas entradas"
  ON public.diario_bordo
  FOR UPDATE
  USING (
    auth.uid() = autor_id OR
    is_admin_with_valid_reason(auth.uid())
  );

CREATE POLICY "Autores e admins podem excluir entradas"
  ON public.diario_bordo
  FOR DELETE
  USING (
    auth.uid() = autor_id OR
    is_admin_with_valid_reason(auth.uid())
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_diario_bordo_updated_at
  BEFORE UPDATE ON public.diario_bordo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();