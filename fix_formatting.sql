DO $$
DECLARE
    doc_record RECORD;
    fixed_html TEXT;
    new_slug TEXT;
BEGIN
    FOR doc_record IN 
        SELECT d.id, orig.conteudo, d.public_slug 
        FROM workspace_documents d
        JOIN documentos orig ON orig.titulo = d.title AND orig.created_by = d.user_id AND orig.categoria_documento = 'pop'
        WHERE d.folder_id IN (SELECT id FROM workspace_document_folders WHERE name = 'POPs')
    LOOP
        -- The original content had newlines. The rich text editor expects HTML. 
        -- If we just dumped plain text, newlines don't render. Convert \n to <br> or wrap in <p>
        -- A simple fix: replace \n with <br/> if it does not already contain HTML tags
        IF doc_record.conteudo NOT LIKE '%<p>%' AND doc_record.conteudo NOT LIKE '%<br>%' THEN
            fixed_html := replace(replace(doc_record.conteudo, chr(13), ''), chr(10), '<br/>');
        ELSE
            fixed_html := doc_record.conteudo;
        END IF;

        -- Generate a URL slug if it doesn't have one
        IF doc_record.public_slug IS NULL OR doc_record.public_slug = '' THEN
            new_slug := gen_random_uuid()::text;
        ELSE
            new_slug := doc_record.public_slug;
        END IF;

        -- Make it public and update content
        UPDATE workspace_documents 
        SET content_html = fixed_html, 
            is_public = true,
            public_slug = new_slug
        WHERE id = doc_record.id;
    END LOOP;
END;
$$;
