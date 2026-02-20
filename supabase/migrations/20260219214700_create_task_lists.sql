-- Create task_lists table
CREATE TABLE public.task_lists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar NOT NULL,
    color varchar DEFAULT '#64748b',
    position integer DEFAULT 0,
    created_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos autenticados
CREATE POLICY "Task Lists Select" ON public.task_lists FOR SELECT TO authenticated USING (true);

-- INSERT: Apenas admin e dono
CREATE POLICY "Task Lists Insert" ON public.task_lists FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.user_id = auth.uid() AND c.nivel_acesso IN ('admin', 'dono')
    )
);

-- UPDATE/DELETE: Apenas admin e dono
CREATE POLICY "Task Lists Update" ON public.task_lists FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.user_id = auth.uid() AND c.nivel_acesso IN ('admin', 'dono')
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.user_id = auth.uid() AND c.nivel_acesso IN ('admin', 'dono')
    )
);

CREATE POLICY "Task Lists Delete" ON public.task_lists FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.user_id = auth.uid() AND c.nivel_acesso IN ('admin', 'dono')
    )
);

-- Trigger updated_at
CREATE TRIGGER handle_updated_at_task_lists
    BEFORE UPDATE ON public.task_lists
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add list_id to tasks
ALTER TABLE public.tasks ADD COLUMN list_id uuid REFERENCES public.task_lists(id) ON DELETE SET NULL;

-- Insert default lists
INSERT INTO public.task_lists (id, name, color, position) VALUES
    (gen_random_uuid(), 'Lançamento', '#ef4444', 1),
    (gen_random_uuid(), 'Marketing', '#f97316', 2),
    (gen_random_uuid(), 'Vendas', '#eab308', 3),
    (gen_random_uuid(), 'Suporte', '#22c55e', 4),
    (gen_random_uuid(), 'Administrativo', '#3b82f6', 5),
    (gen_random_uuid(), 'Onboarding', '#8b5cf6', 6),
    (gen_random_uuid(), 'Tráfego Pago', '#ec4899', 7),
    (gen_random_uuid(), 'Webdesign', '#06b6d4', 8);

-- Migrate old categories to new lists roughly
UPDATE public.tasks t
SET list_id = tl.id
FROM public.task_lists tl
WHERE lower(t.category) = lower(tl.name);
