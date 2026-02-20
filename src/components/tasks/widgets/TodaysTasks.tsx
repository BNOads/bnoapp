import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks } from "@/hooks/useTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isToday, isOverdue } from "@/lib/dateUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToggleTaskComplete, useUpdateTask, useCreateTask } from "@/hooks/useTaskMutations";
import { PRIORITY_LABELS, TaskPriority, RecurrenceType, RECURRENCE_LABELS } from "@/types/tasks";
import { CalendarIcon, Clock, AlertCircle, CheckCircle2, ChevronRight, FileText, Check, Plus, RepeatIcon, SkipForward, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";

export function TodaysTasks() {
    const { userData: currentUser } = useCurrentUser();
    const userName = currentUser?.nome || currentUser?.email || "";
    const { data: rawTasks = [], isLoading } = useTasks({
        assignee: userName || "BNO_LOADING_USER",
        status: "all"
    });
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const { mutate: updateTask } = useUpdateTask();
    const { mutate: createTask } = useCreateTask();
    const navigate = useNavigate();

    const [isInlineCreateOpen, setIsInlineCreateOpen] = useState(false);
    const [inlineTaskTitle, setInlineTaskTitle] = useState("");
    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string, avatar_url?: string }[]>([]);

    useEffect(() => {
        supabase.from("colaboradores").select("nome, user_id, avatar_url").order("nome").then(({ data }) => {
            if (data) setColaboradores(data);
        });
    }, []);

    const handleTaskClick = (id: string, e?: React.MouseEvent) => {
        // Only navigate if we didn't click on an interactive element
        if (e) {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('[role="combobox"]') || target.closest('[role="dialog"]')) {
                return;
            }
        }
        navigate(`/tarefas/${id}`);
    };

    const handleAdiarTodasAtrasadas = (e: React.MouseEvent) => {
        e.stopPropagation();
        const todayStr = format(new Date(), "yyyy-MM-dd");
        overdueTasks.forEach(t => {
            updateTask({ id: t.id, updates: { due_date: todayStr } });
        });
    };

    const handleInlineCreate = () => {
        if (!inlineTaskTitle.trim()) return;
        const todayStr = format(new Date(), "yyyy-MM-dd");
        createTask({
            title: inlineTaskTitle.trim(),
            priority: 'media',
            list_id: null,
            due_date: todayStr,
            assignee: userName
        });
        setInlineTaskTitle("");
        setIsInlineCreateOpen(false);
    };

    const handleUpdateField = (taskId: string, field: string, value: any) => {
        updateTask({ id: taskId, updates: { [field]: value } });
    };

    // Calculate metrics
    const totalTasks = rawTasks.length;
    const completedTasksNum = rawTasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasksNum / totalTasks) * 100) : 0;

    const overdueTasks = rawTasks.filter(t => !t.completed && t.due_date && isOverdue(t.due_date, false));
    const todayCompletedTasks = rawTasks.filter(t => t.completed && t.completed_at && isToday(t.completed_at));
    const upcomingTasks = rawTasks.filter(t => !t.completed && t.due_date && isToday(t.due_date));
    const futureTasks = rawTasks.filter(t => !t.completed && (!t.due_date || t.due_date > format(new Date(), 'yyyy-MM-dd')));

    const renderTaskItem = (task: any) => {
        const assigneeColab = task.assignee ? colaboradores.find(c => c.nome === task.assignee) : null;

        return (
            <div
                key={task.id}
                className={`group flex flex-col justify-center py-5 px-6 rounded-xl border transition-all cursor-pointer mb-3 ${task.completed ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" : task.priority === "alta" ? "border-red-500 bg-red-50/10 dark:bg-red-950/20 hover:border-red-500/80 hover:shadow-sm shadow-sm" : "border-border/50 bg-card hover:border-primary/50 hover:shadow-sm"}`}
                onClick={(e) => handleTaskClick(task.id, e)}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-3 min-w-0 flex-1">
                        <div className="flex items-center gap-4 w-full">
                            <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={task.completed}
                                    onCheckedChange={(c) => toggleComplete({ id: task.id, completed: c as boolean })}
                                    className={`w-6 h-6 border-2 transition-all ${task.completed ? "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white" : "rounded-md"}`}
                                />
                            </div>
                            <span className={`text-lg font-semibold hover:underline truncate inline-block max-w-[80%] ${task.completed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                {task.title}
                            </span>
                        </div>

                        {!task.completed && (
                            <div className="flex flex-wrap items-center gap-4 mt-2 ml-10" onClick={e => e.stopPropagation()}>

                                {/* Editable Assignee */}
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
                                    <SelectTrigger className="h-10 px-4 text-base border-none bg-transparent hover:bg-muted shadow-none w-fit gap-2.5 text-muted-foreground p-0 focus:ring-0 cursor-pointer">
                                        {task.assignee ? (
                                            <div className="flex items-center gap-2.5">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={assigneeColab?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${task.assignee}`} />
                                                    <AvatarFallback className="text-xs">{task.assignee.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate max-w-[140px] font-medium text-foreground">{task.assignee}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <User className="w-5 h-5" />
                                                <span>Sem resp.</span>
                                            </div>
                                        )}
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned" className="text-base py-2">Sem responsável</SelectItem>
                                        {colaboradores.map(c => (
                                            <SelectItem key={c.user_id || c.nome} value={c.nome} className="text-base py-2">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.nome}`} />
                                                        <AvatarFallback className="text-xs">{c.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    {c.nome}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Editable Due Date */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-10 px-4 text-base hover:bg-muted font-normal gap-2.5 p-0 bg-transparent text-foreground">
                                            <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                                            {task.due_date ? format(new Date(`${task.due_date}T00:00:00`), "dd MMM", { locale: ptBR }) : <span className="text-muted-foreground">Sem data</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={task.due_date ? new Date(task.due_date + 'T12:00:00') : undefined}
                                            onSelect={(date) => handleUpdateField(task.id, "due_date", date ? format(date, "yyyy-MM-dd") : null)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                {/* Editable Recurrence */}
                                <Select
                                    value={task.recurrence || "none"}
                                    onValueChange={(val) => handleUpdateField(task.id, "recurrence", val === "none" ? null : val)}
                                >
                                    <SelectTrigger className="h-10 px-4 text-base border-none bg-transparent hover:bg-muted shadow-none w-fit gap-2.5 p-0 focus:ring-0 text-foreground cursor-pointer">
                                        <RepeatIcon className="w-5 h-5 text-muted-foreground" />
                                        {task.recurrence && task.recurrence !== 'none' ? RECURRENCE_LABELS[task.recurrence as RecurrenceType] : <span className="text-muted-foreground">Sem rec.</span>}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(RECURRENCE_LABELS).map(([val, label]) => (
                                            <SelectItem key={val} value={val} className="text-base py-2">{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                            </div>
                        )}
                    </div>

                    <div className="flex items-center shrink-0" onClick={e => e.stopPropagation()}>
                        {(task.time_tracked || 0) > 0 && !task.completed && (
                            <div className="flex items-center gap-2 text-base text-muted-foreground bg-muted/50 px-4 py-2 rounded border border-transparent mr-3">
                                <Clock className="w-5 h-5" />
                                <span className="font-mono">{Math.floor((task.time_tracked || 0) / 3600)}:{Math.floor(((task.time_tracked || 0) % 3600) / 60).toString().padStart(2, '0')}:{(task.time_tracked || 0) % 60 < 10 ? '0' : ''}{(task.time_tracked || 0) % 60}</span>
                            </div>
                        )}
                        {/* Editable Priority */}
                        {!task.completed && (
                            <Select
                                value={task.priority || "none"}
                                onValueChange={(val) => handleUpdateField(task.id, "priority", val === "none" ? null : val as TaskPriority)}
                            >
                                <SelectTrigger className="h-auto py-0 px-0 border-none bg-transparent shadow-none hover:bg-transparent focus:ring-0 cursor-pointer">
                                    {task.priority ? (
                                        <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className={`font-normal text-sm px-4 py-2 flex items-center h-10 rounded-md ${task.priority === 'media' ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : task.priority === 'alta' ? 'bg-rose-500 hover:bg-rose-600 border-transparent text-white' : ''}`}>
                                            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="font-normal text-sm px-4 py-2 flex items-center h-10 text-muted-foreground border-dashed rounded-md">
                                            Prioridade
                                        </Badge>
                                    )}
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="none" className="text-base py-2">Sem prioridade</SelectItem>
                                    <SelectItem value="baixa" className="text-base py-2">{PRIORITY_LABELS.baixa}</SelectItem>
                                    <SelectItem value="media" className="text-base py-2">{PRIORITY_LABELS.media}</SelectItem>
                                    <SelectItem value="alta" className="text-base py-2 text-red-500 font-medium">{PRIORITY_LABELS.alta}</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <Card className="w-full h-auto min-h-[500px] max-h-[700px] flex flex-col shadow-sm border p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    </div>
                </div>
                <div className="space-y-4 mt-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="py-4 px-4 rounded-xl border border-border/50 bg-card/50 animate-pulse flex items-center gap-3">
                            <div className="w-4 h-4 rounded bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-1/3" />
                                <div className="h-3 bg-muted rounded w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <Card className="w-full h-auto min-h-[500px] max-h-[700px] flex flex-col shadow-sm border p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Minhas Tarefas</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {completedTasksNum} de {totalTasks} tarefas concluídas
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsInlineCreateOpen(!isInlineCreateOpen)} className="bg-amber-500 hover:bg-amber-600 text-white font-medium border-0 h-9 px-4 gap-1.5 shadow-none rounded-md transition-all">
                        <Plus className="w-4 h-4 text-white" />
                        Nova Tarefa
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/tarefas')} className="h-9 px-4 gap-1.5 rounded-md text-muted-foreground font-medium">
                        <FileText className="w-4 h-4" />
                        Ver Todas
                    </Button>
                </div>
            </div>

            {isInlineCreateOpen && (
                <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2">
                        <Input
                            autoFocus
                            placeholder="O que você precisa fazer hoje?"
                            value={inlineTaskTitle}
                            onChange={(e) => setInlineTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInlineCreate()}
                            className="h-10 text-sm"
                        />
                        <Button onClick={handleInlineCreate} disabled={!inlineTaskTitle.trim()} className="h-10 px-4 shrink-0 shadow-none border-0 font-medium">
                            <Check className="w-4 h-4 mr-1.5" /> Adicionar
                        </Button>
                    </div>
                </div>
            )}

            <div className="mb-6 mt-6">
                <div className="flex items-center justify-between text-sm font-semibold mb-2">
                    <span>Progresso geral</span>
                    <span className="text-amber-500">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2.5 bg-muted rounded-full [&>div]:bg-amber-500" />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-4 -mr-2">
                <Accordion type="multiple" defaultValue={["overdue", "upcoming", "completed"]} className="w-full space-y-4">

                    {overdueTasks.length > 0 && (
                        <AccordionItem value="overdue" className="border-none">
                            <div className="flex items-center justify-between pr-2">
                                <AccordionTrigger className="hover:no-underline py-2 flex-1 justify-start gap-2 text-destructive">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-semibold text-sm">Em atraso ({overdueTasks.length})</span>
                                </AccordionTrigger>
                                {overdueTasks.length > 0 && (
                                    <Button
                                        size="sm"
                                        className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 rounded-md px-3 font-medium transition-all shadow-sm"
                                        onClick={handleAdiarTodasAtrasadas}
                                    >
                                        <SkipForward className="w-3.5 h-3.5" />
                                        Adiar para Hoje
                                    </Button>
                                )}
                            </div>
                            <AccordionContent className="pt-2 pb-0">
                                {overdueTasks.map(renderTaskItem)}
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    <AccordionItem value="upcoming" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2 justify-start gap-2 text-primary">
                            <CalendarIcon className="w-4 h-4" />
                            <span className="font-semibold text-sm text-foreground">Hoje ({upcomingTasks.length})</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-0">
                            {upcomingTasks.length > 0 ? upcomingTasks.map(renderTaskItem) : (
                                <p className="text-xs text-muted-foreground italic px-2">Nenhuma tarefa para hoje.</p>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                    {futureTasks.length > 0 && (
                        <AccordionItem value="future" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2 justify-start gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span className="font-semibold text-sm text-foreground">Próximas e Sem Prazo ({futureTasks.length})</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-0">
                                {futureTasks.map(renderTaskItem)}
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    <AccordionItem value="completed" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2 justify-start gap-2 text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-semibold text-sm">Concluídas hoje ({todayCompletedTasks.length})</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-0">
                            {todayCompletedTasks.length > 0 ? todayCompletedTasks.map(renderTaskItem) : (
                                <p className="text-xs text-muted-foreground italic px-2">Nenhuma tarefa concluída hoje.</p>
                            )}
                        </AccordionContent>
                    </AccordionItem>

                </Accordion>
            </div>
        </Card>
    );
}
