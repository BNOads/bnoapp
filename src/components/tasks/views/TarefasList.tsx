import React, { useMemo, useState, useEffect } from "react";
import { Task, PRIORITY_LABELS, TaskPriority, RecurrenceType, RECURRENCE_LABELS } from "@/types/tasks";
import { isOverdue, isToday } from "@/lib/dateUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CalendarIcon, AlertCircle, User, RepeatIcon, Clock } from "lucide-react";
import { useToggleTaskComplete, useUpdateTask } from "@/hooks/useTaskMutations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface TarefasListProps {
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
}

export function TarefasList({ tasks, onTaskClick }: TarefasListProps) {
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const { mutate: updateTask } = useUpdateTask();

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
        completed: true,
    });

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string, avatar_url?: string }[]>([]);

    useEffect(() => {
        supabase.from("colaboradores").select("nome, user_id, avatar_url").order("nome").then(({ data }) => {
            if (data) setColaboradores(data);
        });
    }, []);

    const toggleSection = (section: string) => {
        setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleTaskClick = (id: string, e?: React.MouseEvent) => {
        // Prevent opening dialog if an interactive element was clicked
        if (e) {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('[role="combobox"]') || target.closest('[role="dialog"]')) {
                return;
            }
        }
        onTaskClick(id);
    };

    const handleUpdateField = (taskId: string, field: string, value: any) => {
        updateTask({ id: taskId, updates: { [field]: value } });
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
        if (groupTasks.length === 0 && key !== 'today') return null;
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
                                className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${task.completed ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" : task.priority === "alta" ? "border-red-500 bg-red-50/10 dark:bg-red-950/20 hover:border-red-500/80 hover:shadow-sm" : "bg-card hover:border-primary/50 hover:shadow-sm"}`}
                                onClick={(e) => handleTaskClick(task.id, e)}
                            >
                                <div className="flex items-start gap-3 overflow-hidden flex-1">
                                    <div onClick={(e) => e.stopPropagation()} className="mt-0.5">
                                        <Checkbox
                                            checked={task.completed}
                                            onCheckedChange={(c) => toggleComplete({ id: task.id, completed: c as boolean })}
                                            className={`rounded-sm ${task.completed ? "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white" : ""}`}
                                        />
                                    </div>

                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className={`text-sm font-medium truncate mb-1 ${task.completed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                            {task.title}
                                        </span>

                                        {!task.completed && (
                                            <div className="flex flex-wrap items-center gap-2.5 mt-2 ml-2" onClick={e => e.stopPropagation()}>
                                                {/* Assignee interactable */}
                                                <Select
                                                    value={task.assignee || "unassigned"}
                                                    onValueChange={(val) => {
                                                        const newAssignee = val === "unassigned" ? null : val;
                                                        const colab = colaboradores.find(c => c.nome === val);
                                                        handleUpdateField(task.id, "assignee", newAssignee);
                                                        if (colab) handleUpdateField(task.id, "assigned_to_id", colab.user_id);
                                                        else handleUpdateField(task.id, "assigned_to_id", null);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-6 px-2 text-xs border-none bg-muted/50 hover:bg-muted shadow-none w-fit gap-1.5 text-muted-foreground p-0 focus:ring-0 rounded-sm">
                                                        {task.assignee ? (
                                                            <div className="flex items-center gap-1.5 text-foreground">
                                                                <Avatar className="h-4 w-4">
                                                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${task.assignee}`} />
                                                                    <AvatarFallback className="text-[8px]">{task.assignee.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="truncate max-w-[80px] font-medium">{task.assignee}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <User className="w-3 h-3" />
                                                                <span>Sem resp.</span>
                                                            </div>
                                                        )}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unassigned" className="text-xs">Sem responsável</SelectItem>
                                                        {colaboradores.map(c => (
                                                            <SelectItem key={c.user_id || c.nome} value={c.nome} className="text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-5 w-5">
                                                                        <AvatarImage src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.nome}`} />
                                                                        <AvatarFallback className="text-[9px]">{c.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                                    </Avatar>
                                                                    {c.nome}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {/* Due date interactable */}
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs bg-muted/50 hover:bg-muted text-foreground font-normal gap-1.5 p-0 rounded-sm">
                                                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                                            {task.due_date ? format(new Date(`${task.due_date}T00:00:00`), "dd MMM", { locale: ptBR }) : <span className="text-muted-foreground">Sem data</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-2" align="start">
                                                        <input
                                                            type="date"
                                                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                                            value={task.due_date || ""}
                                                            onChange={(e) => handleUpdateField(task.id, "due_date", e.target.value || null)}
                                                        />
                                                    </PopoverContent>
                                                </Popover>

                                                {/* Recurrence interactable */}
                                                <Select
                                                    value={task.recurrence || "none"}
                                                    onValueChange={(val) => handleUpdateField(task.id, "recurrence", val === "none" ? null : val)}
                                                >
                                                    <SelectTrigger className="h-6 px-2 text-xs border-none bg-muted/50 hover:bg-muted shadow-none w-fit gap-1.5 text-foreground p-0 focus:ring-0 rounded-sm">
                                                        <RepeatIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {task.recurrence && task.recurrence !== 'none' ? RECURRENCE_LABELS[task.recurrence as RecurrenceType] : <span className="text-muted-foreground">Sem rec.</span>}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(RECURRENCE_LABELS).map(([val, label]) => (
                                                            <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {task.category && (
                                                    <span className="truncate max-w-[100px] border px-1.5 py-0.5 rounded-sm bg-muted/50 text-xs text-muted-foreground ml-2">
                                                        {task.category}
                                                    </span>
                                                )}

                                                {task.subtasks && task.subtasks.length > 0 && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                                                        <CheckCircleIcon className="w-3 h-3" />
                                                        {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                    {(task.time_tracked || 0) > 0 && !task.completed && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-transparent">
                                            <Clock className="w-3 h-3" />
                                            <span className="font-mono">{Math.floor((task.time_tracked || 0) / 3600)}:{Math.floor(((task.time_tracked || 0) % 3600) / 60).toString().padStart(2, '0')}:{(task.time_tracked || 0) % 60 < 10 ? '0' : ''}{(task.time_tracked || 0) % 60}</span>
                                        </div>
                                    )}
                                    {!task.completed && (
                                        <Select
                                            value={task.priority || "none"}
                                            onValueChange={(val) => handleUpdateField(task.id, "priority", val === "none" ? null : val as TaskPriority)}
                                        >
                                            <SelectTrigger className="h-auto py-0 px-0 border-none bg-transparent shadow-none hover:bg-transparent focus:ring-0">
                                                {task.priority ? (
                                                    <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className={`font-normal capitalize text-[10px] h-5 px-1.5 ${task.priority === 'media' ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : task.priority === 'alta' ? 'bg-rose-500 hover:bg-rose-600 border-transparent text-white' : ''}`}>
                                                        {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="font-normal text-[10px] h-5 px-1.5 text-muted-foreground border-dashed">
                                                        Prioridade
                                                    </Badge>
                                                )}
                                            </SelectTrigger>
                                            <SelectContent align="end">
                                                <SelectItem value="none" className="text-xs">Sem prioridade</SelectItem>
                                                <SelectItem value="baixa" className="text-xs">{PRIORITY_LABELS.baixa}</SelectItem>
                                                <SelectItem value="media" className="text-xs">{PRIORITY_LABELS.media}</SelectItem>
                                                <SelectItem value="alta" className="text-xs text-red-500 font-medium">{PRIORITY_LABELS.alta}</SelectItem>
                                            </SelectContent>
                                        </Select>
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
