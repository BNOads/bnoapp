-- Add soccer field positioning and profile enrichment columns to colaboradores
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS campo_pos_x REAL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS campo_pos_y REAL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cargo_display TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mini_bio TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS responsabilidades TEXT DEFAULT NULL;
