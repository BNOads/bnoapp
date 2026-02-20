import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/useTaskMutations";
import { useTaskLists } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { TaskPriority, RecurrenceType, RECURRENCE_LABELS, PRIORITY_LABELS } from "@/types/tasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CalendarIcon, Flag, RefreshCw, Sparkles, Tag, Users, List } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { isRecurringDate } from "@/lib/dateUtils";
import { RecurrenceSelect } from "../details/RecurrenceSelect";
import { getRecurrenceLabel } from "@/types/tasks";

interface CreateTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultAssignee?: string;
    defaultListId?: string;
    defaultTitle?: string;
    defaultDescription?: string;
}

export function CreateTaskModal({ open, onOpenChange, defaultAssignee, defaultListId, defaultTitle, defaultDescription }: CreateTaskModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignee, setAssignee] = useState<string>(defaultAssignee || "unassigned");
    const [priority, setPriority] = useState<TaskPriority>("media");
    const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
    const [listId, setListId] = useState<string>(defaultListId || "none");
    const [dueDate, setDueDate] = useState<string>("");

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string, avatar_url?: string }[]>([]);
    const { userData: currentUser } = useCurrentUser();
    const { mutate: createTask, isPending } = useCreateTask();
    const { data: taskLists } = useTaskLists();

    const getAssignedTo = () => {
        if (defaultAssignee) return defaultAssignee;
        return currentUser ? (currentUser.nome || currentUser.email || "unassigned") : "unassigned";
    };

    useEffect(() => {
        if (!defaultAssignee && currentUser) {
            setAssignee(getAssignedTo());
        }
    }, [currentUser, defaultAssignee]);

    useEffect(() => {
        if (open) {
            supabase.from("colaboradores").select("nome, user_id, avatar_url").order("nome").then(({ data }) => {
                if (data) setColaboradores(data);
            });
            // Reset values when opened
            setTitle(defaultTitle || "");
            setDescription(defaultDescription || "");
            setAssignee(getAssignedTo());
            setPriority("media");
            setRecurrence("none");
            setListId(defaultListId || "none");
            setDueDate("");
        }
    }, [open, defaultAssignee, defaultListId, defaultTitle, defaultDescription]);

    const handleSave = () => {
        if (!title.trim()) return;

        createTask(
            {
                title,
                description,
                assignee: assignee !== "unassigned" ? assignee : null,
                priority,
                list_id: listId !== "none" ? listId : null,
                recurrence: recurrence !== "none" ? recurrence : null,
                due_date: dueDate || null,
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
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background border rounded-xl shadow-lg">
                <div className="flex flex-col h-full w-full">
                    {/* Header Controls (Optional top bar) */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
                        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                            <span className="text-primary cursor-pointer border-b-2 border-primary pb-[10px] -mb-[13px]">Tarefa</span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Title & Description */}
                        <div className="space-y-4">
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Nome da Tarefa"
                                className="text-3xl py-1 font-semibold border-0 px-0 h-auto focus-visible:ring-0 shadow-none placeholder:text-muted-foreground"
                                autoFocus
                            />

                            <div className="relative group">
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Adicionar descrição"
                                    className="min-h-[80px] resize-none border-0 bg-muted/30 focus-visible:ring-0 shadow-none px-4 py-3 text-sm placeholder:text-muted-foreground/70"
                                />
                            </div>
                        </div>

                        {/* Pills Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-4">

                            {/* Lista Pill */}
                            <Select value={listId} onValueChange={setListId}>
                                <SelectTrigger className="w-auto h-8 px-3 rounded-full bg-muted/40 border text-xs font-medium hover:bg-muted/60 transition-colors shadow-none">
                                    <div className="flex items-center gap-2">
                                        {listId !== "none" && taskLists?.find(l => l.id === listId) ? (
                                            <>
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: taskLists.find(l => l.id === listId)?.color }} />
                                                <span className="truncate max-w-[100px] text-foreground">{taskLists.find(l => l.id === listId)?.name}</span>
                                            </>
                                        ) : (
                                            <>
                                                <List className="w-3.5 h-3.5 text-muted-foreground/70" />
                                                <span className="text-muted-foreground">Lista</span>
                                            </>
                                        )}
                                    </div>
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

                            {/* Assignee Pill */}
                            <Select value={assignee} onValueChange={setAssignee}>
                                <SelectTrigger className="w-auto h-8 px-3 rounded-full border border-border text-xs font-medium hover:bg-muted/50 transition-colors shadow-none bg-transparent">
                                    <div className="flex items-center gap-2">
                                        {assignee !== "unassigned" ? (
                                            <>
                                                <Avatar className="w-5 h-5">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${assignee}`} />
                                                    <AvatarFallback>{assignee.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="truncate max-w-[100px]">{assignee}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-muted-foreground">Responsável</span>
                                            </>
                                        )}
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Sem responsável</SelectItem>
                                    {colaboradores.map(c => (
                                        <SelectItem key={c.user_id || c.nome} value={c.nome}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-5 h-5">
                                                    <AvatarImage src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.nome}`} />
                                                    <AvatarFallback>{c.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                {c.nome}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Due Date Pill */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={`h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted/50 transition-colors shadow-none bg-transparent ${!dueDate && 'text-muted-foreground'}`}>
                                        <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                                        {dueDate ? format(new Date(dueDate), "dd MMM, yyyy", { locale: ptBR }) : "Data de vencimento"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dueDate ? new Date(dueDate + 'T12:00:00') : undefined}
                                        onSelect={(date) => setDueDate(date ? format(date, "yyyy-MM-dd") : "")}
                                        initialFocus
                                        modifiers={{
                                            recurring: (date) => isRecurringDate(date, recurrence, dueDate)
                                        }}
                                        modifiersClassNames={{
                                            recurring: "bg-primary/15 text-primary font-semibold rounded-md"
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Priority Pill */}
                            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                                <SelectTrigger className="w-auto h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted/50 transition-colors shadow-none bg-transparent">
                                    <div className="flex items-center gap-1.5 focus:outline-none">
                                        <Flag className={`w-3.5 h-3.5 ${priority === 'alta' ? 'text-red-500 fill-red-500/20' :
                                            priority === 'media' ? 'text-amber-500 fill-amber-500/20' :
                                                'text-blue-500 fill-blue-500/20'
                                            }`} />
                                        <span className="capitalize">{priority === 'baixa' ? 'Brasileirão' : priority === 'media' ? 'Libertadores' : 'Copa do Mundo'}</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="baixa">
                                        <div className="flex items-center gap-2">
                                            <Flag className="w-3.5 h-3.5 text-blue-500" /> {PRIORITY_LABELS.baixa}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="media">
                                        <div className="flex items-center gap-2">
                                            <Flag className="w-3.5 h-3.5 text-amber-500" /> {PRIORITY_LABELS.media}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="alta">
                                        <div className="flex items-center gap-2">
                                            <Flag className="w-3.5 h-3.5 text-red-500" /> {PRIORITY_LABELS.alta}
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Recurrence Pill */}
                            <RecurrenceSelect value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
                                <SelectTrigger className="w-auto h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted/50 transition-colors shadow-none bg-transparent">
                                    <div className="flex items-center gap-1.5">
                                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="capitalize">{recurrence === 'none' ? 'Recorrência' : getRecurrenceLabel(recurrence)}</span>
                                    </div>
                                </SelectTrigger>
                            </RecurrenceSelect>

                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border shadow-none bg-transparent text-muted-foreground hover:bg-muted/50">
                                <Tag className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="p-4 border-t bg-muted/10 flex items-center justify-end">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending} className="h-9 text-muted-foreground hover:text-foreground">
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={isPending || !title.trim()} className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-none rounded-md">
                                Criar Tarefa
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
