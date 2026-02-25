import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskInsert, TaskUpdate } from "@/types/tasks";
import { taskKeys } from "./useTasks";
import { useToast } from "@/hooks/use-toast";
import { addDays, addWeeks, addMonths, addYears, parseISO, format, endOfWeek, startOfWeek } from "date-fns";

// Helper to calculate next due date based on recurrence type
export const calculateNextDueDate = (currentDueDate: string | null, recurrence: string | null): string | null => {
    if (!currentDueDate || !recurrence || recurrence === "none") return null;

    const date = parseISO(currentDueDate);
    let nextDate = date;

    switch (recurrence) {
        case "daily":
            nextDate = addDays(date, 1);
            break;
        case "weekly":
            nextDate = addWeeks(date, 1);
            break;
        case "biweekly":
            nextDate = addWeeks(date, 2);
            break;
        case "monthly":
            nextDate = addMonths(date, 1);
            break;
        case "semiannual":
            nextDate = addMonths(date, 6);
            break;
        case "yearly":
            nextDate = addYears(date, 1);
            break;
        default:
            if (recurrence.startsWith("custom_weekly_")) {
                const daysStr = recurrence.replace("custom_weekly_", "");
                const targetDays = daysStr.split(",").map(Number); // 0 = Sun, 1 = Mon, etc.

                let found = false;
                for (let i = 1; i <= 7; i++) {
                    const candidateDate = addDays(date, i);
                    if (targetDays.includes(candidateDate.getDay())) {
                        nextDate = candidateDate;
                        found = true;
                        break;
                    }
                }
                if (!found) return null;
            } else if (recurrence.startsWith("custom_")) {
                const parts = recurrence.split("_");
                if (parts.length >= 3) {
                    const interval = parts[1]; // day, week, month, year
                    const amount = parseInt(parts[2] || "1", 10);
                    const daysStr = parts[3];

                    if (interval === "day") {
                        nextDate = addDays(date, amount);
                    } else if (interval === "month") {
                        nextDate = addMonths(date, amount);
                    } else if (interval === "year") {
                        nextDate = addYears(date, amount);
                    } else if (interval === "week") {
                        if (!daysStr) {
                            nextDate = addWeeks(date, amount);
                        } else {
                            const targetDays = daysStr.split(",").map(Number);
                            const endOfCurrentWeek = endOfWeek(date, { weekStartsOn: 1 });
                            let foundSameWeek = false;

                            for (let i = 1; i <= 7; i++) {
                                const candidate = addDays(date, i);
                                // Set candidate time to 0 to compare correctly with endOfWeek
                                candidate.setHours(0, 0, 0, 0);
                                const endWeekComparable = new Date(endOfCurrentWeek);
                                endWeekComparable.setHours(23, 59, 59, 999);

                                if (candidate > endWeekComparable) break;

                                if (targetDays.includes(candidate.getDay())) {
                                    nextDate = candidate;
                                    foundSameWeek = true;
                                    break;
                                }
                            }

                            if (!foundSameWeek) {
                                // Jump to `amount` weeks later
                                const nextCycleStart = addWeeks(startOfWeek(date, { weekStartsOn: 1 }), amount);
                                for (let i = 0; i < 7; i++) {
                                    const candidate = addDays(nextCycleStart, i);
                                    if (targetDays.includes(candidate.getDay())) {
                                        nextDate = candidate;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    return null;
                }
            } else {
                return null;
            }
    }

    return format(nextDate, 'yyyy-MM-dd');
};

// Helper to create the next instance if missing
export const handleRecurringTaskCreation = async (taskId: string) => {
    const { data: task } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

    if (!task || !task.recurrence || task.recurrence === "none" || !task.due_date) return;

    const nextDueDate = calculateNextDueDate(task.due_date, task.recurrence);
    if (!nextDueDate) return;

    if (task.recurrence_end_date && nextDueDate > task.recurrence_end_date) {
        return; // Recurrence ended
    }

    // Check if instance already exists to prevent duplication spam
    let duplicateQuery = supabase
        .from("tasks")
        .select("id")
        .eq("title", task.title)
        .eq("due_date", nextDueDate);

    if (task.list_id) {
        duplicateQuery = duplicateQuery.eq("list_id", task.list_id);
    } else {
        duplicateQuery = duplicateQuery.is("list_id", null);
    }

    const { data: existingData } = await duplicateQuery.limit(1);

    if (!existingData || existingData.length === 0) {
        // Create duplicate for next period
        const { id: _oldId, created_at, updated_at, completed_at, doing_since, timer_started_at, time_tracked, ...taskInfo } = task;

        const newTaskData = {
            ...taskInfo,
            completed: false,
            due_date: nextDueDate,
            is_recurring_instance: true,
        };

        const { data: newInst } = await supabase.from("tasks").insert(newTaskData).select("id").single();

        if (newInst) {
            const user = (await supabase.auth.getUser()).data.user;
            await supabase.from("task_history").insert({
                task_id: newInst.id,
                action: "created",
                changed_by: user?.email || "Sistema",
            });
        }
    }
};

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

            const validFields = ["title", "description", "priority", "status", "due_date", "assignee", "list_id", "category", "recurrence"];
            const historyInserts = Object.keys(updates)
                .filter(key => validFields.includes(key))
                .map((key) => ({
                    task_id: id,
                    action: "updated",
                    field_changed: key,
                    new_value: updates[key as keyof TaskUpdate] ? String(updates[key as keyof TaskUpdate]) : null,
                    changed_by: user?.email || "Sistema",
                }));

            if (historyInserts.length > 0) {
                await supabase.from("task_history").insert(historyInserts);
            } else {
                await supabase.from("task_history").insert({
                    task_id: id,
                    action: "updated",
                    changed_by: user?.email || "Sistema",
                });
            }

            if (updates.completed === true) {
                await handleRecurringTaskCreation(id);
            }

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

            if (completed) {
                await handleRecurringTaskCreation(id);
            }

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

export const useBulkDuplicateTasks = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (taskIds: string[]) => {
            if (!taskIds.length) return [];

            const user = (await supabase.auth.getUser()).data.user;

            // Fetch all tasks to be duplicated
            const { data: tasks, error: fetchError } = await supabase
                .from("tasks")
                .select("*")
                .in("id", taskIds);

            if (fetchError) throw fetchError;
            if (!tasks || tasks.length === 0) return [];

            const duplicatedTasks: any[] = [];

            for (const task of tasks) {
                const { id: oldId, created_at, updated_at, completed_at, doing_since, timer_started_at, time_tracked, ...taskInfo } = task;
                const { data: newTasks, error: insertError } = await supabase
                    .from("tasks")
                    .insert({
                        ...taskInfo,
                        title: `${taskInfo.title} (Cópia)`,
                        completed: false,
                        created_by_id: user?.id
                    })
                    .select()
                    .single();

                if (insertError) continue;
                if (newTasks) {
                    duplicatedTasks.push(newTasks);

                    // Copy subtasks
                    const { data: subtasks } = await supabase
                        .from("subtasks")
                        .select("*")
                        .eq("task_id", oldId);

                    if (subtasks && subtasks.length > 0) {
                        const newSubtasks = subtasks.map(s => ({
                            task_id: newTasks.id,
                            title: s.title,
                            position: s.position,
                            completed: false
                        }));
                        await supabase.from("subtasks").insert(newSubtasks);
                    }

                    // Record in history
                    await supabase.from("task_history").insert({
                        task_id: newTasks.id,
                        action: "created",
                        changed_by: user?.email || "Sistema",
                        field_changed: "duplication",
                        new_value: `Duplicada da tarefa ID: ${oldId}`
                    });
                }
            }

            return duplicatedTasks;
        },
        onSuccess: (data: any[]) => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: `${data.length} tarefas duplicadas com sucesso` });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao duplicar tarefas", description: error.message, variant: "destructive" });
        }
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
        onMutate: async (taskIds) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.all });
            const previousTasks = queryClient.getQueriesData<import("@/types/tasks").Task[]>({ queryKey: taskKeys.all });

            queryClient.setQueriesData<import("@/types/tasks").Task[]>({ queryKey: taskKeys.all }, (old) => {
                if (!Array.isArray(old)) return old;
                return old.filter(t => !taskIds.includes(t.id));
            });

            return { previousTasks };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTasks) {
                context.previousTasks.forEach(([queryKey, data]) => {
                    // Type assertion to bypass strict typing for queryKey array
                    queryClient.setQueryData(queryKey as any, data);
                });
            }
            toast({ title: "Erro ao excluir tarefas", description: err.message, variant: "destructive" });
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
        onMutate: async (deletedId) => {
            await queryClient.cancelQueries({ queryKey: taskKeys.all });
            const previousTasks = queryClient.getQueriesData<import("@/types/tasks").Task[]>({ queryKey: taskKeys.all });

            queryClient.setQueriesData<import("@/types/tasks").Task[]>({ queryKey: taskKeys.all }, (old) => {
                if (!Array.isArray(old)) return old;
                return old.filter(t => t.id !== deletedId);
            });

            return { previousTasks };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTasks) {
                context.previousTasks.forEach(([queryKey, data]) => {
                    // Type assertion to bypass strict typing for queryKey array
                    queryClient.setQueryData(queryKey as any, data);
                });
            }
            toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            toast({ title: "Tarefa excluída" });
        },
    });
}
