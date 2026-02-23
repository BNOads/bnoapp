-- Add is_locked and allowed_user_ids to task_lists
ALTER TABLE public.task_lists ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE public.task_lists ADD COLUMN IF NOT EXISTS allowed_user_ids uuid[] DEFAULT '{}'::uuid[];

-- Drop existing Select policy and recreate with is_locked check
DROP POLICY IF EXISTS "Task Lists Select" ON public.task_lists;

CREATE POLICY "Task Lists Select" ON public.task_lists FOR SELECT TO authenticated USING (
    is_locked = false OR
    auth.uid() = ANY(allowed_user_ids) OR
    auth.uid() = created_by_id OR
    EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.user_id = auth.uid() AND c.nivel_acesso IN ('admin', 'dono')
    )
);

-- We need to restrict tasks under a locked list as well
DROP POLICY IF EXISTS "Tasks Select" ON public.tasks;

CREATE POLICY "Tasks Select" ON public.tasks FOR SELECT TO authenticated USING (
    list_id IS NULL OR
    (
        SELECT tl.is_locked FROM public.task_lists tl WHERE tl.id = list_id
    ) IS NOT TRUE OR
    (
        SELECT auth.uid() = ANY(tl.allowed_user_ids) OR auth.uid() = tl.created_by_id 
        FROM public.task_lists tl WHERE tl.id = list_id
    ) IS TRUE OR
    EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.user_id = auth.uid() AND c.nivel_acesso IN ('admin', 'dono')
    )
);
