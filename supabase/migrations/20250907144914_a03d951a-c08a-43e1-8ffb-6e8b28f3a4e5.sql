-- Atualizar políticas RLS para permitir acesso público a debriefings concluídos
-- Remover política existente e criar nova
DROP POLICY IF EXISTS "Usuários autenticados podem ver debriefings" ON public.debriefings;

-- Nova política que permite acesso público para debriefings concluídos
CREATE POLICY "Acesso público a debriefings concluídos" 
ON public.debriefings 
FOR SELECT 
USING (
  status = 'concluido' OR 
  (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.ativo = true))))
);