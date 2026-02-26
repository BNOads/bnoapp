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

export type TaskListRow = Database['public']['Tables']['task_lists']['Row'];
export type TaskListInsert = Database['public']['Tables']['task_lists']['Insert'];
export type TaskListUpdate = Database['public']['Tables']['task_lists']['Update'];

export type TaskPriority = "alta" | "media" | "baixa";

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
    alta: "Copa do Mundo",
    media: "Libertadores",
    baixa: "Brasileirão",
};

export type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly" | "semiannual" | "yearly";

export const RECURRENCE_LABELS: Record<string, string> = {
    none: "Sem recorrência",
    daily: "Diário",
    weekly: "Semanal",
    biweekly: "Quinzenal",
    monthly: "Mensal",
    semiannual: "Semestral",
    yearly: "Anual",
};

export function getRecurrenceLabel(recurrence: string | null | undefined): string {
    if (!recurrence || recurrence === "none") return "Sem recorrência";
    if (RECURRENCE_LABELS[recurrence]) return RECURRENCE_LABELS[recurrence];

    // Legacy format
    if (recurrence.startsWith("custom_weekly_")) {
        const days = recurrence.replace("custom_weekly_", "").split(",");
        const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const namedDays = days.map(d => dayNames[parseInt(d, 10)]).filter(Boolean);
        return `Semanalmente (${namedDays.join(", ")})`;
    }

    // New format: custom_interval_amount_days?
    if (recurrence.startsWith("custom_")) {
        const parts = recurrence.split("_");
        if (parts.length >= 3) {
            const interval = parts[1]; // day, week, month, year
            const amount = parseInt(parts[2] || "1", 10);

            let baseLabel = "";
            if (interval === "day") {
                baseLabel = amount === 1 ? "Todo dia" : `A cada ${amount} dias`;
            } else if (interval === "week") {
                baseLabel = amount === 1 ? "Toda semana" : `A cada ${amount} semanas`;
            } else if (interval === "month") {
                baseLabel = amount === 1 ? "Todo mês" : `A cada ${amount} meses`;
            } else if (interval === "year") {
                baseLabel = amount === 1 ? "Todo ano" : `A cada ${amount} anos`;
            }

            if (interval === "week" && parts[3]) {
                const days = parts[3].split(",");
                const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                const namedDays = days.map(d => dayNames[parseInt(d, 10)]).filter(Boolean);
                if (namedDays.length > 0) {
                    baseLabel += ` (${namedDays.join(", ")})`;
                }
            }

            return baseLabel;
        }
    }

    return "Personalizado";
}

export type TaskStatus = "overdue" | "today" | "upcoming" | "no-date";

export type TaskHistoryAction = "created" | "updated" | "completed" | "reopened" | "deleted";

export interface Task extends Omit<TaskRow, 'time_tracked' | 'timer_started_at'> {
    subtasks?: Subtask[];
    task_comments?: TaskComment[];
    task_history?: TaskHistory[];
    timer_started_at?: string | null;
    time_tracked?: number | null;
}

export interface Subtask extends SubtaskRow {
    subtasks?: Subtask[];
}

export interface TaskComment extends TaskCommentRow { }

export interface TaskHistory extends TaskHistoryRow { }
