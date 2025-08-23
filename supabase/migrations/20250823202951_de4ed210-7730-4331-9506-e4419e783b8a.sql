-- Adicionar coluna tipo_conteudo na tabela aulas
ALTER TABLE public.aulas 
ADD COLUMN tipo_conteudo text DEFAULT 'video' CHECK (tipo_conteudo IN ('video', 'quiz', 'documento', 'apresentacao', 'exercicio'));

-- Atualizar url_youtube para permitir null (para tipos de conteúdo que não são vídeo)
ALTER TABLE public.aulas 
ALTER COLUMN url_youtube DROP NOT NULL;