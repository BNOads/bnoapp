import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBulkUpdateTasks, useBulkDeleteTasks } from "@/hooks/useTaskMutations";
import { supabase } from "@/integrations/supabase/client";
import { TaskPriority, TaskUpdate, PRIORITY_LABELS } from "@/types/tasks";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Trash2, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BulkEditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedTaskIds: string[];
    onClearSelection: () => void;
    initialAction?: string | null;
}

export function BulkEditModal({ open, onOpenChange, selectedTaskIds, onClearSelection, initialAction }: BulkEditModalProps) {
    const [assignee, setAssignee] = useState<string>("no-change");
    const [priority, setPriority] = useState<string>("no-change");
    const [status, setStatus] = useState<string>("no-change");
    const [dueDate, setDueDate] = useState<string>("");
    const [taskListId, setTaskListId] = useState<string>("no-change");
    const [isDeleting, setIsDeleting] = useState(false);

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string }[]>([]);
    const [taskLists, setTaskLists] = useState<{ id: string, name: string }[]>([]);

    const statusRef = useRef<HTMLButtonElement>(null);
    const assigneeRef = useRef<HTMLButtonElement>(null);
    const dateRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLButtonElement>(null);

    const { mutate: bulkUpdateTasks, isPending: isUpdating } = useBulkUpdateTasks();
    const { mutate: bulkDeleteTasks, isPending: isDeletingTasks } = useBulkDeleteTasks();
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            supabase.from("colaboradores").select("nome, user_id").order("nome").then(({ data }) => {
                if (data) setColaboradores(data);
            });
            supabase.from("task_lists").select("id, name").order("name").then(({ data }) => {
                if (data) setTaskLists(data);
            });
            // Reset values
            setAssignee("no-change");
            setPriority("no-change");
            setStatus("no-change");
            setDueDate("");
            setTaskListId("no-change");
            setIsDeleting(initialAction === 'delete');

            // Auto-focus logic
            setTimeout(() => {
                if (initialAction === 'status') statusRef.current?.focus();
                else if (initialAction === 'assignee') assigneeRef.current?.focus();
                else if (initialAction === 'date') dateRef.current?.focus();
                else if (initialAction === 'list') listRef.current?.focus();
            }, 100);
        }
    }, [open, initialAction]);

    const handleSave = () => {
        if (selectedTaskIds.length === 0) return;

        if (isDeleting) {
            if (confirm(`Tem certeza que deseja excluir as ${selectedTaskIds.length} tarefas selecionadas?`)) {
                bulkDeleteTasks(selectedTaskIds, {
                    onSuccess: () => {
                        onClearSelection();
                        onOpenChange(false);
                    }
                });
            }
            return;
        }

        const updates: TaskUpdate = {};
        if (priority !== "no-change") {
            updates.priority = priority as TaskPriority;
        }
        if (status !== "no-change") {
            updates.completed = status === "completed";
            updates.completed_at = status === "completed" ? new Date().toISOString() : null;
            if (status === "completed") updates.doing_since = null;
        }
        if (dueDate) {
            updates.due_date = dueDate;
        }
        if (taskListId !== "no-change") {
            updates.task_list_id = taskListId;
        }

        // Assignee needs special handling in useBulkUpdateTasks to fetch ID or just pass assignee name
        let newAssignee = undefined;
        if (assignee !== "no-change") {
            if (assignee === "unassigned") {
                updates.assignee = null;
                updates.assigned_to_id = null;
            } else {
                newAssignee = assignee;
            }
        }

        if (Object.keys(updates).length === 0 && !newAssignee) {
            toast({ title: "Nenhuma alteração", description: "Modifique pelo menos um campo para salvar." });
            return;
        }

        bulkUpdateTasks(
            { taskIds: selectedTaskIds, updates, newAssignee },
            {
                onSuccess: () => {
                    onClearSelection();
                    onOpenChange(false);
                }
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Edição em Lote ({selectedTaskIds.length} tarefas)</DialogTitle>
                    <DialogDescription>
                        Altere os campos que deseja aplicar a todas as tarefas selecionadas. Deixe como "Sem alteração" o que deseja manter.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Responsável</label>
                        <Select value={assignee} onValueChange={setAssignee}>
                            <SelectTrigger ref={assigneeRef}>
                                <SelectValue placeholder="Sem alteração" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-change">Sem alteração</SelectItem>
                                <SelectItem value="unassigned">Limpar responsável</SelectItem>
                                {colaboradores.map(c => (
                                    <SelectItem key={c.user_id || c.nome} value={c.nome}>{c.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Prioridade</label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sem alteração" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-change">Sem alteração</SelectItem>
                                <SelectItem value="baixa">{PRIORITY_LABELS.baixa}</SelectItem>
                                <SelectItem value="media">{PRIORITY_LABELS.media}</SelectItem>
                                <SelectItem value="alta">{PRIORITY_LABELS.alta}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Status de Conclusão</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger ref={statusRef}>
                                <SelectValue placeholder="Sem alteração" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-change">Sem alteração</SelectItem>
                                <SelectItem value="completed">Concluída</SelectItem>
                                <SelectItem value="open">Em aberto</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex justify-between">
                            Data de Conclusão
                            {dueDate && (
                                <button
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setDueDate("")}
                                >
                                    Limpar
                                </button>
                            )}
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button ref={dateRef as any} variant="outline" className={`w-full justify-start text-left font-normal ${!dueDate && 'text-muted-foreground'}`}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(new Date(`${dueDate}T00:00:00`), "dd MMM, yyyy", { locale: ptBR }) : <span>Selecione uma data para alterar</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dueDate ? new Date(`${dueDate}T12:00:00`) : undefined}
                                    onSelect={(date) => setDueDate(date ? format(date, "yyyy-MM-dd") : "")}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {!dueDate && <p className="text-xs text-muted-foreground mt-1">Deixe vazio para não alterar</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Mover para Lista</label>
                        <Select value={taskListId} onValueChange={setTaskListId}>
                            <SelectTrigger ref={listRef}>
                                <SelectValue placeholder="Sem alteração" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-change">Sem alteração</SelectItem>
                                {taskLists.map(list => (
                                    <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-4 border-t mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-destructive">
                            <Trash2 className="w-4 h-4" />
                            <label htmlFor="delete-mode" className="text-sm font-medium cursor-pointer">
                                Excluir tarefas
                            </label>
                        </div>
                        <Button
                            variant={isDeleting ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => setIsDeleting(!isDeleting)}
                            className={isDeleting ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                        >
                            {isDeleting ? "Cancel Exclusão" : "Ativar Exclusão"}
                        </Button>
                    </div>
                    {isDeleting && (
                        <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>Ao salvar, você irá excluir permanentemente todas as {selectedTaskIds.length} tarefas selecionadas e suas subtarefas.</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating || isDeletingTasks}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isUpdating || isDeletingTasks || selectedTaskIds.length === 0}
                        variant={isDeleting ? "destructive" : "default"}
                    >
                        {isUpdating || isDeletingTasks ? "Processando..." : isDeleting ? `Excluir ${selectedTaskIds.length} Tarefa(s)` : "Salvar Alterações"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
