-- Adicionar constraint UNIQUE na tabela gamificacao_ranking
-- para garantir que cada colaborador aparece apenas uma vez por desafio
ALTER TABLE public.gamificacao_ranking
DROP CONSTRAINT IF EXISTS gamificacao_ranking_colaborador_desafio_key;

ALTER TABLE public.gamificacao_ranking
ADD CONSTRAINT gamificacao_ranking_colaborador_desafio_key 
UNIQUE (colaborador_id, desafio_id);