import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/useTaskMutations";
import { useTaskLists } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { TaskPriority, RecurrenceType, RECURRENCE_LABELS, PRIORITY_LABELS } from "@/types/tasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CalendarIcon, Flag, RefreshCw, Sparkles, Tag, Users, List, Building2, LinkIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { isRecurringDate } from "@/lib/dateUtils";
import { RecurrenceSelect } from "../details/RecurrenceSelect";
import { getRecurrenceLabel } from "@/types/tasks";
import { useDraftTasksStore, DraftTask } from "@/store/useDraftTasksStore";
import { Minus } from "lucide-react";
import { CriativoSelector } from "../../Lancamentos/CriativoSelector";

interface CreateTaskModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultAssignee?: string;
    defaultListId?: string;
    defaultTitle?: string;
    defaultDescription?: string;
    draftData?: DraftTask;
    onSuccessTask?: (task: any) => void;
}

export function CreateTaskModal({ open, onOpenChange, defaultAssignee, defaultListId, defaultTitle, defaultDescription, draftData, onSuccessTask }: CreateTaskModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignee, setAssignee] = useState<string>("unassigned");
    const [priority, setPriority] = useState<TaskPriority>("media");
    const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
    const [listId, setListId] = useState<string>("none");
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [clienteId, setClienteId] = useState<string>("none");
    const [selectedCriativos, setSelectedCriativos] = useState<string[]>([]);

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string, avatar_url?: string }[]>([]);
    const [clientes, setClientes] = useState<{ id: string, nome: string, branding_logo_url?: string, aliases?: string[], catalogo_criativos_url?: string }[]>([]);
    const [autoSelectedClientIndicator, setAutoSelectedClientIndicator] = useState(false);
    const { userData: currentUser } = useCurrentUser();
    const { mutate: createTask, isPending } = useCreateTask();
    const { data: taskLists } = useTaskLists();

    // Draft store actions
    const addDraft = useDraftTasksStore((state) => state.addDraft);
    const updateDraft = useDraftTasksStore((state) => state.updateDraft);
    const removeDraft = useDraftTasksStore((state) => state.removeDraft);

    useEffect(() => {
        if (open) {
            supabase.from("colaboradores").select("nome, user_id, avatar_url").order("nome").then(({ data }) => {
                if (data) setColaboradores(data);
            });
            supabase.from("clientes").select("id, nome, branding_logo_url, aliases, catalogo_criativos_url").eq("is_active", true).order("nome").then(({ data }) => {
                if (data) setClientes(data);
            });

            // Compute assignee inline to avoid stale closure from external getAssignedTo()
            const resolvedAssignee = draftData?.assignee
                || defaultAssignee
                || (currentUser ? (currentUser.nome || currentUser.email || "unassigned") : "unassigned");

            // Reset ALL fields cleanly every time the modal opens to prevent state leaking between openings
            setTitle(draftData?.title || defaultTitle || "");
            setDescription(draftData?.description || defaultDescription || "");
            setAssignee(resolvedAssignee);
            setPriority((draftData?.priority as TaskPriority) || "media");
            setRecurrence((draftData?.recurrence as RecurrenceType) || "none");
            setListId(draftData?.list_id || defaultListId || "none");
            setClienteId(draftData?.cliente_id || "none");
            setSelectedCriativos(draftData?.criativos || []);
            setAutoSelectedClientIndicator(false);
            setDueDate(draftData?.due_date || null);
        }
    }, [open, defaultAssignee, defaultListId, defaultTitle, defaultDescription, draftData, currentUser]);

    // Auto-recommendation logic for client based on title
    useEffect(() => {
        if (!title || clientes.length === 0 || clienteId !== "none") return;

        const lowerTitleParts = title.toLowerCase().split(/\\s+/);

        for (const client of clientes) {
            const matchName = lowerTitleParts.some(part => client.nome.toLowerCase().includes(part) && part.length > 3);
            const matchAlias = client.aliases?.some(alias => lowerTitleParts.some(part => alias.toLowerCase() === part));

            if (matchName || matchAlias) {
                setClienteId(client.id);
                setSelectedCriativos([]);
                setAutoSelectedClientIndicator(true);
                setTimeout(() => setAutoSelectedClientIndicator(false), 3000); // Hide indicator after 3s
                break;
            }
        }
    }, [title, clientes]);

    const handleSave = () => {
        if (!title.trim() || !dueDate) return;

        createTask(
            {
                title,
                description,
                assignee: assignee !== "unassigned" ? assignee : null,
                priority,
                list_id: listId !== "none" ? listId : null,
                cliente_id: clienteId !== "none" ? clienteId : null,
                criativos: selectedCriativos.length > 0 ? selectedCriativos : undefined,
                recurrence: recurrence !== "none" ? recurrence : null,
                due_date: dueDate || null,
            },
            {
                onSuccess: (data) => {
                    if (draftData?.id) {
                        removeDraft(draftData.id);
                    }
                    if (onSuccessTask && data) {
                        // Assuming the mutation returns an array of the created tasks or the task itself as data.
                        const newId = Array.isArray(data) ? data[0]?.id : (data as any)?.id;
                        if (newId) {
                            onSuccessTask({ id: newId, title });
                        }
                    }
                    onOpenChange(false);
                }
            }
        );
    };

    const handleMinimize = () => {
        if (!title.trim()) {
            onOpenChange(false);
            return;
        }

        const draftPayload = {
            title,
            description,
            assignee: assignee !== "unassigned" ? assignee : null,
            priority,
            list_id: listId !== "none" ? listId : null,
            cliente_id: clienteId !== "none" ? clienteId : null,
            criativos: selectedCriativos.length > 0 ? selectedCriativos : undefined,
            recurrence: recurrence !== "none" ? recurrence : null,
            due_date: dueDate || null,
        };

        if (draftData?.id) {
            updateDraft(draftData.id, draftPayload);
        } else {
            addDraft(draftPayload);
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background border rounded-xl shadow-lg [&>button]:hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh]">
                <div className="flex flex-col h-full w-full overflow-hidden">
                    {/* Header Controls (Optional top bar) */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20 shrink-0">
                        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                            <span className="text-primary cursor-pointer border-b-2 border-primary pb-[10px] -mb-[13px]">{draftData ? "Rascunho" : "Tarefa"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleMinimize}
                                className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted/80 text-muted-foreground transition-colors"
                                title="Minimizar para rascunho"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted/80 text-muted-foreground transition-colors group-hover:text-destructive"
                                title="Descartar rascunho"
                            >
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                        <div className="p-6 space-y-6">
                            {/* Title & Description */}
                            <div className="space-y-4">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Nome da Tarefa"
                                    className="text-[1.575rem] md:text-[2.1rem] py-2 font-bold tracking-tight border-0 px-0 h-auto focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/60"
                                    autoFocus
                                />

                                <div className="relative group editor-container">
                                    <RichTextEditor
                                        content={description}
                                        onChange={setDescription}
                                        placeholder="Adicionar descrição..."
                                        className="bg-muted/30 border-0 shadow-none min-h-[120px]"
                                        context="tasks"
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
                                            {dueDate ? format(new Date(dueDate + 'T12:00:00'), "dd MMM, yyyy", { locale: ptBR }) : "Data de vencimento"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dueDate ? new Date(dueDate + 'T12:00:00') : undefined}
                                            onSelect={(date) => date && setDueDate(format(date, "yyyy-MM-dd"))}
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

                                {/* Client Pill */}
                                <Select value={clienteId} onValueChange={(val) => { setClienteId(val); setSelectedCriativos([]); setAutoSelectedClientIndicator(false); }}>
                                    <SelectTrigger className={"w-auto h-8 px-3 rounded-full border text-xs font-medium hover:bg-muted/50 transition-colors shadow-none bg-transparent " + (autoSelectedClientIndicator ? "ring-2 ring-indigo-500/50" : "")}>
                                        <div className="flex items-center gap-2">
                                            {clienteId !== "none" && clientes.find(c => c.id === clienteId) ? (
                                                <>
                                                    {clientes.find(c => c.id === clienteId)?.branding_logo_url ? (
                                                        <img src={clientes.find(c => c.id === clienteId)?.branding_logo_url} alt="Logo" className="w-4 h-4 rounded-full object-cover" />
                                                    ) : (
                                                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                    )}
                                                    <span className="truncate max-w-[100px]">{clientes.find(c => c.id === clienteId)?.nome}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="text-muted-foreground">Cliente</span>
                                                </>
                                            )}
                                            {autoSelectedClientIndicator && <Sparkles className="w-3 h-3 text-indigo-500 ml-1" />}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        <SelectItem value="none">Sem cliente</SelectItem>
                                        {clientes.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                <div className="flex items-center gap-2">
                                                    {c.branding_logo_url ? (
                                                        <img src={c.branding_logo_url} alt="Logo" className="w-4 h-4 rounded-full object-cover" />
                                                    ) : (
                                                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                    )}
                                                    {c.nome}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {clienteId !== "none" && (
                            <div className="px-6 pb-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-muted-foreground" />
                                        Criativos Vinculados
                                    </label>
                                    {clientes.find(c => c.id === clienteId)?.catalogo_criativos_url && (
                                        <a
                                            href={clientes.find(c => c.id === clienteId)?.catalogo_criativos_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            <LinkIcon className="w-3 h-3 mr-1" />
                                            Abrir Catálogo do Cliente
                                        </a>
                                    )}
                                </div>
                                <CriativoSelector
                                    clienteId={clienteId}
                                    selectedIds={selectedCriativos}
                                    onSelectionChange={setSelectedCriativos}
                                    className="max-h-[200px]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer Controls */}
                    <div className="p-4 border-t bg-muted/10 flex items-center justify-end shrink-0">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending} className="h-9 text-muted-foreground hover:text-foreground">
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={isPending || !title.trim() || !dueDate} className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-none rounded-md">
                                Criar Tarefa
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
