-- 1. Adicionar coluna de conteúdo JSON (TipTap) na tabela notas
ALTER TABLE public.notas ADD COLUMN IF NOT EXISTS conteudo_json JSONB;

-- 2. Criar tabela de backup de notas
CREATE TABLE IF NOT EXISTS public.notas_backup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_id UUID NOT NULL,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  conteudo_json JSONB,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.notas_backup ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS: usuário vê apenas seus próprios backups
CREATE POLICY "Users can view their own note backups"
ON public.notas_backup
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert note backups"
ON public.notas_backup
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Index para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_notas_backup_nota_id ON public.notas_backup(nota_id);
CREATE INDEX IF NOT EXISTS idx_notas_backup_saved_at ON public.notas_backup(nota_id, saved_at DESC);

-- 6. Função de backup automático com limite de 20 versões
CREATE OR REPLACE FUNCTION public.auto_backup_nota()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir backup da versão anterior (antes de sobrescrever)
  INSERT INTO public.notas_backup (nota_id, user_id, titulo, conteudo, conteudo_json, saved_at)
  VALUES (OLD.id, OLD.user_id, OLD.titulo, OLD.conteudo, OLD.conteudo_json, now());

  -- Manter apenas as 20 versões mais recentes por nota
  DELETE FROM public.notas_backup
  WHERE id IN (
    SELECT id FROM public.notas_backup
    WHERE nota_id = OLD.id
    ORDER BY saved_at DESC
    OFFSET 20
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Trigger que executa o backup a cada UPDATE
DROP TRIGGER IF EXISTS trg_auto_backup_nota ON public.notas;
CREATE TRIGGER trg_auto_backup_nota
  BEFORE UPDATE ON public.notas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_backup_nota();
