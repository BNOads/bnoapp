import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBulkTasks } from "@/hooks/useTaskMutations";
import { useTaskLists } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { TaskPriority, RecurrenceType, PRIORITY_LABELS } from "@/types/tasks";
import { useToast } from "@/hooks/use-toast";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertCircle, CalendarIcon, Check, X, Users } from "lucide-react";
import { RecurrenceSelect } from "../details/RecurrenceSelect";
import { getRecurrenceLabel } from "@/types/tasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Given a date string and a recurrence value, adjust to the next valid day.
 */
function adjustToNextValidDay(dateStr: string, recurrence: string): { adjusted: string; wasAdjusted: boolean } {
    const date = parseISO(dateStr);
    const dayOfWeek = date.getDay();

    let targetDays: number[] | null = null;

    if (recurrence.startsWith("custom_week_")) {
        const parts = recurrence.split("_");
        if (parts.length >= 4 && parts[3]) {
            targetDays = parts[3].split(",").map(Number);
        }
    } else if (recurrence.startsWith("custom_weekly_")) {
        targetDays = recurrence.replace("custom_weekly_", "").split(",").map(Number);
    }

    if (targetDays && targetDays.length > 0) {
        if (targetDays.includes(dayOfWeek)) {
            return { adjusted: dateStr, wasAdjusted: false };
        }
        for (let i = 1; i <= 7; i++) {
            const candidate = addDays(date, i);
            if (targetDays.includes(candidate.getDay())) {
                return { adjusted: format(candidate, "yyyy-MM-dd"), wasAdjusted: true };
            }
        }
    }

    return { adjusted: dateStr, wasAdjusted: false };
}

interface Colaborador {
    nome: string;
    user_id: string;
    avatar_url?: string;
}

interface BulkTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultAssignee?: string;
}

export function BulkTaskModal({ open, onOpenChange, defaultAssignee }: BulkTaskModalProps) {
    const [tasksText, setTasksText] = useState("");
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [priority, setPriority] = useState<TaskPriority>("media");
    const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
    const [listId, setListId] = useState<string>("none");
    const [dueDate, setDueDate] = useState<string>("");
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

    const { mutate: createBulkTasks, isPending } = useCreateBulkTasks();
    const { data: taskLists } = useTaskLists();
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            supabase.from("colaboradores").select("nome, user_id, avatar_url").order("nome").then(({ data }) => {
                if (data) setColaboradores(data);
            });
            setTasksText("");
            setSelectedAssignees(defaultAssignee && defaultAssignee !== "unassigned" ? [defaultAssignee] : []);
            setPriority("media");
            setRecurrence("none");
            setListId("none");
            setDueDate("");
        }
    }, [open, defaultAssignee]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setAssigneeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggleAssignee = (nome: string) => {
        setSelectedAssignees(prev =>
            prev.includes(nome) ? prev.filter(a => a !== nome) : [...prev, nome]
        );
    };

    const removeAssignee = (nome: string) => {
        setSelectedAssignees(prev => prev.filter(a => a !== nome));
    };

    const getColaborador = (nome: string) => colaboradores.find(c => c.nome === nome);

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

        // If no assignees selected, create tasks without assignee
        const assigneeList = selectedAssignees.length > 0 ? selectedAssignees : [null];

        // Create one task per title × per assignee
        const tasksToCreate = assigneeList.flatMap(assignee =>
            titles.map(title => ({
                title,
                assignee: assignee || null,
                priority,
                list_id: listId !== "none" ? listId : null,
                recurrence: recurrence !== "none" ? recurrence : null,
                due_date: dueDate || null,
            }))
        );

        const totalCount = tasksToCreate.length;

        createBulkTasks(
            { tasks: tasksToCreate },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    toast({
                        title: `✅ ${totalCount} tarefa${totalCount > 1 ? "s criadas" : " criada"} com sucesso`,
                        description: selectedAssignees.length > 1
                            ? `${titles.length} tarefas × ${selectedAssignees.length} responsáveis`
                            : undefined,
                    });
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

    const taskCount = tasksText.split("\n").filter(t => t.trim().length > 0).length;
    const totalTasks = taskCount * Math.max(selectedAssignees.length, 1);

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
                        placeholder={"Ex:\nRevisar contrato\nEnviar email para cliente\nAtualizar planilha"}
                        className="min-h-[150px] resize-y"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        {/* Multi-select Assignee */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Responsável</label>
                            <div className="relative" ref={dropdownRef}>
                                {/* Trigger */}
                                <button
                                    type="button"
                                    onClick={() => setAssigneeDropdownOpen(prev => !prev)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left bg-background hover:bg-muted/40 transition-colors min-h-[38px]",
                                        assigneeDropdownOpen && "ring-2 ring-ring border-transparent"
                                    )}
                                >
                                    {selectedAssignees.length === 0 ? (
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <Users className="w-4 h-4" />
                                            Sem responsável
                                        </span>
                                    ) : (
                                        <div className="flex flex-wrap gap-1 flex-1">
                                            {selectedAssignees.map(nome => {
                                                const col = getColaborador(nome);
                                                return (
                                                    <span key={nome} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 rounded-full pl-0.5 pr-2 py-0.5 text-xs font-medium">
                                                        <Avatar className="w-4 h-4">
                                                            <AvatarImage src={col?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${nome}`} />
                                                            <AvatarFallback className="text-[8px]">{nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        {nome.split(" ")[0]}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); removeAssignee(nome); }}
                                                            className="ml-0.5 text-indigo-400 hover:text-indigo-700"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </button>

                                {/* Dropdown */}
                                {assigneeDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[220px] overflow-y-auto">
                                        {/* None option */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedAssignees([])}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                                        >
                                            <div className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center">
                                                {selectedAssignees.length === 0 && <Check className="w-2.5 h-2.5 text-indigo-600" />}
                                            </div>
                                            <span className="text-muted-foreground">Sem responsável</span>
                                        </button>
                                        <div className="border-t border-border" />
                                        {colaboradores.map(c => {
                                            const isSelected = selectedAssignees.includes(c.nome);
                                            return (
                                                <button
                                                    key={c.user_id || c.nome}
                                                    type="button"
                                                    onClick={() => toggleAssignee(c.nome)}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left transition-colors",
                                                        isSelected && "bg-indigo-50"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                                                        isSelected ? "bg-indigo-600 border-indigo-600" : "border-muted-foreground/30"
                                                    )}>
                                                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    <Avatar className="w-6 h-6">
                                                        <AvatarImage src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.nome}`} />
                                                        <AvatarFallback className="text-[9px]">{c.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <span className={cn(isSelected && "font-medium text-indigo-700")}>{c.nome}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            {/* Summary hint */}
                            {selectedAssignees.length > 1 && taskCount > 0 && (
                                <p className="text-[11px] text-indigo-600 font-medium">
                                    → {taskCount} tarefa{taskCount > 1 ? "s" : ""} × {selectedAssignees.length} pessoas = {totalTasks} tarefas criadas
                                </p>
                            )}
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

                <DialogFooter className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isPending || tasksText.trim().length === 0 || (recurrence !== "none" && !dueDate)}
                    >
                        {totalTasks > 0 ? `Criar ${totalTasks} Tarefa${totalTasks > 1 ? "s" : ""}` : "Criar Tarefas"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
