-- Atualizar política RLS para permitir acesso público completo aos debriefings
DROP POLICY IF EXISTS "Acesso público a debriefings concluídos" ON public.debriefings;

-- Criar nova política que permite acesso público a todos os debriefings
CREATE POLICY "Acesso público a todos os debriefings"
ON public.debriefings
FOR SELECT
USING (
  -- Permitir acesso público a todos os debriefings OU para usuários autenticados
  true OR (EXISTS ( 
    SELECT 1
    FROM profiles p
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true
  ))
);

-- Comentário explicativo
COMMENT ON POLICY "Acesso público a todos os debriefings" ON public.debriefings IS 
'Permite acesso público a todos os debriefings para garantir que links públicos funcionem com todos os dados';