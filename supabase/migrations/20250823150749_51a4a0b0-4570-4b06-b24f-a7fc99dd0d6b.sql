-- Adicionar campo para ID da pasta do Google Drive
ALTER TABLE clientes 
ADD COLUMN drive_folder_id text;