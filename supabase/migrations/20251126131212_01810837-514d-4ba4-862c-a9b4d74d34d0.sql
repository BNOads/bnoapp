-- Adicionar coluna lancamento_id na tabela diario_bordo
ALTER TABLE public.diario_bordo 
ADD COLUMN lancamento_id UUID REFERENCES public.lancamentos(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_diario_bordo_lancamento_id ON public.diario_bordo(lancamento_id);

-- Comentário
COMMENT ON COLUMN public.diario_bordo.lancamento_id IS 'Lançamento associado à entrada do diário de bordo (opcional)';