-- Fix RLS policies for mensagens_semanais - simpler approach

-- 1) Replace the problematic policy (drop first to avoid conflicts)
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

-- 3) Add foreign keys if they don't exist
ALTER TABLE public.mensagens_semanais 
ADD CONSTRAINT IF NOT EXISTS mensagens_semanais_cliente_id_fkey
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

ALTER TABLE public.mensagens_semanais 
ADD CONSTRAINT IF NOT EXISTS mensagens_semanais_gestor_id_fkey  
FOREIGN KEY (gestor_id) REFERENCES public.colaboradores(id) ON DELETE RESTRICT;

ALTER TABLE public.mensagens_semanais 
ADD CONSTRAINT IF NOT EXISTS mensagens_semanais_cs_id_fkey
FOREIGN KEY (cs_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;