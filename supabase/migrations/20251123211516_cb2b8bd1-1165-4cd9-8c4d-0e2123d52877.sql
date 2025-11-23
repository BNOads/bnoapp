-- Tornar todos os lançamentos públicos por padrão
UPDATE lancamentos 
SET link_publico_ativo = true 
WHERE link_publico_ativo = false OR link_publico_ativo IS NULL;

-- Garantir que novos lançamentos sejam públicos por padrão
ALTER TABLE lancamentos 
ALTER COLUMN link_publico_ativo SET DEFAULT true;

-- Remover políticas antigas conflitantes se existirem
DROP POLICY IF EXISTS "Acesso público a lançamentos ativos de clientes" ON lancamentos;

-- Recriar política para acesso público a lançamentos
DROP POLICY IF EXISTS "Acesso público a lançamentos com link ativo" ON lancamentos;

CREATE POLICY "Acesso público a lançamentos públicos" 
ON lancamentos 
FOR SELECT 
USING (
  link_publico_ativo = true
);

-- Comentário explicativo
COMMENT ON POLICY "Acesso público a lançamentos públicos" ON lancamentos IS 
'Permite acesso público (sem autenticação) a lançamentos marcados como públicos';
