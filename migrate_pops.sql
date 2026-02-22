DO $$
DECLARE
    creator_record RECORD;
    pop_record RECORD;
    target_folder_id UUID;
BEGIN
    FOR creator_record IN SELECT DISTINCT created_by FROM documentos WHERE categoria_documento = 'pop' AND created_by IS NOT NULL LOOP
        -- Check if folder "POPs" exists for this user
        SELECT id INTO target_folder_id FROM workspace_document_folders WHERE user_id = creator_record.created_by AND name = 'POPs' LIMIT 1;
        
        -- If not, create it
        IF target_folder_id IS NULL THEN
            INSERT INTO workspace_document_folders (user_id, name) VALUES (creator_record.created_by, 'POPs') RETURNING id INTO target_folder_id;
        END IF;

        -- Migrate POPs
        FOR pop_record IN SELECT * FROM documentos WHERE categoria_documento = 'pop' AND created_by = creator_record.created_by LOOP
            -- Important: We shouldn't migrate the same POP multiple times, so we can check by title/content hash or just migrate all. 
            INSERT INTO workspace_documents (user_id, folder_id, title, emoji, content_html, is_public, public_slug)
            VALUES (
                pop_record.created_by, 
                target_folder_id, 
                COALESCE(pop_record.titulo, 'Sem título'), 
                COALESCE(pop_record.icone, '📄'), 
                COALESCE(pop_record.conteudo, ''), 
                COALESCE(pop_record.link_publico_ativo, false), 
                pop_record.link_publico
            );
        END LOOP;
    END LOOP;
END;
$$;
