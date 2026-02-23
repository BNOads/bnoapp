import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task, TaskInsert, TaskUpdate } from "@/types/tasks";
import { useToast } from "@/hooks/use-toast";

export const taskKeys = {
    all: ["tasks"] as const,
    lists: () => [...taskKeys.all, "list"] as const,
    list: (filters: string) => [...taskKeys.lists(), { filters }] as const,
    userLists: (userName: string) => [...taskKeys.lists(), "user", userName] as const,
    details: () => [...taskKeys.all, "detail"] as const,
    detail: (id: string) => [...taskKeys.details(), id] as const,
    today: () => [...taskKeys.all, "today"] as const,
    taskLists: () => [...taskKeys.all, "taskLists"] as const,
};

export interface TaskFilters {
    search?: string;
    priority?: string;
    category?: string;
    list_id?: string;
    assignee?: string;
    recurrence?: string;
    date?: string;
    created_by_id?: string;
}

export function useTasks(filters?: TaskFilters) {
    return useQuery({
        queryKey: taskKeys.list(JSON.stringify(filters || {})),
        queryFn: async () => {
            let query = supabase
                .from("tasks")
                .select("*, subtasks(id, completed), task_lists(*)")
                .order("completed", { ascending: true })
                .order("completed_at", { ascending: false, nullsFirst: true })
                .order("due_date", { ascending: true })
                .limit(300);

            if (filters?.search) {
                query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
            }
            if (filters?.priority && filters.priority !== "all") {
                query = query.eq("priority", filters.priority);
            }
            if (filters?.category && filters.category !== "all") {
                query = query.eq("category", filters.category);
            }
            if (filters?.list_id && filters.list_id !== "all") {
                query = query.eq("list_id", filters.list_id);
            }
            if (filters?.assignee && filters.assignee !== "all") {
                // Here we search by assignee name for simplicity, but it's better to search by ID or handle it carefully
                query = query.eq("assignee", filters.assignee);
            }
            if (filters?.recurrence) {
                if (filters.recurrence === "none") {
                    query = query.is("recurrence", null);
                } else if (filters.recurrence === "any") {
                    query = query.not("recurrence", "is", null);
                } else if (filters.recurrence !== "all") {
                    query = query.eq("recurrence", filters.recurrence);
                }
            }
            if (filters?.created_by_id) {
                query = query.eq("created_by_id", filters.created_by_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Task[];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useUserTasks(userFullName: string | null) {
    return useQuery({
        queryKey: taskKeys.userLists(userFullName || "none"),
        queryFn: async () => {
            if (!userFullName) return [];

            const { data, error } = await supabase
                .from("tasks")
                .select("*, subtasks(id, completed), task_lists(*)")
                .eq("assignee", userFullName)
                .order("completed", { ascending: true })
                .order("due_date", { ascending: true })
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as Task[];
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!userFullName,
    });
}

export function useTask(id: string) {
    return useQuery({
        queryKey: taskKeys.detail(id),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tasks")
                .select(`
          *,
          subtasks(*),
          task_comments(*),
          task_history(*),
          task_lists(*)
        `)
                .eq("id", id)
                .single();

            if (error) throw error;

            // Order comments and history
            if (data) {
                data.task_comments?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                data.task_history?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                // Build subtask tree
                const subtasks = data.subtasks || [];
                const subtasksTree = subtasks.filter((st: any) => !st.parent_subtask_id);

                const attachChildren = (parent: any) => {
                    parent.subtasks = subtasks.filter((st: any) => st.parent_subtask_id === parent.id);
                    parent.subtasks.forEach(attachChildren);
                };

                subtasksTree.forEach(attachChildren);
                data.subtasksTree = subtasksTree;
            }

            return data;
        },
        enabled: !!id,
    });
}

// ... more hooks will follow

export function useTaskLists() {
    return useQuery({
        queryKey: taskKeys.taskLists(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("task_lists")
                .select("*")
                .order("position", { ascending: true })
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data;
        },
        staleTime: 10 * 60 * 1000,
    });
}

// ------------------------------------------------------------------
// Fetch Task Sessions (Daily Timer Records)
// ------------------------------------------------------------------
export function useTaskSessions(userId?: string, limit: number = 2000) {
    return useQuery({
        queryKey: [...taskKeys.all, "sessions", userId, limit],
        queryFn: async () => {
            let q = supabase
                .from('task_sessions')
                .select(`
                    id, start_time, end_time, duration_seconds, user_id, task_id,
                    tasks!inner(id, title, list_id, priority)
                `)
                .order('start_time', { ascending: false })
                .limit(limit);

            if (userId && userId !== "all") {
                // Find matching user ID by name... Wait, we filter by name on the frontend.
                // Let's just fetch all and filter in useMemo for now to match exactly what is done today.
            }

            const { data, error } = await q;

            if (error) {
                console.error("Error fetching task sessions:", error);
                throw error;
            }

            return data as any[];
        },
        staleTime: 5 * 60 * 1000,
    });
}
