import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBulkUpdateTasks, useBulkDeleteTasks } from "@/hooks/useTaskMutations";
import { supabase } from "@/integrations/supabase/client";
import { TaskPriority, TaskUpdate, PRIORITY_LABELS } from "@/types/tasks";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Trash2 } from "lucide-react";

interface BulkEditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedTaskIds: string[];
    onClearSelection: () => void;
}

export function BulkEditModal({ open, onOpenChange, selectedTaskIds, onClearSelection }: BulkEditModalProps) {
    const [assignee, setAssignee] = useState<string>("no-change");
    const [priority, setPriority] = useState<string>("no-change");
    const [status, setStatus] = useState<string>("no-change");
    const [dueDate, setDueDate] = useState<string>("");
    const [isDeleting, setIsDeleting] = useState(false);

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string }[]>([]);

    const { mutate: bulkUpdateTasks, isPending: isUpdating } = useBulkUpdateTasks();
    const { mutate: bulkDeleteTasks, isPending: isDeletingTasks } = useBulkDeleteTasks();
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            supabase.from("colaboradores").select("nome, user_id").order("nome").then(({ data }) => {
                if (data) setColaboradores(data);
            });
            // Reset values
            setAssignee("no-change");
            setPriority("no-change");
            setStatus("no-change");
            setDueDate("");
            setIsDeleting(false);
        }
    }, [open]);

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
                            <SelectTrigger>
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
                            <SelectTrigger>
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
                        <input
                            type="date"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                        {!dueDate && <p className="text-xs text-muted-foreground mt-1">Deixe vazio para não alterar</p>}
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
