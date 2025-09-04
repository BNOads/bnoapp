-- Remover os POPs fictícios adicionados recentemente
DELETE FROM public.documentos 
WHERE categoria_documento = 'pop' 
AND titulo IN (
  'Criação de Campanhas no Facebook Ads',
  'Atendimento ao Cliente via WhatsApp', 
  'Onboarding de Novos Clientes',
  'Criação de Relatórios Mensais',
  'Backup e Segurança de Dados'
);