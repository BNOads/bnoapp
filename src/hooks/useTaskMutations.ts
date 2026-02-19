import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskInsert, TaskUpdate } from "@/types/tasks";
import { taskKeys } from "./useTasks";
import { useToast } from "@/hooks/use-toast";

export function useCreateTask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (newTask: TaskInsert) => {
            // Resolve assigned_to_id se vier apenas com assignee e não o ID
            let assigned_to_id = newTask.assigned_to_id;
            if (newTask.assignee && !assigned_to_id) {
                const { data: profile } = await supabase
                    .from("colaboradores")
                    .select("user_id")
                    .eq("nome", newTask.assignee)
                    .maybeSingle();
                if (profile?.user_id) assigned_to_id = profile.user_id;
            }

            const user = (await supabase.auth.getUser()).data.user;

            const taskData = {
                ...newTask,
                assigned_to_id,
                created_by_id: user?.id,
            };

            const { data, error } = await supabase.from("tasks").insert(taskData).select().single();
            if (error) throw error;

            // task_history entry
            await supabase.from("task_history").insert({
                task_id: data.id,
                action: "created",
                changed_by: user?.email || "Sistema",
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: "Tarefa criada com sucesso" });
        },
        onError: (error) => {
            toast({ title: "Erro ao criar tarefa", description: error.message, variant: "destructive" });
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
            const user = (await supabase.auth.getUser()).data.user;

            // Auto update completed_at logic would go here if missing in DB
            if (updates.completed === true) {
                updates.completed_at = new Date().toISOString();
                updates.doing_since = null;
            } else if (updates.completed === false) {
                updates.completed_at = null;
            }

            const { data, error } = await supabase
                .from("tasks")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;

            await supabase.from("task_history").insert({
                task_id: id,
                action: "updated",
                changed_by: user?.email || "Sistema",
            });

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) });
            toast({ title: "Tarefa atualizada" });
        },
        onError: (error) => {
            toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        },
    });
}

export function useToggleTaskComplete() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
            const payload: TaskUpdate = {
                completed,
                completed_at: completed ? new Date().toISOString() : null,
            };

            if (completed) {
                payload.doing_since = null;
            }

            const { data, error } = await supabase
                .from("tasks")
                .update(payload)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;

            const user = (await supabase.auth.getUser()).data.user;
            await supabase.from("task_history").insert({
                task_id: id,
                action: completed ? "completed" : "reopened",
                changed_by: user?.email || "Sistema",
            });

            return data;
        },
        // Optimistic UI updates could be added here
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) });
            if (data.completed) {
                toast({ title: "Tarefa concluída!", description: "Ótimo trabalho" });
            } else {
                toast({ title: "Tarefa reaberta" });
            }
        },
    });
}

export function useToggleTaskDoing() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, isDoing }: { id: string; isDoing: boolean }) => {
            const payload: TaskUpdate = {
                doing_since: isDoing ? new Date().toISOString() : null,
            };

            const { data, error } = await supabase
                .from("tasks")
                .update(payload)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) });
            if (variables.isDoing) {
                toast({ title: "Tarefa em progresso", description: "O cronômetro foi iniciado." });
            } else {
                toast({ title: "Trabalho pausado" });
            }
        },
    });
}

export function useCreateBulkTasks() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ tasks, assignee }: { tasks: Partial<TaskInsert>[]; assignee?: string }) => {
            if (!tasks.length) return [];

            const user = (await supabase.auth.getUser()).data.user;
            let assigned_to_id = null;

            if (assignee) {
                const { data: profile } = await supabase
                    .from("colaboradores")
                    .select("user_id")
                    .eq("nome", assignee)
                    .single();
                if (profile?.user_id) assigned_to_id = profile.user_id;
            }

            const sanitizedTasks = tasks.map(t => ({
                ...t,
                title: t.title?.trim() || "Nova Tarefa",
                assignee: assignee || t.assignee,
                assigned_to_id: assigned_to_id || t.assigned_to_id,
                created_by_id: user?.id,
            }));

            const { data, error } = await supabase.from("tasks").insert(sanitizedTasks).select();
            if (error) throw error;

            // History entries in bulk
            const historyEntries = data.map(d => ({
                task_id: d.id,
                action: "created",
                changed_by: user?.email || "Sistema",
            }));
            await supabase.from("task_history").insert(historyEntries);

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: `${data.length} tarefas criadas com sucesso` });
        },
        onError: (error) => {
            toast({ title: "Erro na criação em lote", description: error.message, variant: "destructive" });
        },
    });
}

export function useBulkUpdateTasks() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ taskIds, updates, newAssignee }: { taskIds: string[]; updates: TaskUpdate; newAssignee?: string }) => {
            if (!taskIds.length) return [];

            let assigned_to_id = updates.assigned_to_id;
            let assignee = updates.assignee;

            if (newAssignee) {
                assignee = newAssignee;
                const { data: profile } = await supabase
                    .from("colaboradores")
                    .select("user_id")
                    .eq("nome", newAssignee)
                    .single();
                if (profile?.user_id) assigned_to_id = profile.user_id;
            }

            const payload = {
                ...updates,
                assignee,
                assigned_to_id,
            };

            const { data, error } = await supabase
                .from("tasks")
                .update(payload)
                .in("id", taskIds)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: `${data.length} tarefas atualizadas` });
        },
    });
}

export function useBulkDeleteTasks() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (taskIds: string[]) => {
            if (!taskIds.length) return;
            const { error } = await supabase.from("tasks").delete().in("id", taskIds);
            if (error) throw error;
            return taskIds;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: "Tarefas excluídas", description: "As tarefas foram removidas junto com suas subtarefas." });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("tasks").delete().eq("id", id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: "Tarefa excluída" });
        },
    });
}
