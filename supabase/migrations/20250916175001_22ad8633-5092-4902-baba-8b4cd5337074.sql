-- Fix RLS and relationships for mensagens_semanais

-- 1) Create foreign keys to enable PostgREST relationships used by the UI
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mensagens_semanais_cliente_id_fkey'
  ) THEN
    ALTER TABLE public.mensagens_semanais
    ADD CONSTRAINT mensagens_semanais_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mensagens_semanais_gestor_id_fkey'
  ) THEN
    ALTER TABLE public.mensagens_semanais
    ADD CONSTRAINT mensagens_semanais_gestor_id_fkey
    FOREIGN KEY (gestor_id) REFERENCES public.colaboradores(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mensagens_semanais_cs_id_fkey'
  ) THEN
    ALTER TABLE public.mensagens_semanais
    ADD CONSTRAINT mensagens_semanais_cs_id_fkey
    FOREIGN KEY (cs_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mensagens_semanais_enviado_por_fkey'
  ) THEN
    ALTER TABLE public.mensagens_semanais
    ADD CONSTRAINT mensagens_semanais_enviado_por_fkey
    FOREIGN KEY (enviado_por) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mensagens_semanais_created_by_fkey'
  ) THEN
    ALTER TABLE public.mensagens_semanais
    ADD CONSTRAINT mensagens_semanais_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 2) Replace the manager/CS management policy to include mapping via colaboradores
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'mensagens_semanais' 
      AND policyname = 'Gestores podem gerenciar mensagens de seus clientes'
  ) THEN
    DROP POLICY "Gestores podem gerenciar mensagens de seus clientes" ON public.mensagens_semanais;
  END IF;
END $$;

CREATE POLICY "Gestores/CS podem gerenciar mensagens dos seus clientes"
ON public.mensagens_semanais
FOR ALL
USING (
  (
    EXISTS (
      SELECT 1 
      FROM public.clientes c
      WHERE c.id = mensagens_semanais.cliente_id
        AND (
          -- Associação direta por user_id primário
          c.primary_gestor_user_id = auth.uid()
          OR c.primary_cs_user_id = auth.uid()
          -- Associação via colaborador (traffic manager ou CS)
          OR c.traffic_manager_id IN (
            SELECT col.id FROM public.colaboradores col WHERE col.user_id = auth.uid()
          )
          OR c.cs_id IN (
            SELECT col2.id FROM public.colaboradores col2 WHERE col2.user_id = auth.uid()
          )
        )
    )
    OR public.is_admin_with_valid_reason(auth.uid())
  )
)
WITH CHECK (
  (
    EXISTS (
      SELECT 1 
      FROM public.clientes c
      WHERE c.id = mensagens_semanais.cliente_id
        AND (
          c.primary_gestor_user_id = auth.uid()
          OR c.primary_cs_user_id = auth.uid()
          OR c.traffic_manager_id IN (
            SELECT col.id FROM public.colaboradores col WHERE col.user_id = auth.uid()
          )
          OR c.cs_id IN (
            SELECT col2.id FROM public.colaboradores col2 WHERE col2.user_id = auth.uid()
          )
        )
    )
    OR public.is_admin_with_valid_reason(auth.uid())
  )
);

-- 3) Ensure updated_at auto-update trigger exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_mensagens_semanais_updated_at'
  ) THEN
    CREATE TRIGGER update_mensagens_semanais_updated_at
    BEFORE UPDATE ON public.mensagens_semanais
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'idx_mensagens_semanais_cliente_semana'
  ) THEN
    CREATE INDEX idx_mensagens_semanais_cliente_semana 
      ON public.mensagens_semanais(cliente_id, semana_referencia);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'idx_mensagens_semanais_gestor'
  ) THEN
    CREATE INDEX idx_mensagens_semanais_gestor 
      ON public.mensagens_semanais(gestor_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'idx_mensagens_semanais_enviado'
  ) THEN
    CREATE INDEX idx_mensagens_semanais_enviado 
      ON public.mensagens_semanais(enviado);
  END IF;
END $$;