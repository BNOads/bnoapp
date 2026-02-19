-- Tabela tasks
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title varchar NOT NULL,
    description text,
    priority varchar NOT NULL DEFAULT 'media',
    category varchar,
    assignee varchar,
    assigned_to_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date date,
    due_time time,
    completed boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    position integer DEFAULT 0,
    recurrence varchar,
    recurrence_end_date date,
    parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    is_recurring_instance boolean DEFAULT false,
    doing_since timestamptz,
    created_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('alta', 'media', 'baixa'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_recurrence_check CHECK (recurrence IN ('daily', 'weekly', 'biweekly', 'monthly', 'semiannual', 'yearly', 'none', NULL));

-- Tabela subtasks
CREATE TABLE public.subtasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title text NOT NULL,
    completed boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    position integer NOT NULL DEFAULT 0,
    parent_subtask_id uuid REFERENCES public.subtasks(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela task_comments
CREATE TABLE public.task_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_name varchar NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela task_history
CREATE TABLE public.task_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    action text NOT NULL,
    field_changed text,
    old_value text,
    new_value text,
    changed_by text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Check se handle_updated_at já existe (muitos projetos Supabase já têm), mas vamos criar ou dar replace
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger tasks updated_at
CREATE TRIGGER handle_updated_at_tasks
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- 2.6 RLS (Row-Level Security)
-- tasks
-- SELECT: Todos autenticados
CREATE POLICY "Tasks Select" ON public.tasks FOR SELECT TO authenticated USING (true);
-- INSERT: Qualquer autenticado
CREATE POLICY "Tasks Insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
-- UPDATE: Dono (assigned_to_id ou created_by_id) ou legado (ambos nulos)
CREATE POLICY "Tasks Update" ON public.tasks FOR UPDATE TO authenticated USING (
    auth.uid() = assigned_to_id OR
    auth.uid() = created_by_id OR
    (assigned_to_id IS NULL AND created_by_id IS NULL)
) WITH CHECK (
    auth.uid() = assigned_to_id OR
    auth.uid() = created_by_id OR
    (assigned_to_id IS NULL AND created_by_id IS NULL)
);
-- DELETE: Mesmo que UPDATE
CREATE POLICY "Tasks Delete" ON public.tasks FOR DELETE TO authenticated USING (
    auth.uid() = assigned_to_id OR
    auth.uid() = created_by_id OR
    (assigned_to_id IS NULL AND created_by_id IS NULL)
);

-- subtasks
-- SELECT: Todos autenticados
CREATE POLICY "Subtasks Select" ON public.subtasks FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE/DELETE: Qualquer autenticado
CREATE POLICY "Subtasks Insert" ON public.subtasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Subtasks Update" ON public.subtasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Subtasks Delete" ON public.subtasks FOR DELETE TO authenticated USING (true);

-- task_comments
-- SELECT: Todos (assumo todos autenticados)
CREATE POLICY "Task Comments Select" ON public.task_comments FOR SELECT TO authenticated USING (true);
-- INSERT: task_id pertence ao usuário (assigned/created)
CREATE POLICY "Task Comments Insert" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND (
            t.assigned_to_id = auth.uid() OR
            t.created_by_id = auth.uid() OR
            (t.assigned_to_id IS NULL AND t.created_by_id IS NULL)
        )
    )
);
-- DELETE: author_name = email do usuário atual
CREATE POLICY "Task Comments Delete" ON public.task_comments FOR DELETE TO authenticated USING (
    author_name = (SELECT auth.email() FROM auth.users WHERE id = auth.uid() LIMIT 1)
);

-- task_history
-- SELECT: Todos
CREATE POLICY "Task History Select" ON public.task_history FOR SELECT TO authenticated USING (true);
-- INSERT: Qualquer autenticado
CREATE POLICY "Task History Insert" ON public.task_history FOR INSERT TO authenticated WITH CHECK (true);
