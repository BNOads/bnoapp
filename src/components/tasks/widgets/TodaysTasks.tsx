import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserTasks } from "@/hooks/useTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isToday, isOverdue } from "@/lib/dateUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToggleTaskComplete } from "@/hooks/useTaskMutations";
import { CalendarIcon, ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TodaysTasks() {
    const { data: currentUser } = useCurrentUser();
    const userName = currentUser?.nome || currentUser?.email || "";
    const { data: tasks = [], isLoading } = useUserTasks(userName);
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const navigate = useNavigate();

    const handleTaskClick = (id: string) => {
        navigate(`/tarefas/${id}`);
    };

    const actionableTasks = tasks.filter(t => !t.completed && (isToday(t.due_date) || isOverdue(t.due_date, false) || !t.due_date));
    const overdueTasks = actionableTasks.filter(t => isOverdue(t.due_date, false));
    const todayTasks = actionableTasks.filter(t => isToday(t.due_date));

    const displayTasks = [...overdueTasks, ...todayTasks].slice(0, 5); // Show up to 5 tasks

    return (
        <Card className="col-span-1 h-full flex flex-col">
            <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        Minhas Tarefas de Hoje
                    </CardTitle>
                    <Badge variant="secondary">{actionableTasks.length} pendentes</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col h-[250px] overflow-hidden">
                {isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Carregando tarefas...</div>
                ) : displayTasks.length > 0 ? (
                    <div className="divide-y overflow-y-auto w-full">
                        {displayTasks.map(task => (
                            <div
                                key={task.id}
                                className="p-3 hover:bg-muted/50 transition-colors flex items-start gap-3 cursor-pointer group"
                                onClick={() => handleTaskClick(task.id)}
                            >
                                <div onClick={e => e.stopPropagation()} className="mt-0.5 shrink-0">
                                    <Checkbox
                                        checked={task.completed}
                                        onCheckedChange={(c) => toggleComplete({ id: task.id, completed: c as boolean })}
                                    />
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-sm font-medium leading-tight truncate">{task.title}</p>
                                    <p className="text-[11px] text-muted-foreground truncate mt-1">
                                        {task.category || "Sem categoria"}
                                    </p>
                                </div>
                                {isOverdue(task.due_date, false) && (
                                    <Badge variant="destructive" className="shrink-0 text-[10px] h-4 px-1">Atrasada</Badge>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                        <CheckCircle2 className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm font-medium">Tudo em dia!</p>
                        <p className="text-xs mt-1">Nenhuma tarefa atrasada ou para hoje.</p>
                    </div>
                )}

                <div className="border-t p-2 mt-auto">
                    <button
                        onClick={() => navigate('/tarefas')}
                        className="w-full py-1.5 text-sm font-medium text-primary hover:text-primary/80 flex items-center justify-center gap-1"
                    >
                        Ver todas as minhas tarefas
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
