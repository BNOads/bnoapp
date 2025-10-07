-- Corrigir novamente a semana_referencia para remover o dia extra
-- DATE_TRUNC já retorna a segunda-feira correta, não precisa adicionar 1 dia

UPDATE mensagens_semanais
SET semana_referencia = DATE_TRUNC('week', created_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE semana_referencia != DATE_TRUNC('week', created_at AT TIME ZONE 'America/Sao_Paulo')::date;

-- Comentário: Correção da migração anterior. DATE_TRUNC('week') já retorna a segunda-feira
-- quando configurado corretamente, não precisa adicionar 1 dia.