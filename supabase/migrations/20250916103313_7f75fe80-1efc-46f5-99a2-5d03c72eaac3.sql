-- Allow deleting a client even if there are related tasks by cascading deletes from tarefas
DO $$
BEGIN
  -- Drop existing FK if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tarefas_cliente_id_fkey' 
      AND table_schema = 'public' 
      AND table_name = 'tarefas'
  ) THEN
    EXECUTE 'ALTER TABLE public.tarefas DROP CONSTRAINT tarefas_cliente_id_fkey';
  END IF;

  -- Recreate FK with ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tarefas'
  ) THEN
    EXECUTE 'ALTER TABLE public.tarefas
             ADD CONSTRAINT tarefas_cliente_id_fkey
             FOREIGN KEY (cliente_id)
             REFERENCES public.clientes(id)
             ON DELETE CASCADE';
  END IF;
END $$;