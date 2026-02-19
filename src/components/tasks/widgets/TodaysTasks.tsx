import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks } from "@/hooks/useTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isToday, isOverdue } from "@/lib/dateUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToggleTaskComplete, useUpdateTask, useCreateTask } from "@/hooks/useTaskMutations";
import { PRIORITY_LABELS } from "@/types/tasks";
import { CalendarIcon, Clock, AlertCircle, CheckCircle2, ChevronRight, FileText, Check, Plus, RepeatIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function TodaysTasks() {
    const { data: currentUser } = useCurrentUser();
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

    const handleTaskClick = (id: string) => {
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
            category: 'geral',
            due_date: todayStr,
            assignee: userName
        });
        setInlineTaskTitle("");
        setIsInlineCreateOpen(false);
    };

    // Calculate metrics
    const totalTasks = rawTasks.length;
    const completedTasksNum = rawTasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasksNum / totalTasks) * 100) : 0;

    const overdueTasks = rawTasks.filter(t => !t.completed && t.due_date && isOverdue(t.due_date, false));
    const todayCompletedTasks = rawTasks.filter(t => t.completed && t.completed_at && isToday(t.completed_at.split('T')[0]));
    const upcomingTasks = rawTasks.filter(t => !t.completed && t.due_date && isToday(t.due_date));
    const futureTasks = rawTasks.filter(t => !t.completed && (!t.due_date || t.due_date > format(new Date(), 'yyyy-MM-dd')));

    const renderTaskItem = (task: any) => (
        <div
            key={task.id}
            className={`group flex flex-col justify-center py-3 px-4 rounded-xl border transition-all cursor-pointer mb-2 ${task.completed ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-border/50 bg-card hover:border-primary/50 hover:shadow-sm"}`}
            onClick={() => handleTaskClick(task.id)}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={task.completed}
                            onCheckedChange={(c) => toggleComplete({ id: task.id, completed: c as boolean })}
                            className={task.completed ? "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white" : "rounded-sm"}
                        />
                    </div>
                    <div>
                        <div className="flex flex-col">
                            <span className={`text-sm font-medium hover:underline truncate inline-block max-w-full ${task.completed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                {task.title}
                            </span>
                        </div>
                        <div className={`flex items-center gap-4 text-[11px] mt-1 ${task.completed ? "text-emerald-600/70 dark:text-emerald-500/70" : "text-muted-foreground"}`}>
                            {task.due_date && (
                                <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />
                                    {format(new Date(`${task.due_date}T00:00:00`), "dd 'de' MMM.", { locale: ptBR })}
                                </span>
                            )}
                            {task.recurrence && task.recurrence !== 'none' && (
                                <span className="flex items-center gap-1 italic">
                                    <RepeatIcon className="w-3 h-3" />
                                    Recorrência
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center shrink-0">
                    {task.priority && !task.completed && (
                        <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className={`font-normal text-[10px] px-2 h-[20px] ${task.priority === 'media' ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : task.priority === 'alta' ? 'bg-rose-500 hover:bg-rose-600 border-transparent text-white' : ''}`}>
                            {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );

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
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 rounded-md px-2"
                                        onClick={handleAdiarTodasAtrasadas}
                                    >
                                        Adiar todas para hoje
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
