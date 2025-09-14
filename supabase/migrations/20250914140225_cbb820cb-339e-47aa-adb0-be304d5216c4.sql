-- Adicionar campo para conteúdo markdown nas referências
ALTER TABLE public.referencias_criativos 
ADD COLUMN IF NOT EXISTS conteudo_markdown TEXT;

-- Criar índice para busca de texto no conteúdo markdown
CREATE INDEX IF NOT EXISTS idx_referencias_conteudo_markdown 
ON public.referencias_criativos USING gin(to_tsvector('portuguese', conteudo_markdown));

-- Função para converter conteúdo legacy para markdown
CREATE OR REPLACE FUNCTION public.migrate_reference_content_to_markdown()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Atualizar referências que ainda não têm conteúdo markdown
  UPDATE public.referencias_criativos 
  SET conteudo_markdown = CASE 
    WHEN conteudo_markdown IS NOT NULL AND conteudo_markdown != '' THEN conteudo_markdown
    WHEN conteudo IS NOT NULL THEN (
      SELECT string_agg(
        CASE 
          WHEN (item->>'tipo') = 'heading' THEN 
            repeat('#', COALESCE((item->>'level')::int, 1)) || ' ' || COALESCE(item->>'conteudo', '') || E'\n\n'
          WHEN (item->>'tipo') = 'text' THEN 
            COALESCE(item->>'conteudo', '') || E'\n\n'
          WHEN (item->>'tipo') = 'image' THEN 
            '![' || COALESCE(item->>'descricao', '') || '](' || COALESCE(item->>'url', '') || ')' || E'\n\n'
          WHEN (item->>'tipo') = 'link' THEN 
            '[' || COALESCE(item->>'titulo', item->>'conteudo', '') || '](' || COALESCE(item->>'url', '') || ')' || E'\n\n'
          WHEN (item->>'tipo') = 'checklist' THEN 
            '- [' || CASE WHEN (item->>'checked')::boolean THEN 'x' ELSE ' ' END || '] ' || COALESCE(item->>'conteudo', '') || E'\n'
          ELSE 
            COALESCE(item->>'conteudo', '') || E'\n\n'
        END, 
        ''
      )
      FROM jsonb_array_elements(conteudo) AS item
    )
    ELSE ''
  END
  WHERE conteudo_markdown IS NULL OR conteudo_markdown = '';
END;
$$;