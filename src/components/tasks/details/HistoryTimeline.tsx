import React from "react";
import { TaskHistory } from "@/types/tasks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, Edit, FilePlus, RefreshCcw, Trash2 } from "lucide-react";

interface HistoryTimelineProps {
    history: TaskHistory[];
}

export function HistoryTimeline({ history }: HistoryTimelineProps) {
    const getActionIcon = (action: string) => {
        switch (action) {
            case "created":
                return <FilePlus className="w-4 h-4 text-blue-500" />;
            case "updated":
                return <Edit className="w-4 h-4 text-amber-500" />;
            case "completed":
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case "reopened":
                return <RefreshCcw className="w-4 h-4 text-purple-500" />;
            case "deleted":
                return <Trash2 className="w-4 h-4 text-red-500" />;
            default:
                return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getActionText = (item: TaskHistory) => {
        switch (item.action) {
            case "created": return "criou a tarefa";
            case "completed": return "concluiu a tarefa";
            case "reopened": return "reabriu a tarefa";
            case "deleted": return "excluiu a tarefa";
            case "updated":
                if (item.field_changed) {
                    const fieldMap: Record<string, string> = {
                        title: "título",
                        description: "descrição",
                        priority: "prioridade",
                        status: "status",
                        due_date: "data de entrega",
                        assignee: "responsável",
                        category: "categoria",
                        recurrence: "recorrência"
                    };
                    const fieldName = fieldMap[item.field_changed] || item.field_changed;
                    return `alterou a ${fieldName}${item.new_value ? ` para "${item.new_value}"` : ""}`;
                }
                return "atualizou a tarefa";
            default: return `realizou a ação: ${item.action}`;
        }
    };

    if (!history || history.length === 0) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4">
                Nenhum histórico disponível.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="font-medium text-sm text-foreground/80">Histórico de Atividades</h3>
            <div className="relative border-l border-muted pl-4 ml-2 space-y-6">
                {history.map((item, index) => (
                    <div key={item.id} className="relative">
                        <span className="absolute -left-[25px] bg-background border p-1 rounded-full flex items-center justify-center">
                            {getActionIcon(item.action)}
                        </span>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-sm text-foreground">
                                <span className="font-medium">{item.changed_by}</span>{" "}
                                <span className="text-muted-foreground">{getActionText(item)}</span>
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
