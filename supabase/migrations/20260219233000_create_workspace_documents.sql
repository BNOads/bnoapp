-- Ferramenta de Documentos estilo Notion

CREATE TABLE IF NOT EXISTS public.workspace_document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.workspace_document_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Sem título',
  emoji TEXT,
  content_html TEXT NOT NULL DEFAULT '',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  public_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_document_folders_user
  ON public.workspace_document_folders(user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_documents_user_updated
  ON public.workspace_documents(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_documents_folder
  ON public.workspace_documents(folder_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_documents_public_slug
  ON public.workspace_documents(public_slug)
  WHERE public_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_workspace_document_public_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate_slug TEXT;
BEGIN
  IF NEW.is_public = true THEN
    IF NEW.public_slug IS NULL OR trim(NEW.public_slug) = '' THEN
      base_slug := lower(regexp_replace(trim(coalesce(NEW.title, 'documento')), '[^a-zA-Z0-9]+', '-', 'g'));
      base_slug := trim(both '-' from base_slug);

      IF base_slug = '' THEN
        base_slug := 'documento';
      END IF;

      candidate_slug := base_slug;

      WHILE EXISTS (
        SELECT 1
        FROM public.workspace_documents d
        WHERE d.public_slug = candidate_slug
          AND d.id <> NEW.id
      ) LOOP
        candidate_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      END LOOP;

      NEW.public_slug := candidate_slug;
    END IF;
  ELSE
    NEW.public_slug := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspace_documents_public_slug ON public.workspace_documents;
CREATE TRIGGER trg_workspace_documents_public_slug
  BEFORE INSERT OR UPDATE OF is_public, title ON public.workspace_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_workspace_document_public_slug();

DROP TRIGGER IF EXISTS trg_workspace_document_folders_updated_at ON public.workspace_document_folders;
CREATE TRIGGER trg_workspace_document_folders_updated_at
  BEFORE UPDATE ON public.workspace_document_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_workspace_documents_updated_at ON public.workspace_documents;
CREATE TRIGGER trg_workspace_documents_updated_at
  BEFORE UPDATE ON public.workspace_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workspace_document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;

-- Pastas: somente dono
DROP POLICY IF EXISTS "Usuarios podem ver suas pastas de documentos" ON public.workspace_document_folders;
CREATE POLICY "Usuarios podem ver suas pastas de documentos"
  ON public.workspace_document_folders
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem criar suas pastas de documentos" ON public.workspace_document_folders;
CREATE POLICY "Usuarios podem criar suas pastas de documentos"
  ON public.workspace_document_folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem atualizar suas pastas de documentos" ON public.workspace_document_folders;
CREATE POLICY "Usuarios podem atualizar suas pastas de documentos"
  ON public.workspace_document_folders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem deletar suas pastas de documentos" ON public.workspace_document_folders;
CREATE POLICY "Usuarios podem deletar suas pastas de documentos"
  ON public.workspace_document_folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Documentos: dono gerencia + público pode ver publicados
DROP POLICY IF EXISTS "Usuarios podem ver seus documentos workspace" ON public.workspace_documents;
CREATE POLICY "Usuarios podem ver seus documentos workspace"
  ON public.workspace_documents
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem criar seus documentos workspace" ON public.workspace_documents;
CREATE POLICY "Usuarios podem criar seus documentos workspace"
  ON public.workspace_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem atualizar seus documentos workspace" ON public.workspace_documents;
CREATE POLICY "Usuarios podem atualizar seus documentos workspace"
  ON public.workspace_documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios podem deletar seus documentos workspace" ON public.workspace_documents;
CREATE POLICY "Usuarios podem deletar seus documentos workspace"
  ON public.workspace_documents
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Acesso publico a documentos publicados workspace" ON public.workspace_documents;
CREATE POLICY "Acesso publico a documentos publicados workspace"
  ON public.workspace_documents
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND public_slug IS NOT NULL);
