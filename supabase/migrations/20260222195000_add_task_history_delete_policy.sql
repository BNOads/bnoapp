-- Add DELETE policy to task_history to allow cascading deletes from tasks
CREATE POLICY "Task History Delete" ON public.task_history 
    FOR DELETE 
    TO authenticated 
    USING (true);
