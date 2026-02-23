CREATE TABLE public.task_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    start_time timestamptz NOT NULL,
    end_time timestamptz,
    duration_seconds integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task Sessions Select" ON public.task_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Task Sessions Insert" ON public.task_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Task Sessions Update" ON public.task_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Task Sessions Delete" ON public.task_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
