-- Drop the existing constraint and column
ALTER TABLE lancamento_criativos 
DROP CONSTRAINT IF EXISTS lancamento_criativos_criativo_id_fkey,
DROP COLUMN IF EXISTS criativo_id;

-- Add the new column for folder name
ALTER TABLE lancamento_criativos
ADD COLUMN IF NOT EXISTS folder_name TEXT;

-- Add a unique constraint to prevent duplicate folder links per launch
ALTER TABLE lancamento_criativos
ADD CONSTRAINT lancamento_criativos_folder_unique UNIQUE (lancamento_id, folder_name);
