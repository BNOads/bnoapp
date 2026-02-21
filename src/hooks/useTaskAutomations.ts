import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TaskAutomation {
    id: string;
    name: string;
    trigger_type: string;
    trigger_conditions: any;
    actions: { type: string; payload: any }[];
    is_active: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const automationKeys = {
    all: ["task_automations"] as const,
    list: () => [...automationKeys.all, "list"] as const,
};

export function useTaskAutomations() {
    return useQuery({
        queryKey: automationKeys.list(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("task_automations")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as TaskAutomation[];
        },
    });
}

export function useCreateTaskAutomation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (newAutomation: Omit<TaskAutomation, "id" | "created_at" | "updated_at">) => {
            const { data, error } = await supabase
                .from("task_automations")
                .insert(newAutomation)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: automationKeys.all });
            toast({
                title: "Sucesso",
                description: "Automação criada com sucesso.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao criar automação",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

export function useUpdateTaskAutomation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<TaskAutomation> & { id: string }) => {
            const { data, error } = await supabase
                .from("task_automations")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: automationKeys.all });
            toast({
                title: "Sucesso",
                description: "Automação atualizada com sucesso.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao atualizar automação",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

export function useDeleteTaskAutomation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("task_automations")
                .delete()
                .eq("id", id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: automationKeys.all });
            toast({
                title: "Sucesso",
                description: "Automação excluída com sucesso.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao excluir automação",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

export interface TaskAutomationLog {
    id: string;
    automation_id: string;
    trigger_event: string;
    status: 'success' | 'error' | 'skipped';
    message: string;
    details: any;
    created_at: string;
}

export const automationLogKeys = {
    all: ["task_automation_logs"] as const,
    list: () => [...automationLogKeys.all, "list"] as const,
};

export function useTaskAutomationLogs() {
    return useQuery({
        queryKey: automationLogKeys.list(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("task_automation_logs")
                .select("*, automations:task_automations(name)")
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as (TaskAutomationLog & { automations?: { name: string } | null })[];
        },
    });
}
