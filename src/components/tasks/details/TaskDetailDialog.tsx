import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTask } from "@/hooks/useTasks";
import { useUpdateTask, useToggleTaskComplete } from "@/hooks/useTaskMutations";
import { SubtaskList } from "./SubtaskList";
import { CommentSection } from "./CommentSection";
import { HistoryTimeline } from "./HistoryTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, CalendarIcon, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Task } from "@/types/tasks";

interface TaskDetailDialogProps {
    taskId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ taskId, open, onOpenChange }: TaskDetailDialogProps) {
    const { data: task, isLoading, error } = useTask(taskId || "");
    const { mutate: toggleComplete } = useToggleTaskComplete();

    const handleToggleComplete = () => {
        if (task) {
            toggleComplete({ id: task.id, completed: !task.completed });
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                {isLoading && (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-32 w-full mt-8" />
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Erro ao carregar a tarefa</h2>
                        <p className="text-muted-foreground">{error.message}</p>
                    </div>
                )}

                {task && !isLoading && !error && (
                    <>
                        <div className="p-6 pb-2 border-b flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                                <DialogHeader className="flex-1">
                                    <DialogTitle className={`text-2xl font-semibold flex items-center gap-3 ${task.completed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                        {task.title}
                                        {task.completed && <Badge variant="secondary">Concluída</Badge>}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm flex items-center gap-4 mt-2">
                                        {task.assignee && (
                                            <span className="flex items-center gap-1">
                                                <span className="text-foreground font-medium">Resp:</span> {task.assignee}
                                            </span>
                                        )}
                                        {task.due_date && (
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                {format(new Date(`${task.due_date}T00:00:00`), "dd MMM", { locale: ptBR })}
                                                {task.due_time && ` às ${task.due_time.substring(0, 5)}`}
                                            </span>
                                        )}
                                        {task.priority && (
                                            <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className="capitalize">
                                                {task.priority}
                                            </Badge>
                                        )}
                                    </DialogDescription>
                                </DialogHeader>

                                <Button
                                    onClick={handleToggleComplete}
                                    variant={task.completed ? "outline" : "default"}
                                    className="flex items-center gap-2shrink-0"
                                >
                                    <Check className="w-4 h-4" />
                                    {task.completed ? "Reabrir" : "Concluir"}
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col">
                            <Tabs defaultValue="details" className="w-full flex-1 flex flex-col h-full">
                                <div className="px-6 border-b">
                                    <TabsList className="bg-transparent border-b-0 h-10 w-full justify-start gap-4">
                                        <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-2">
                                            Detalhes
                                        </TabsTrigger>
                                        <TabsTrigger value="subtasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-2">
                                            Subtarefas ({task.subtasks?.length || 0})
                                        </TabsTrigger>
                                        <TabsTrigger value="comments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-2">
                                            Comentários ({task.task_comments?.length || 0})
                                        </TabsTrigger>
                                        <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-2">
                                            Histórico
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
                                    <TabsContent value="details" className="m-0 space-y-6">
                                        {task.description ? (
                                            <div>
                                                <h3 className="text-sm font-medium mb-2 opacity-70">Descrição</h3>
                                                <div className="whitespace-pre-wrap text-sm border p-4 rounded-md bg-background">
                                                    {task.description}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">Sem descrição.</p>
                                        )}

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            {task.category && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">Categoria</span>
                                                    <p className="text-sm font-medium">{task.category}</p>
                                                </div>
                                            )}

                                            {task.recurrence && task.recurrence !== 'none' && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">Recorrência</span>
                                                    <p className="text-sm font-medium capitalize">{task.recurrence}</p>
                                                </div>
                                            )}

                                        </div>
                                    </TabsContent>

                                    <TabsContent value="subtasks" className="m-0 h-full">
                                        <SubtaskList
                                            taskId={task.id}
                                            subtasks={task.subtasksTree || []}
                                        />
                                    </TabsContent>

                                    <TabsContent value="comments" className="m-0 h-full">
                                        <CommentSection
                                            taskId={task.id}
                                            comments={task.task_comments || []}
                                        />
                                    </TabsContent>

                                    <TabsContent value="history" className="m-0 h-full">
                                        <HistoryTimeline
                                            history={task.task_history || []}
                                        />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
