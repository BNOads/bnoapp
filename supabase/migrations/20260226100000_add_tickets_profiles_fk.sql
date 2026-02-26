-- Add explicit FK from tickets.responsavel_id to profiles.user_id
-- so PostgREST can resolve the join "profiles!tickets_responsavel_profiles_fkey"
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_responsavel_profiles_fkey
  FOREIGN KEY (responsavel_id) REFERENCES public.profiles(user_id);

-- Same for criado_por
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_criado_por_profiles_fkey
  FOREIGN KEY (criado_por) REFERENCES public.profiles(user_id);

-- Same for ticket_logs.user_id
ALTER TABLE public.ticket_logs
  ADD CONSTRAINT ticket_logs_user_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
