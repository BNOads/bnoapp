-- Adicionar campos para links públicos nos lançamentos
ALTER TABLE public.lancamentos
ADD COLUMN IF NOT EXISTS link_publico TEXT,
ADD COLUMN IF NOT EXISTS link_publico_ativo BOOLEAN DEFAULT false;

-- Criar índice para consultas rápidas por link público
CREATE INDEX IF NOT EXISTS idx_lancamentos_link_publico 
ON public.lancamentos(link_publico) 
WHERE link_publico IS NOT NULL;

-- Atualizar RLS para permitir acesso público a lançamentos com link ativo
CREATE POLICY "Acesso público a lançamentos com link ativo"
ON public.lancamentos FOR SELECT
TO anon
USING (link_publico_ativo = true);