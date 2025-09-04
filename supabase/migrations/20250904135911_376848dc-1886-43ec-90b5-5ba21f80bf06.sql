-- Atualizar links existentes para usar caminhos relativos

-- Atualizar links do painel de clientes
UPDATE public.clientes 
SET link_painel = '/painel/' || id 
WHERE link_painel LIKE 'https://app.bnoads.com%' OR link_painel LIKE 'http%';

-- Atualizar links públicos de referências
UPDATE public.referencias_criativos 
SET link_publico = '/referencia/' || id 
WHERE link_publico LIKE 'https://app.bnoads.com%' OR link_publico LIKE 'http%';

-- Atualizar links públicos de POPs
UPDATE public.documentos 
SET link_publico = '/pop/publico/' || id 
WHERE categoria_documento = 'pop' 
AND (link_publico LIKE 'https://app.bnoads.com%' OR link_publico LIKE 'http%');