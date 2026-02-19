import { Database } from "@/integrations/supabase/types";

export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type SubtaskRow = Database['public']['Tables']['subtasks']['Row'];
export type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];
export type SubtaskUpdate = Database['public']['Tables']['subtasks']['Update'];

export type TaskCommentRow = Database['public']['Tables']['task_comments']['Row'];
export type TaskCommentInsert = Database['public']['Tables']['task_comments']['Insert'];

export type TaskHistoryRow = Database['public']['Tables']['task_history']['Row'];
export type TaskHistoryInsert = Database['public']['Tables']['task_history']['Insert'];

export type TaskPriority = "alta" | "media" | "baixa";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
    alta: "Copa do Mundo",
    media: "Libertadores",
    baixa: "Brasileirão",
};

export type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "semiannual" | "yearly";

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
    none: "Sem recorrência",
    daily: "Diário",
    weekly: "Semanal",
    biweekly: "Quinzenal",
    monthly: "Mensal",
    semiannual: "Semestral",
    yearly: "Anual",
};

export type TaskStatus = "overdue" | "today" | "upcoming" | "no-date";

export type TaskHistoryAction = "created" | "updated" | "completed" | "reopened" | "deleted";

export interface Task extends TaskRow {
    subtasks?: Subtask[];
    task_comments?: TaskComment[];
    task_history?: TaskHistory[];
}

export interface Subtask extends SubtaskRow {
    subtasks?: Subtask[];
}

export interface TaskComment extends TaskCommentRow { }

export interface TaskHistory extends TaskHistoryRow { }
