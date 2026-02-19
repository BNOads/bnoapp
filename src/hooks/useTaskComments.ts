import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskCommentInsert } from "@/types/tasks";
import { taskKeys } from "./useTasks";
import { useToast } from "@/hooks/use-toast";

export function useCreateComment() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (newComment: TaskCommentInsert) => {
            const { data, error } = await supabase.from("task_comments").insert(newComment).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.task_id) });
        },
        onError: (error) => {
            toast({ title: "Erro ao adicionar comentário", description: error.message, variant: "destructive" });
        },
    });
}

export function useDeleteComment() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
            const { error } = await supabase.from("task_comments").delete().eq("id", id);
            if (error) throw error;
            return taskId;
        },
        onSuccess: (taskId) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
            toast({ title: "Comentário excluído" });
        },
    });
}
