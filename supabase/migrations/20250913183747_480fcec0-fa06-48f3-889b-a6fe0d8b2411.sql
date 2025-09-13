-- Adicionar novas categorias ao enum nivel_acesso
ALTER TYPE public.nivel_acesso ADD VALUE 'webdesigner';
ALTER TYPE public.nivel_acesso ADD VALUE 'editor_video';
ALTER TYPE public.nivel_acesso ADD VALUE 'gestor_projetos';
ALTER TYPE public.nivel_acesso ADD VALUE 'dono';