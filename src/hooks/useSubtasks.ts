import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SubtaskInsert, SubtaskUpdate } from "@/types/tasks";
import { taskKeys } from "./useTasks";
import { useToast } from "@/hooks/use-toast";

export function useCreateSubtask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (newSubtask: SubtaskInsert) => {
            const { data, error } = await supabase.from("subtasks").insert(newSubtask).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.task_id) });
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskKeys.today() });
            toast({ title: "Subtarefa criada" });
        },
        onError: (error) => {
            toast({ title: "Erro ao criar subtarefa", description: error.message, variant: "destructive" });
        },
    });
}

export function useUpdateSubtask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: SubtaskUpdate }) => {
            const { data, error } = await supabase
                .from("subtasks")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.task_id) });
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskKeys.today() });
        },
    });
}

export function useToggleSubtaskComplete() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, completed, taskId }: { id: string; completed: boolean; taskId: string }) => {
            const { data, error } = await supabase
                .from("subtasks")
                .update({ completed, completed_at: completed ? new Date().toISOString() : null })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return { data, taskId };
        },
        onSuccess: ({ taskId }) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskKeys.today() });
        },
    });
}

export function useDeleteSubtask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
            const { error } = await supabase.from("subtasks").delete().eq("id", id);
            if (error) throw error;
            return taskId;
        },
        onSuccess: (taskId) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
            queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskKeys.today() });
            toast({ title: "Subtarefa excluída" });
        },
    });
}
