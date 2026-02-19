import React, { useMemo } from "react";
import { Task } from "@/types/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToggleTaskComplete } from "@/hooks/useTaskMutations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, UserCircle } from "lucide-react";
import { isOverdue } from "@/lib/dateUtils";

interface TasksByPersonViewProps {
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
    selectedTasks: string[];
    onToggleSelectTask: (taskId: string) => void;
}

export function TasksByPersonView({ tasks, onTaskClick, selectedTasks, onToggleSelectTask }: TasksByPersonViewProps) {
    const { mutate: toggleComplete } = useToggleTaskComplete();

    const groupedByPerson = useMemo(() => {
        const groups: Record<string, Task[]> = {};

        tasks.forEach(task => {
            const person = task.assignee || "Sem Responsável";
            if (!groups[person]) groups[person] = [];
            groups[person].push(task);
        });

        // Ordenar para "Sem Responsável" ficar no final
        return Object.entries(groups).sort(([a], [b]) => {
            if (a === "Sem Responsável") return 1;
            if (b === "Sem Responsável") return -1;
            return a.localeCompare(b);
        });
    }, [tasks]);

    if (tasks.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
                Nenhuma tarefa encontrada.
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 pr-2">
            {groupedByPerson.map(([person, personTasks]) => (
                <div key={person} className="border rounded-xl bg-card overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900 border-b p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {person === "Sem Responsável" ? (
                                <UserCircle className="w-8 h-8 text-muted-foreground" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                                    {person.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <h3 className="font-semibold text-lg">{person}</h3>
                            <Badge variant="secondary" className="ml-2">{personTasks.length}</Badge>
                        </div>
                    </div>

                    <div className="divide-y">
                        {personTasks.map(task => (
                            <div
                                key={task.id}
                                className={`p-4 hover:bg-muted/50 transition-colors flex items-center gap-4 cursor-pointer ${task.completed ? "opacity-60 bg-slate-50/50" : ""}`}
                                onClick={() => onTaskClick(task.id)}
                            >
                                <div onClick={e => e.stopPropagation()} className="flex items-center gap-3">
                                    <Checkbox
                                        checked={selectedTasks.includes(task.id)}
                                        onCheckedChange={() => onToggleSelectTask(task.id)}
                                        className="mr-2"
                                    />
                                    <Checkbox
                                        checked={task.completed}
                                        onCheckedChange={c => toggleComplete({ id: task.id, completed: c as boolean })}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                                        {task.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                        {task.category || "Sem categoria"}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 shrink-0 text-sm">
                                    {task.priority && !task.completed && (
                                        <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className="capitalize">
                                            {task.priority}
                                        </Badge>
                                    )}
                                    {task.due_date && !task.completed && (
                                        <span className={`flex items-center gap-1.5 w-24 justify-end ${isOverdue(task.due_date, false) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                            <CalendarIcon className="w-4 h-4" />
                                            {format(new Date(`${task.due_date}T00:00:00`), "dd/MM", { locale: ptBR })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
