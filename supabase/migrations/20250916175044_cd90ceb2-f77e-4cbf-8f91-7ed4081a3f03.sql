-- Fix RLS policies for mensagens_semanais

-- 1) Replace the problematic policy 
DROP POLICY IF EXISTS "Gestores podem gerenciar mensagens de seus clientes" ON public.mensagens_semanais;
DROP POLICY IF EXISTS "Gestores/CS podem gerenciar mensagens dos seus clientes" ON public.mensagens_semanais;

-- 2) Create a more permissive policy to allow saving messages
CREATE POLICY "Usuários autenticados podem gerenciar mensagens"
ON public.mensagens_semanais
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.user_id = auth.uid() 
      AND p.ativo = true
  )
);

-- 3) Add foreign keys using DO blocks to check existence
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mensagens_semanais_cliente_id_fkey'
  ) THEN
    ALTER TABLE public.mensagens_semanais 
    ADD CONSTRAINT mensagens_semanais_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mensagens_semanais_gestor_id_fkey'
  ) THEN
    ALTER TABLE public.mensagens_semanais 
    ADD CONSTRAINT mensagens_semanais_gestor_id_fkey  
    FOREIGN KEY (gestor_id) REFERENCES public.colaboradores(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mensagens_semanais_cs_id_fkey'
  ) THEN
    ALTER TABLE public.mensagens_semanais 
    ADD CONSTRAINT mensagens_semanais_cs_id_fkey
    FOREIGN KEY (cs_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;
  END IF;
END $$;