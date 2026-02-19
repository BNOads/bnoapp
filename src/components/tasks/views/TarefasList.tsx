import React, { useMemo, useState } from "react";
import { Task, PRIORITY_LABELS } from "@/types/tasks";
import { isOverdue, isToday } from "@/lib/dateUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, MessageSquare, CalendarIcon, AlertCircle } from "lucide-react";
import { useToggleTaskComplete } from "@/hooks/useTaskMutations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TarefasListProps {
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
}

export function TarefasList({ tasks, onTaskClick }: TarefasListProps) {
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
        completed: true, // completed collapsed by default
    });

    const toggleSection = (section: string) => {
        setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const groupedTasks = useMemo(() => {
        const groups = {
            overdue: [] as Task[],
            today: [] as Task[],
            upcoming: [] as Task[],
            noDate: [] as Task[],
            completed: [] as Task[],
        };

        tasks.forEach(task => {
            if (task.completed) {
                groups.completed.push(task);
            } else if (!task.due_date) {
                groups.noDate.push(task);
            } else if (isOverdue(task.due_date, task.completed)) {
                groups.overdue.push(task);
            } else if (isToday(task.due_date)) {
                groups.today.push(task);
            } else {
                groups.upcoming.push(task);
            }
        });

        return groups;
    }, [tasks]);

    const renderSection = (title: string, key: string, groupTasks: Task[], icon?: React.ReactNode, titleColor?: string) => {
        if (groupTasks.length === 0 && key !== 'today') return null; // Always show today even if empty? Or hide if empty. We'll hide empty except maybe today
        if (groupTasks.length === 0) return null;

        const isCollapsed = collapsed[key];

        return (
            <div key={key} className="mb-6">
                <button
                    onClick={() => toggleSection(key)}
                    className={`flex items-center gap-2 font-medium mb-3 ${titleColor || "text-foreground"}`}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {icon}
                    {title}
                    <Badge variant="secondary" className="ml-2 font-normal rounded-full px-2 py-0.5 text-xs">
                        {groupTasks.length}
                    </Badge>
                </button>

                {!isCollapsed && (
                    <div className="space-y-2">
                        {groupTasks.map(task => (
                            <div
                                key={task.id}
                                className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${task.completed ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-card hover:border-primary/50 hover:shadow-sm"}`}
                                onClick={() => onTaskClick(task.id)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={task.completed}
                                            onCheckedChange={(c) => toggleComplete({ id: task.id, completed: c as boolean })}
                                            className={`mt-0.5 rounded-sm ${task.completed ? "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white" : ""}`}
                                        />
                                    </div>

                                    <div className="flex flex-col truncate">
                                        <span className={`text-sm font-medium truncate ${task.completed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                            {task.title}
                                        </span>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            {task.assignee && (
                                                <span className="flex items-center gap-1">
                                                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold">
                                                        {task.assignee.charAt(0).toUpperCase()}
                                                    </span>
                                                    {task.assignee}
                                                </span>
                                            )}

                                            {task.category && (
                                                <span className="truncate max-w-[100px] border px-1.5 py-0.5 rounded-sm bg-muted/50">
                                                    {task.category}
                                                </span>
                                            )}

                                            {task.subtasks && task.subtasks.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                    {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {task.priority && !task.completed && (
                                        <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className={`capitalize text-[10px] h-5 px-1.5 font-medium ${task.priority === 'media' ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : task.priority === 'alta' ? 'bg-rose-500 hover:bg-rose-600 border-transparent text-white' : ''}`}>
                                            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}
                                        </Badge>
                                    )}

                                    {task.due_date && !task.completed && (
                                        <span className={`text-xs flex items-center gap-1 ${isOverdue(task.due_date, false) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            {format(new Date(`${task.due_date}T00:00:00`), "dd MMM", { locale: ptBR })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <CheckCircleIcon className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-medium mb-1 text-foreground">Todas as tarefas em dia!</h3>
                <p className="max-w-xs mx-auto">Não há tarefas correspondentes aos filtros atuais. Que tal criar uma nova?</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto pr-2 pb-20">
            {renderSection("Atrasadas", "overdue", groupedTasks.overdue, <AlertCircle className="w-4 h-4 shrink-0" />, "text-destructive")}
            {renderSection("Hoje", "today", groupedTasks.today)}
            {renderSection("Próximas", "upcoming", groupedTasks.upcoming)}
            {renderSection("Sem data", "noDate", groupedTasks.noDate)}
            {renderSection("Concluídas", "completed", groupedTasks.completed, null, "text-muted-foreground")}
        </div>
    );
}

// Helper icon
function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
