-- Adicionar novos campos para lançamentos detalhados
ALTER TABLE public.lancamentos 
ADD COLUMN IF NOT EXISTS gestor_responsavel_id uuid REFERENCES public.colaboradores(id),
ADD COLUMN IF NOT EXISTS promessa text,
ADD COLUMN IF NOT EXISTS data_inicio_cpl date,
ADD COLUMN IF NOT EXISTS data_fim_cpl date,
ADD COLUMN IF NOT EXISTS data_inicio_carrinho date,
ADD COLUMN IF NOT EXISTS data_fim_carrinho date,
ADD COLUMN IF NOT EXISTS data_fechamento date,
ADD COLUMN IF NOT EXISTS ticket_produto numeric,
ADD COLUMN IF NOT EXISTS tipo_aulas text DEFAULT 'ao_vivo',
ADD COLUMN IF NOT EXISTS leads_desejados integer,
ADD COLUMN IF NOT EXISTS publico_alvo text,
ADD COLUMN IF NOT EXISTS meta_custo_lead numeric,
ADD COLUMN IF NOT EXISTS distribuicao_plataformas jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS distribuicao_fases jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metas_investimentos jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS links_uteis jsonb DEFAULT '[]';

-- Criar índice para melhor performance na busca por gestor
CREATE INDEX IF NOT EXISTS idx_lancamentos_gestor ON public.lancamentos(gestor_responsavel_id);

-- Criar índice para evitar duplicados por nome
CREATE INDEX IF NOT EXISTS idx_lancamentos_nome ON public.lancamentos(nome_lancamento);

-- Comentários explicativos
COMMENT ON COLUMN public.lancamentos.gestor_responsavel_id IS 'Colaborador responsável pelo lançamento';
COMMENT ON COLUMN public.lancamentos.promessa IS 'Promessa principal do lançamento';
COMMENT ON COLUMN public.lancamentos.data_inicio_cpl IS 'Data de início da fase CPL';
COMMENT ON COLUMN public.lancamentos.data_fim_cpl IS 'Data de fim da fase CPL';
COMMENT ON COLUMN public.lancamentos.data_inicio_carrinho IS 'Data de início da fase carrinho';
COMMENT ON COLUMN public.lancamentos.data_fim_carrinho IS 'Data de fim da fase carrinho';
COMMENT ON COLUMN public.lancamentos.data_fechamento IS 'Data de fechamento do lançamento';
COMMENT ON COLUMN public.lancamentos.ticket_produto IS 'Valor do ticket do produto';
COMMENT ON COLUMN public.lancamentos.tipo_aulas IS 'Tipo de aulas: ao_vivo ou gravadas';
COMMENT ON COLUMN public.lancamentos.leads_desejados IS 'Quantidade de leads desejados';
COMMENT ON COLUMN public.lancamentos.publico_alvo IS 'Descrição do público-alvo';
COMMENT ON COLUMN public.lancamentos.meta_custo_lead IS 'Meta de custo por lead';
COMMENT ON COLUMN public.lancamentos.distribuicao_plataformas IS 'Distribuição percentual por plataforma';
COMMENT ON COLUMN public.lancamentos.distribuicao_fases IS 'Distribuição de valores e percentuais por fase';
COMMENT ON COLUMN public.lancamentos.metas_investimentos IS 'Metas específicas como número de alunos';
COMMENT ON COLUMN public.lancamentos.links_uteis IS 'Array de links úteis com título, URL e ícone';