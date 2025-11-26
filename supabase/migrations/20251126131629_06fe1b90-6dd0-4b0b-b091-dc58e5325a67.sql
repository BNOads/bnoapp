-- Adicionar coluna checklist na tabela lancamentos
ALTER TABLE public.lancamentos 
ADD COLUMN checklist_configuracao JSONB DEFAULT '{
  "pixel_api": false,
  "pagina_obrigado": false,
  "planilha_leads": false,
  "planilha_vendas": false,
  "pesquisa": false,
  "email_boas_vindas": false
}'::jsonb;

-- Comentário
COMMENT ON COLUMN public.lancamentos.checklist_configuracao IS 'Checklist de configurações necessárias para o lançamento';