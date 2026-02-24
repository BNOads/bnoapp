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
    automation_id: string | null;
    trigger_event: string;
    status: 'success' | 'error' | 'skipped';
    message: string | null;
    details: any;
    created_at: string;
}

export type TaskAutomationLogWithAutomation = TaskAutomationLog & {
    automations?: { name: string } | null;
};

export const automationLogKeys = {
    all: ["task_automation_logs"] as const,
    list: () => [...automationLogKeys.all, "list"] as const,
};

export function useTaskAutomationLogs() {
    return useQuery({
        queryKey: automationLogKeys.list(),
        queryFn: async () => {
            const { data: logsData, error: logsError } = await supabase
                .from("task_automation_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (logsError) throw logsError;

            const logs = (logsData || []) as TaskAutomationLog[];
            const automationIds = Array.from(
                new Set(
                    logs
                        .map((log) => log.automation_id)
                        .filter((id): id is string => Boolean(id))
                )
            );

            if (automationIds.length === 0) {
                return logs.map((log) => ({ ...log, automations: null }));
            }

            const { data: automationsData, error: automationsError } = await supabase
                .from("task_automations")
                .select("id, name")
                .in("id", automationIds);

            if (automationsError) {
                console.error("Erro ao carregar nomes das automações para logs:", automationsError);
                return logs.map((log) => ({ ...log, automations: null }));
            }

            const automationNameById = new Map(
                (automationsData || []).map((auto) => [auto.id, auto.name])
            );

            return logs.map((log) => ({
                ...log,
                automations: log.automation_id && automationNameById.has(log.automation_id)
                    ? { name: automationNameById.get(log.automation_id)! }
                    : null,
            }));
        },
    });
}

const parseLogPayload = (details: any): Record<string, unknown> | null => {
    if (details && typeof details === "object" && !Array.isArray(details)) {
        const detailsObj = details as Record<string, unknown>;
        if (detailsObj.trigger_data && typeof detailsObj.trigger_data === "object" && !Array.isArray(detailsObj.trigger_data)) {
            return detailsObj.trigger_data as Record<string, unknown>;
        }
        return detailsObj;
    }

    if (typeof details === "string") {
        try {
            const parsed = JSON.parse(details);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const parsedObj = parsed as Record<string, unknown>;
                if (parsedObj.trigger_data && typeof parsedObj.trigger_data === "object" && !Array.isArray(parsedObj.trigger_data)) {
                    return parsedObj.trigger_data as Record<string, unknown>;
                }
                return parsedObj;
            }
        } catch {
            return null;
        }
    }

    return null;
};

export function useReExecuteTaskAutomationLog() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (log: TaskAutomationLogWithAutomation) => {
            const triggerData = parseLogPayload(log.details);
            if (!triggerData) {
                throw new Error("Este log não possui dados válidos para reexecução.");
            }

            const body: Record<string, unknown> = {
                trigger_type: log.trigger_event,
                data: triggerData,
            };

            if (log.automation_id) {
                body.automation_id = log.automation_id;
            }

            const { data, error } = await supabase.functions.invoke("evaluate-automations", { body });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: automationLogKeys.all });
            toast({
                title: "Reexecução concluída",
                description: "A automação foi reprocessada com sucesso.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao reexecutar automação",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}
