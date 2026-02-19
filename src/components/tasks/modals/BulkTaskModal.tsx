import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBulkTasks } from "@/hooks/useTaskMutations";
import { supabase } from "@/integrations/supabase/client";
import { TaskPriority, RecurrenceType, RECURRENCE_LABELS, PRIORITY_LABELS } from "@/types/tasks";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BulkTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultAssignee?: string;
}

export function BulkTaskModal({ open, onOpenChange, defaultAssignee }: BulkTaskModalProps) {
    const [tasksText, setTasksText] = useState("");
    const [assignee, setAssignee] = useState<string>(defaultAssignee || "unassigned");
    const [priority, setPriority] = useState<TaskPriority>("media");
    const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
    const [category, setCategory] = useState<string>("none");
    const [dueDate, setDueDate] = useState<string>("");

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string }[]>([]);

    const { mutate: createBulkTasks, isPending } = useCreateBulkTasks();
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            supabase.from("colaboradores").select("nome, user_id").order("nome").then(({ data }) => {
                if (data) setColaboradores(data);
            });
            // Reset values when opened
            setTasksText("");
            setAssignee(defaultAssignee || "unassigned");
            setPriority("media");
            setRecurrence("none");
            setCategory("none");
            setDueDate("");
        }
    }, [open, defaultAssignee]);

    const handleSave = () => {
        const titles = tasksText.split("\n").map(t => t.trim()).filter(t => t.length > 0);

        if (titles.length === 0) {
            toast({ title: "Nenhuma tarefa informada", variant: "destructive" });
            return;
        }

        const tasksToCreate = titles.map(title => ({
            title,
            assignee: assignee !== "unassigned" ? assignee : null,
            priority,
            category: category !== "none" ? category : null,
            recurrence: recurrence !== "none" ? recurrence : null,
            due_date: dueDate || null,
        }));

        createBulkTasks(
            { tasks: tasksToCreate },
            {
                onSuccess: () => {
                    onOpenChange(false);
                }
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Criação de Tarefas em Lote</DialogTitle>
                    <DialogDescription>
                        Cole uma lista de tarefas, uma por linha. As configurações abaixo serão aplicadas a todas elas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Textarea
                        value={tasksText}
                        onChange={(e) => setTasksText(e.target.value)}
                        placeholder="Ex:\nRevisar contrato\nEnviar email para cliente\nAtualizar planilha"
                        className="min-h-[150px] resize-y"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Responsável</label>
                            <Select value={assignee} onValueChange={setAssignee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Sem responsável</SelectItem>
                                    {colaboradores.map(c => (
                                        <SelectItem key={c.user_id || c.nome} value={c.nome}>{c.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Prioridade</label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="baixa">{PRIORITY_LABELS.baixa}</SelectItem>
                                    <SelectItem value="media">{PRIORITY_LABELS.media}</SelectItem>
                                    <SelectItem value="alta">{PRIORITY_LABELS.alta}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Categoria</label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sem categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem categoria</SelectItem>
                                    <SelectItem value="Lancamento">Lançamento</SelectItem>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="Vendas">Vendas</SelectItem>
                                    <SelectItem value="Suporte">Suporte</SelectItem>
                                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Data de Conclusão (Opcional)</label>
                            <input
                                type="date"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">Recorrência</label>
                            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(RECURRENCE_LABELS).map(([val, label]) => (
                                        <SelectItem key={val} value={val}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isPending || tasksText.trim().length === 0}>
                        Criar Tarefas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
