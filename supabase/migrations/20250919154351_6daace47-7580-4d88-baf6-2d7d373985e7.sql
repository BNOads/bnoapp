-- Primeiro, vamos remover duplicatas baseado no nome_funil e cliente_id
-- Mantendo apenas o registro mais recente de cada duplicata
WITH duplicatas AS (
  SELECT 
    id,
    cliente_id,
    nome_funil,
    ROW_NUMBER() OVER (
      PARTITION BY cliente_id, nome_funil 
      ORDER BY created_at DESC
    ) as rn
  FROM orcamentos_funil 
  WHERE ativo = true
)
UPDATE orcamentos_funil 
SET ativo = false 
WHERE id IN (
  SELECT id FROM duplicatas WHERE rn > 1
);

-- Atualizar as políticas RLS para permitir que todos usuários logados possam deletar orçamentos
DROP POLICY IF EXISTS "Admins e criadores podem deletar orcamentos" ON orcamentos_funil;

CREATE POLICY "Usuarios autenticados podem deletar orcamentos" 
ON orcamentos_funil 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true 
    AND p.nivel_acesso = ANY(ARRAY['admin'::nivel_acesso, 'gestor_trafego'::nivel_acesso, 'cs'::nivel_acesso])
  )
);

-- Criar um índice único para prevenir futuras duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_orcamentos_funil_unique_ativo 
ON orcamentos_funil (cliente_id, nome_funil) 
WHERE ativo = true;