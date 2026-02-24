import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBulkTasks } from "@/hooks/useTaskMutations";
import { useTaskLists } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { TaskPriority, RecurrenceType, RECURRENCE_LABELS, PRIORITY_LABELS } from "@/types/tasks";
import { useToast } from "@/hooks/use-toast";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertCircle, CalendarIcon } from "lucide-react";
import { RecurrenceSelect } from "../details/RecurrenceSelect";
import { getRecurrenceLabel } from "@/types/tasks";

/**
 * Given a date string and a recurrence value, adjust to the next valid day.
 * Returns { adjusted: string | null, wasAdjusted: boolean }
 */
function adjustToNextValidDay(dateStr: string, recurrence: string): { adjusted: string; wasAdjusted: boolean } {
    const date = parseISO(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat

    let targetDays: number[] | null = null;

    if (recurrence.startsWith("custom_week_")) {
        // format: custom_week_N_d1,d2,...
        const parts = recurrence.split("_");
        if (parts.length >= 4 && parts[3]) {
            targetDays = parts[3].split(",").map(Number);
        }
    } else if (recurrence.startsWith("custom_weekly_")) {
        // Legacy format
        targetDays = recurrence.replace("custom_weekly_", "").split(",").map(Number);
    }

    if (targetDays && targetDays.length > 0) {
        if (targetDays.includes(dayOfWeek)) {
            return { adjusted: dateStr, wasAdjusted: false };
        }
        // Find next valid day
        for (let i = 1; i <= 7; i++) {
            const candidate = addDays(date, i);
            if (targetDays.includes(candidate.getDay())) {
                return { adjusted: format(candidate, "yyyy-MM-dd"), wasAdjusted: true };
            }
        }
    }

    return { adjusted: dateStr, wasAdjusted: false };
}

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
    const [listId, setListId] = useState<string>("none");
    const [dueDate, setDueDate] = useState<string>("");

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string }[]>([]);

    const { mutate: createBulkTasks, isPending } = useCreateBulkTasks();
    const { data: taskLists } = useTaskLists();
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
            setListId("none");
            setDueDate("");
        }
    }, [open, defaultAssignee]);

    const handleSave = () => {
        const titles = tasksText.split("\n").map(t => t.trim()).filter(t => t.length > 0);

        if (titles.length === 0) {
            toast({ title: "Nenhuma tarefa informada", variant: "destructive" });
            return;
        }

        if (recurrence !== "none" && !dueDate) {
            toast({
                title: "Defina a data da 1ª ocorrência para criar recorrência",
                variant: "destructive",
            });
            return;
        }

        const tasksToCreate = titles.map(title => ({
            title,
            assignee: assignee !== "unassigned" ? assignee : null,
            priority,
            list_id: listId !== "none" ? listId : null,
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

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) {
            setDueDate("");
            return;
        }
        const raw = format(date, "yyyy-MM-dd");
        if (recurrence && recurrence !== "none") {
            const { adjusted, wasAdjusted } = adjustToNextValidDay(raw, recurrence);
            setDueDate(adjusted);
            if (wasAdjusted) {
                toast({
                    title: "Data ajustada automaticamente",
                    description: `A data foi avançada para ${format(parseISO(adjusted), "dd MMM, yyyy", { locale: ptBR })}, o próximo dia válido da recorrência.`,
                });
            }
        } else {
            setDueDate(raw);
        }
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
                            <label className="text-sm font-medium">Lista</label>
                            <Select value={listId} onValueChange={setListId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sem lista">
                                        {listId !== "none" && taskLists?.find(l => l.id === listId) ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: taskLists.find(l => l.id === listId)?.color }} />
                                                {taskLists.find(l => l.id === listId)?.name}
                                            </div>
                                        ) : "Sem lista"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem lista</SelectItem>
                                    {taskLists?.map(l => (
                                        <SelectItem key={l.id} value={l.id}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                                                {l.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className={`space-y-2 ${recurrence !== "none" ? "col-span-2" : ""}`}>
                            <label className="text-sm font-medium">
                                {recurrence !== "none" ? (
                                    <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Início da Recorrência — 1ª Ocorrência (Obrigatório)
                                    </span>
                                ) : "Data de Conclusão (Opcional)"}
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={`w-full justify-start text-left font-normal ${!dueDate && 'text-muted-foreground'} ${recurrence !== 'none' && !dueDate ? 'border-destructive/50 ring-1 ring-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive' : ''}`}>
                                        <CalendarIcon className={`mr-2 h-4 w-4 ${recurrence !== 'none' && !dueDate ? 'text-destructive' : ''}`} />
                                        {dueDate ? format(new Date(`${dueDate}T12:00:00`), "dd MMM, yyyy", { locale: ptBR }) : <span>Selecione a data da 1ª ocorrência</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dueDate ? new Date(`${dueDate}T12:00:00`) : undefined}
                                        onSelect={handleDateSelect}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {recurrence !== "none" && !dueDate && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Defina a data da 1ª ocorrência para criar recorrência.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium">Recorrência</label>
                            <RecurrenceSelect value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
                                <SelectTrigger>
                                    <span>{recurrence === 'none' ? 'Recorrência' : getRecurrenceLabel(recurrence)}</span>
                                </SelectTrigger>
                            </RecurrenceSelect>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isPending || tasksText.trim().length === 0 || (recurrence !== "none" && !dueDate)}
                    >
                        Criar Tarefas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
