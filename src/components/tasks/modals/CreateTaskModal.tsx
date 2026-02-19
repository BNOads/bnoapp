import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/useTaskMutations";
import { supabase } from "@/integrations/supabase/client";
import { TaskPriority, RecurrenceType, RECURRENCE_LABELS } from "@/types/tasks";

interface CreateTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultAssignee?: string;
}

export function CreateTaskModal({ open, onOpenChange, defaultAssignee }: CreateTaskModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignee, setAssignee] = useState<string>(defaultAssignee || "unassigned");
    const [priority, setPriority] = useState<TaskPriority>("media");
    const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
    const [category, setCategory] = useState<string>("none");
    const [dueDate, setDueDate] = useState<string>("");

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string }[]>([]);

    const { mutate: createTask, isPending } = useCreateTask();

    useEffect(() => {
        if (open) {
            supabase.from("colaboradores").select("nome, user_id").order("nome").then(({ data }) => {
                if (data) setColaboradores(data);
            });
            // Reset values when opened
            setTitle("");
            setDescription("");
            setAssignee(defaultAssignee || "unassigned");
            setPriority("media");
            setRecurrence("none");
            setCategory("none");
            setDueDate("");
        }
    }, [open, defaultAssignee]);

    const handleSave = () => {
        if (!title.trim()) return;

        createTask(
            {
                task: {
                    title,
                    description,
                    assignee: assignee !== "unassigned" ? assignee : null,
                    priority,
                    category: category !== "none" ? category : null,
                    recurrence: recurrence !== "none" ? recurrence : null,
                    due_date: dueDate || null,
                }
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                }
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nova Tarefa</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Título *</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Revisar layout da campanha..."
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Descrição</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalhes adicionais da tarefa"
                            className="min-h-[80px]"
                        />
                    </div>

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
                                    <SelectItem value="baixa">Baixa</SelectItem>
                                    <SelectItem value="media">Média</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
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
                            <label className="text-sm font-medium">Data de Conclusão</label>
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
                    <Button onClick={handleSave} disabled={isPending || !title.trim()}>
                        Salvar Tarefa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
