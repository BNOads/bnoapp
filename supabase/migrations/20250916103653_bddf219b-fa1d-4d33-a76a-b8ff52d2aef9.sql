-- Clean up orphaned data before recreating constraints
DO $$
BEGIN
  -- Remove orphaned records from orcamentos_funil
  DELETE FROM public.orcamentos_funil 
  WHERE cliente_id NOT IN (SELECT id FROM public.clientes);
  
  -- Remove orphaned records from links_importantes
  DELETE FROM public.links_importantes 
  WHERE cliente_id NOT IN (SELECT id FROM public.clientes);
  
  -- Remove orphaned records from creatives (using client_id)
  DELETE FROM public.creatives 
  WHERE client_id NOT IN (SELECT id FROM public.clientes);
  
  -- Remove orphaned records from uploads_clientes
  DELETE FROM public.uploads_clientes 
  WHERE cliente_id NOT IN (SELECT id FROM public.clientes);
  
  -- Set NULL for nullable FK references
  UPDATE public.debriefings 
  SET cliente_id = NULL 
  WHERE cliente_id NOT IN (SELECT id FROM public.clientes);
  
  UPDATE public.referencias_criativos 
  SET cliente_id = NULL 
  WHERE cliente_id NOT IN (SELECT id FROM public.clientes);
  
  UPDATE public.documentos 
  SET cliente_id = NULL 
  WHERE cliente_id NOT IN (SELECT id FROM public.clientes);
  
  UPDATE public.reunioes_documentos 
  SET cliente_id = NULL 
  WHERE cliente_id NOT IN (SELECT id FROM public.clientes);
  
  -- Remove orphaned tasks if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tarefas') THEN
    DELETE FROM public.tarefas 
    WHERE cliente_id NOT IN (SELECT id FROM public.clientes);
  END IF;
END $$;