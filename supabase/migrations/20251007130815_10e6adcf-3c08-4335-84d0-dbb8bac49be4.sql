-- Corrigir semana_referencia para mensagens com data inconsistente
-- Atualizar para usar o início da semana baseado em created_at

UPDATE mensagens_semanais
SET semana_referencia = DATE_TRUNC('week', created_at AT TIME ZONE 'America/Sao_Paulo')::date + INTERVAL '1 day'
WHERE DATE_TRUNC('week', created_at AT TIME ZONE 'America/Sao_Paulo')::date + INTERVAL '1 day' != semana_referencia;

-- Comentário: Esta atualização corrige mensagens que foram criadas com semana_referencia 
-- inconsistente com a data de criação. Agora todas as mensagens terão semana_referencia
-- baseada na segunda-feira da semana em que foram criadas.