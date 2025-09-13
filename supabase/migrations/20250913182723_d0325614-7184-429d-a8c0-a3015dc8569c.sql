-- Add completion date column to tarefas table
ALTER TABLE public.tarefas 
ADD COLUMN data_conclusao timestamp with time zone,
ADD COLUMN concluida_por uuid REFERENCES auth.users(id);