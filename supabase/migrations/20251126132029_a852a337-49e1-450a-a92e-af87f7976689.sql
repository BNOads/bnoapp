-- Atualizar o default do checklist_configuracao para incluir os novos itens
ALTER TABLE public.lancamentos 
ALTER COLUMN checklist_configuracao SET DEFAULT '{
  "pixel_api": false,
  "pagina_obrigado": false,
  "planilha_leads": false,
  "planilha_vendas": false,
  "pesquisa": false,
  "email_boas_vindas": false,
  "cpl_aulas": false,
  "etapas_lancamento": false,
  "checklist_criativos": false,
  "utms_organicas": false
}'::jsonb;

-- Atualizar registros existentes que ainda não têm os novos campos
UPDATE public.lancamentos
SET checklist_configuracao = COALESCE(checklist_configuracao, '{}'::jsonb) || 
  '{
    "cpl_aulas": false,
    "etapas_lancamento": false,
    "checklist_criativos": false,
    "utms_organicas": false
  }'::jsonb
WHERE checklist_configuracao IS NULL 
   OR NOT (checklist_configuracao ? 'cpl_aulas')
   OR NOT (checklist_configuracao ? 'etapas_lancamento')
   OR NOT (checklist_configuracao ? 'checklist_criativos')
   OR NOT (checklist_configuracao ? 'utms_organicas');