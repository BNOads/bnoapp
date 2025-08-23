-- Inserir dados de exemplo para testes

-- Inserir alguns clientes de exemplo
INSERT INTO public.clientes (nome, categoria, nicho, etapa_atual, pasta_drive_url, link_painel, created_by) VALUES
('Loja Fashion Style', 'negocio_local', 'Roupas femininas', 'ativo', 'https://drive.google.com/folder1', 'https://app.bnoads.com/painel/fashion-style', '4759b9d5-8e40-41f2-a994-f609fb62b9c2'),
('Consultoria Digital Pro', 'infoproduto', 'Cursos online', 'implantacao', 'https://drive.google.com/folder2', 'https://app.bnoads.com/painel/digital-pro', '4759b9d5-8e40-41f2-a994-f609fb62b9c2'),
('Clínica Dr. Saúde', 'negocio_local', 'Medicina estética', 'negociacao', 'https://drive.google.com/folder3', 'https://app.bnoads.com/painel/clinica-saude', '4759b9d5-8e40-41f2-a994-f609fb62b9c2'),
('E-commerce Tech Solutions', 'infoproduto', 'Produtos eletrônicos', 'ativo', 'https://drive.google.com/folder4', 'https://app.bnoads.com/painel/tech-solutions', '4759b9d5-8e40-41f2-a994-f609fb62b9c2'),
('Academia Fit Life', 'negocio_local', 'Fitness e saúde', 'pausa', 'https://drive.google.com/folder5', 'https://app.bnoads.com/painel/fit-life', '4759b9d5-8e40-41f2-a994-f609fb62b9c2');

-- Atualizar alguns campos para tornar mais realista
UPDATE public.clientes SET 
  progresso_etapa = 75,
  total_acessos = 156,
  ultimo_acesso = NOW() - INTERVAL '2 hours',
  funis_trabalhando = ARRAY['conversao', 'remarketing']
WHERE nome = 'Loja Fashion Style';

UPDATE public.clientes SET 
  progresso_etapa = 45,
  total_acessos = 89,
  ultimo_acesso = NOW() - INTERVAL '1 day',
  funis_trabalhando = ARRAY['awareness', 'conversao']
WHERE nome = 'Consultoria Digital Pro';

UPDATE public.clientes SET 
  progresso_etapa = 30,
  total_acessos = 67,
  ultimo_acesso = NOW() - INTERVAL '3 days',
  funis_trabalhando = ARRAY['awareness']
WHERE nome = 'Clínica Dr. Saúde';

UPDATE public.clientes SET 
  progresso_etapa = 92,
  total_acessos = 234,
  ultimo_acesso = NOW() - INTERVAL '30 minutes',
  funis_trabalhando = ARRAY['conversao', 'retencao', 'remarketing']
WHERE nome = 'E-commerce Tech Solutions';

UPDATE public.clientes SET 
  progresso_etapa = 0,
  total_acessos = 12,
  ultimo_acesso = NOW() - INTERVAL '15 days',
  funis_trabalhando = ARRAY[]::text[]
WHERE nome = 'Academia Fit Life';