-- Adicionar colunas para informações de pasta na tabela creatives
ALTER TABLE public.creatives 
ADD COLUMN folder_name TEXT DEFAULT 'Raiz',
ADD COLUMN folder_path TEXT DEFAULT '',
ADD COLUMN parent_folder_id TEXT;