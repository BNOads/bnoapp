import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTask, useTaskLists } from "@/hooks/useTasks";
import { useUpdateTask, useToggleTaskComplete, useDeleteTask } from "@/hooks/useTaskMutations";
import { SubtaskList } from "./SubtaskList";
import { CommentSection } from "./CommentSection";
import { HistoryTimeline } from "./HistoryTimeline";
import { RecurrenceSelect } from "./RecurrenceSelect";
import { CriativoSelector } from "../../Lancamentos/CriativoSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
    Check, Clock, CalendarIcon, AlertCircle, Share2, MoreHorizontal,
    Maximize2, Link as LinkIcon, User, Tag, Flag, Search, Bell, Pin, Play, Square, Users, RefreshCw, RepeatIcon, List, Building2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isRecurringDate } from "@/lib/dateUtils";
import { TaskPriority, PRIORITY_LABELS, RecurrenceType, RECURRENCE_LABELS, getRecurrenceLabel } from "@/types/tasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCreateComment } from "@/hooks/useTaskComments";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";

interface TaskDetailDialogProps {
    taskId: string | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    asPage?: boolean;
}

export function TaskDetailDialog({ taskId, open = false, onOpenChange, asPage = false }: TaskDetailDialogProps) {
    const { data: task, isLoading: isTaskLoading, error } = useTask(taskId || "");
    const { data: taskLists } = useTaskLists();
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const { mutate: updateTask } = useUpdateTask();
    const { mutate: deleteTask } = useDeleteTask();

    const { userData: currentUser } = useCurrentUser();
    const { mutate: addComment, isPending: isAddingComment } = useCreateComment();

    const [newComment, setNewComment] = useState("");
    const [description, setDescription] = useState("");
    const [isEditingDescription, setIsEditingDescription] = useState(false);

    const [title, setTitle] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const [commentTarget, setCommentTarget] = useState<"comentário" | "diario_bordo">("comentário");
    const [isPostingToDiario, setIsPostingToDiario] = useState(false);

    // Pending recurrence: when recurrence is set but task has no due_date
    const [pendingRecurrence, setPendingRecurrence] = useState<string | null>(null);
    const [pendingRecurrenceDueDate, setPendingRecurrenceDueDate] = useState<string>("");

    // Time tracking state
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const [colaboradores, setColaboradores] = useState<{ nome: string, user_id: string, avatar_url?: string }[]>([]);
    const [clientes, setClientes] = useState<{ id: string, nome: string, branding_logo_url?: string, catalogo_criativos_url?: string }[]>([]);

    useEffect(() => {
        if (open || asPage) {
            supabase.from("colaboradores").select("nome, user_id, avatar_url").order("nome").then(({ data }) => {
                if (data) setColaboradores(data);
            });
            supabase.from("clientes").select("id, nome, branding_logo_url, catalogo_criativos_url").eq("ativo", true).order("nome").then(({ data }) => {
                if (data) setClientes(data);
            });
        }
    }, [open, asPage]);

    useEffect(() => {
        if (task && !isEditingDescription) {
            setDescription(task.description || "");
        }
        if (task && !isEditingTitle) {
            setTitle(task.title || "");
        }
    }, [task, isEditingDescription, isEditingTitle]);

    // Time tracking effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (task?.timer_started_at) {
            const updateTimer = () => {
                const start = new Date(task.timer_started_at!).getTime();
                const now = new Date().getTime();
                const diff = Math.floor((now - start) / 1000);
                setElapsedSeconds(diff);
            };
            updateTimer(); // Initial call
            interval = setInterval(updateTimer, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => clearInterval(interval);
    }, [task?.timer_started_at]);

    const formatTimer = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleTimerToggle = () => {
        if (!task) return;

        if (task.timer_started_at) {
            // Stop timer
            const start = new Date(task.timer_started_at).getTime();
            const now = new Date().getTime();
            const sessionSeconds = Math.floor((now - start) / 1000);
            const totalTracked = (task.time_tracked || 0) + sessionSeconds;

            updateTask({
                id: task.id,
                updates: {
                    timer_started_at: null,
                    time_tracked: totalTracked
                }
            });
        } else {
            // Start timer
            updateTask({
                id: task.id,
                updates: {
                    timer_started_at: new Date().toISOString()
                }
            });
        }
    };

    const handleCopyLink = () => {
        if (!task) return;
        const link = `${window.location.origin}/tarefas/${task.id}`;
        navigator.clipboard.writeText(link).then(() => {
            toast.success("Link copiado para a área de transferência!");
        });
    };

    const handleToggleComplete = () => {
        if (task) {
            toggleComplete({ id: task.id, completed: !task.completed });
        }
    };

    const handleDeleteTask = () => {
        if (task) {
            if (window.confirm('Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.')) {
                deleteTask(task.id, {
                    onSuccess: () => {
                        if (onOpenChange) onOpenChange(false);
                    }
                });
            }
        }
    };

    const handleUpdateField = (field: string, value: any) => {
        if (!task) return;
        updateTask({ id: task.id, updates: { [field]: value } });
    };

    // When user sets recurrence but task has no due_date, prompt for the first occurrence date
    const handleRecurrenceChange = (val: string | null) => {
        if (!task) return;
        const newRecurrence = val === "none" ? null : val;
        if (newRecurrence && !task.due_date) {
            // Store pending state — show inline prompt
            setPendingRecurrence(newRecurrence);
            setPendingRecurrenceDueDate("");
            return;
        }
        handleUpdateField("recurrence", newRecurrence);
    };

    const handleConfirmRecurrenceWithDate = () => {
        if (!task || !pendingRecurrence || !pendingRecurrenceDueDate) return;
        updateTask({
            id: task.id,
            updates: { recurrence: pendingRecurrence, due_date: pendingRecurrenceDueDate }
        });
        setPendingRecurrence(null);
        setPendingRecurrenceDueDate("");
    };

    const handleCancelPendingRecurrence = () => {
        setPendingRecurrence(null);
        setPendingRecurrenceDueDate("");
    };

    const handleSaveDescription = () => {
        if (task && description !== task.description) {
            handleUpdateField("description", description);
        }
        setIsEditingDescription(false);
    };

    const handleSaveTitle = () => {
        if (!title.trim()) {
            setTitle(task?.title || "");
            setIsEditingTitle(false);
            return;
        }
        if (task && title.trim() !== task.title) {
            handleUpdateField("title", title.trim());
        }
        setIsEditingTitle(false);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser || !task) return;

        if (commentTarget === "diario_bordo") {
            if (!task.cliente_id || task.cliente_id === "none") {
                toast.error("Tarefa precisa ter um cliente vinculado para adicionar ao Diário de Bordo.");
                return;
            }

            setIsPostingToDiario(true);
            try {
                const { error: dbError } = await supabase
                    .from('diario_bordo')
                    .insert({
                        cliente_id: task.cliente_id,
                        autor_id: currentUser.user_id || currentUser.id,
                        texto: newComment.trim(),
                    });

                if (dbError) throw dbError;

                toast.success("Adicionado ao Diário de Bordo do cliente!");
            } catch (err) {
                console.error("Erro ao adicionar ao Diário de Bordo:", err);
                toast.error("Erro ao registrar no Diário de Bordo.");
            } finally {
                setIsPostingToDiario(false);
            }
        }

        addComment({
            task_id: task.id,
            author_name: currentUser.nome || currentUser.email || "Usuário",
            content: newComment.trim(),
        } as any, {
            onSuccess: () => setNewComment(""),
        });
    };

    if (!open && !asPage) return null;

    const innerContent = (
        <>
            {isTaskLoading && (
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

            {task && !isTaskLoading && !error && (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Top Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b bg-background z-10 sticky top-0 shrink-0">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center hidden sm:flex">
                                <Select
                                    value={task.list_id || "none"}
                                    onValueChange={(val) => handleUpdateField("list_id", val === "none" ? null : val)}
                                >
                                    <SelectTrigger className="h-7 w-auto px-2 bg-transparent border-0 hover:bg-muted shadow-none font-medium text-foreground gap-2">
                                        {task.list_id && taskLists?.find(l => l.id === task.list_id) ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: taskLists.find(l => l.id === task.list_id)?.color }} />
                                                {taskLists.find(l => l.id === task.list_id)?.name}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground font-normal">Sem lista</span>
                                        )}
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sem lista</SelectItem>
                                        {taskLists?.map((list) => (
                                            <SelectItem key={list.id} value={list.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                                                    {list.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-3">
                            <span className="text-xs text-muted-foreground hidden sm:block">
                                Criada em {format(new Date(task.created_at || new Date()), "d MMM", { locale: ptBR })}
                            </span>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hidden sm:flex" onClick={handleCopyLink}>
                                <Share2 className="h-3.5 w-3.5" />
                                Compartilhar
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 hidden sm:flex" onClick={handleDeleteTask}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                            </Button>
                            <div className="flex items-center gap-1 sm:border-l sm:pl-2 sm:ml-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground flex" onClick={handleCopyLink}>
                                    <LinkIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area (2 columns) */}
                    <div className="flex flex-1 overflow-hidden">
                        {/* Left Column: Task Details */}
                        <div className="flex-1 flex flex-col overflow-y-auto border-r custom-scrollbar">
                            <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">

                                {/* Task Context Header */}
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <Badge variant="outline" className="font-normal text-xs gap-1.5 py-1">
                                        <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                                        Tarefa
                                    </Badge>
                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        {task.id.substring(0, 8)}
                                    </span>
                                </div>

                                {/* Task Title Row */}
                                <div className="space-y-4">
                                    {isEditingTitle ? (
                                        <Input
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            onBlur={handleSaveTitle}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    handleSaveTitle();
                                                }
                                                if (e.key === "Escape") {
                                                    setTitle(task.title);
                                                    setIsEditingTitle(false);
                                                }
                                            }}
                                            autoFocus
                                            className={`text-2xl sm:text-3xl font-semibold tracking-tight h-auto py-1 px-2 -ml-2 border-primary/50 bg-background`}
                                        />
                                    ) : (
                                        <h1
                                            className={`text-2xl sm:text-3xl font-semibold tracking-tight cursor-text hover:bg-muted/50 w-full py-1 px-2 -ml-2 rounded-md transition-colors ${task.completed ? "line-through text-muted-foreground" : ""}`}
                                            onClick={() => !task.completed && setIsEditingTitle(true)}
                                            title={task.completed ? "Tarefas concluídas não podem ser renomeadas" : "Clique para editar"}
                                        >
                                            {task.title}
                                        </h1>
                                    )}
                                </div>

                                {/* Properties Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-y-4 gap-x-8 py-2">
                                    {/* Status */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                                            <div className="h-3 w-3 rounded-full border-2 border-slate-300"></div>
                                            Status
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleToggleComplete}
                                            className={`h-7 px-2.5 text-xs border rounded gap-1.5 w-fit transition-all duration-200 ${task.completed ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 hover:bg-emerald-100 hover:text-emerald-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-transparent shadow-none hover:border-slate-300'}`}
                                        >
                                            {task.completed ? "CONCLUÍDO" : "A FAZER"}
                                            <Check className={`h-3 w-3 transition-transform duration-200 ${task.completed ? 'scale-100' : 'scale-0 opacity-0 w-0'}`} />
                                        </Button>
                                    </div>

                                    {/* Cliente */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                                            <Building2 className="h-3.5 w-3.5" />
                                            Cliente
                                        </div>
                                        <Select
                                            value={task.cliente_id || "none"}
                                            onValueChange={(val) => handleUpdateField("cliente_id", val === "none" ? null : val)}
                                        >
                                            <SelectTrigger className="w-auto h-7 px-2 py-0 border-0 hover:bg-muted shadow-none bg-transparent gap-2 -ml-2">
                                                <div className="flex items-center gap-2 max-w-[140px]">
                                                    {task.cliente_id && clientes.find(c => c.id === task.cliente_id) ? (
                                                        <>
                                                            {clientes.find(c => c.id === task.cliente_id)?.branding_logo_url ? (
                                                                <img src={clientes.find(c => c.id === task.cliente_id)?.branding_logo_url} alt="Logo" className="w-4 h-4 rounded-full object-cover shrink-0" />
                                                            ) : (
                                                                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                            )}
                                                            <span className="truncate text-xs font-medium">{clientes.find(c => c.id === task.cliente_id)?.nome}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">Vazio</span>
                                                    )}
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                <SelectItem value="none">Sem cliente</SelectItem>
                                                {clientes.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        <div className="flex items-center gap-2">
                                                            {c.branding_logo_url ? (
                                                                <img src={c.branding_logo_url} alt="Logo" className="w-4 h-4 rounded-full object-cover shrink-0" />
                                                            ) : (
                                                                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                            )}
                                                            {c.nome}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Responsáveis */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                                            <User className="h-3.5 w-3.5" />
                                            Responsáveis
                                        </div>
                                        <Select
                                            value={task.assignee || "unassigned"}
                                            onValueChange={(val) => {
                                                const newAssignee = val === "unassigned" ? null : val;
                                                const colab = colaboradores.find(c => c.nome === val);
                                                updateTask({
                                                    id: task.id,
                                                    updates: {
                                                        assignee: newAssignee,
                                                        assigned_to_id: colab ? colab.user_id : null
                                                    }
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="w-auto h-7 px-2 py-0 border-0 hover:bg-muted shadow-none bg-transparent">
                                                <div className="flex items-center gap-2">
                                                    {task.assignee ? (
                                                        <>
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${task.assignee}`} />
                                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                                    {task.assignee.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="truncate max-w-[100px] text-xs font-medium">{task.assignee}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                            <span className="text-muted-foreground text-xs">Vazio</span>
                                                        </>
                                                    )}
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Sem responsável</SelectItem>
                                                {colaboradores.map(c => (
                                                    <SelectItem key={c.user_id || c.nome} value={c.nome}>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-5 w-5">
                                                                <AvatarImage src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.nome}`} />
                                                                <AvatarFallback className="text-[10px]">{c.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            {c.nome}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Datas */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                                            <CalendarIcon className="h-3.5 w-3.5" />
                                            Datas
                                        </div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-muted font-normal -ml-2 text-foreground">
                                                    {task.due_date ? format(new Date(`${task.due_date}T00:00:00`), "d MMM, yyyy", { locale: ptBR }) : <span className="text-muted-foreground">Adicionar</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={task.due_date ? new Date(task.due_date + 'T12:00:00') : undefined}
                                                    onSelect={(date) => handleUpdateField("due_date", date ? format(date, "yyyy-MM-dd") : null)}
                                                    initialFocus
                                                    modifiers={{
                                                        recurring: (date) => isRecurringDate(date, task.recurrence, task.due_date)
                                                    }}
                                                    modifiersClassNames={{
                                                        recurring: "bg-primary/15 text-primary font-semibold rounded-md"
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Prioridade */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                                            <Flag className="h-3.5 w-3.5" />
                                            Prioridade
                                        </div>
                                        <Select
                                            value={task.priority || "none"}
                                            onValueChange={(val) => handleUpdateField("priority", val === "none" ? null : val as TaskPriority)}
                                        >
                                            <SelectTrigger className="w-auto h-7 px-2 border-0 hover:bg-muted shadow-none bg-transparent -ml-2">
                                                {task.priority ? (
                                                    <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className="h-6 text-[10px] capitalize font-medium rounded-sm whitespace-nowrap">
                                                        {PRIORITY_LABELS[task.priority as TaskPriority]}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sem prioridade</SelectItem>
                                                <SelectItem value="baixa">
                                                    <div className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 text-blue-500" /> {PRIORITY_LABELS.baixa}</div>
                                                </SelectItem>
                                                <SelectItem value="media">
                                                    <div className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 text-amber-500" /> {PRIORITY_LABELS.media}</div>
                                                </SelectItem>
                                                <SelectItem value="alta">
                                                    <div className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 text-red-500" /> {PRIORITY_LABELS.alta}</div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Tempo rastreado */}
                                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                                        <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0 mt-1 sm:mt-0">
                                            <Clock className="h-3.5 w-3.5" />
                                            Tempo
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 -ml-2 min-w-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-7 px-2 text-xs transition-colors rounded ${task.timer_started_at ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30' : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'}`}
                                                onClick={handleTimerToggle}
                                            >
                                                {task.timer_started_at ? (
                                                    <>
                                                        <div className="bg-red-500 rounded-full h-4 w-4 flex items-center justify-center mr-1.5">
                                                            <Square className="h-2 w-2 text-white fill-current" />
                                                        </div>
                                                        <span className="font-mono">{formatTimer(elapsedSeconds)}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="h-3 w-3 mr-1" />
                                                        Adicionar hora
                                                    </>
                                                )}
                                            </Button>
                                            {(task.time_tracked || 0) > 0 && !task.timer_started_at && (
                                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground h-6 flex items-center">
                                                    {formatTimer(task.time_tracked || 0)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lista */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                                            <List className="h-3.5 w-3.5" />
                                            Lista
                                        </div>
                                        <Select
                                            value={task.list_id || "none"}
                                            onValueChange={(val) => handleUpdateField("list_id", val === "none" ? null : val)}
                                        >
                                            <SelectTrigger className="w-auto h-7 px-2 border-0 hover:bg-muted shadow-none bg-transparent -ml-2 min-w-0 flex-1">
                                                {task.list_id && taskLists?.find(l => l.id === task.list_id) ? (
                                                    <Badge variant="secondary" className="font-medium truncate max-w-full tracking-tight hover:opacity-90 transition-opacity gap-1.5" style={{ backgroundColor: taskLists.find(l => l.id === task.list_id)?.color, color: 'white', border: 'none' }}>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                                                        {taskLists.find(l => l.id === task.list_id)?.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sem lista</SelectItem>
                                                {taskLists?.map((list) => (
                                                    <SelectItem key={list.id} value={list.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                                                            {list.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Recorrência */}
                                    <div className="flex items-start gap-3 min-w-0 flex-col">
                                        <div className="flex items-center gap-3 min-w-0 w-full">
                                            <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                Recorrência
                                            </div>
                                            <RecurrenceSelect
                                                value={pendingRecurrence || task.recurrence || "none"}
                                                onValueChange={handleRecurrenceChange}
                                            >
                                                <SelectTrigger className="w-auto h-7 px-2 border-0 hover:bg-muted shadow-none bg-transparent -ml-2 min-w-0 flex-1">
                                                    {pendingRecurrence ? (
                                                        <span className="text-xs font-medium text-orange-500">
                                                            {getRecurrenceLabel(pendingRecurrence)} (pendente — defina a data abaixo)
                                                        </span>
                                                    ) : task.recurrence && task.recurrence !== "none" ? (
                                                        <span className="text-xs font-medium text-foreground">
                                                            {getRecurrenceLabel(task.recurrence)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </SelectTrigger>
                                            </RecurrenceSelect>
                                        </div>
                                        {/* Inline prompt when recurrence is pending and task has no due_date */}
                                        {pendingRecurrence && !task.due_date && (
                                            <div className="ml-[calc(6rem+12px)] sm:ml-[calc(7rem+12px)] w-full p-3 rounded-lg bg-orange-50 border border-orange-200 space-y-2.5">
                                                <p className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    Defina a data da 1ª ocorrência para ativar a recorrência
                                                </p>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="sm" className={`h-8 text-xs justify-start font-normal w-full border-orange-200 ${!pendingRecurrenceDueDate ? 'text-muted-foreground' : ''}`}>
                                                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-orange-500" />
                                                            {pendingRecurrenceDueDate
                                                                ? format(new Date(`${pendingRecurrenceDueDate}T12:00:00`), "dd MMM, yyyy", { locale: ptBR })
                                                                : "Selecione a data da 1ª ocorrência..."}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={pendingRecurrenceDueDate ? new Date(`${pendingRecurrenceDueDate}T12:00:00`) : undefined}
                                                            onSelect={(date) => setPendingRecurrenceDueDate(date ? format(date, "yyyy-MM-dd") : "")}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" className="h-7 text-xs flex-1 bg-orange-600 hover:bg-orange-700 text-white" onClick={handleConfirmRecurrenceWithDate} disabled={!pendingRecurrenceDueDate}>
                                                        Confirmar
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={handleCancelPendingRecurrence}>
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Criativos */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-24 sm:w-28 text-sm text-muted-foreground flex items-center gap-2 shrink-0">
                                            <Tag className="h-3.5 w-3.5" />
                                            Criativos
                                        </div>
                                        <div className="flex flex-col gap-1 w-full min-w-0">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-auto py-1 px-2 -ml-2 text-left justify-start font-normal text-muted-foreground hover:text-foreground w-fit rounded-lg max-w-full hover:bg-muted/50 transition-colors">
                                                        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                                                            {task.criativos && task.criativos.length > 0 ? (
                                                                task.criativos.map((c, idx) => (
                                                                    <Badge key={idx} variant="secondary" className="font-normal text-xs bg-muted/80 text-muted-foreground hover:text-foreground pointer-events-none">
                                                                        {c}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Vazio</span>
                                                            )}
                                                        </div>
                                                    </Button>
                                                </PopoverTrigger>
                                                {task.cliente_id && task.cliente_id !== "none" ? (
                                                    <PopoverContent align="start" className="w-[340px] p-0 rounded-xl overflow-hidden shadow-xl" sideOffset={4}>
                                                        <div className="p-3 bg-muted/30 border-b flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 text-sm font-semibold">
                                                                <Tag className="w-4 h-4 text-primary" />
                                                                Criativos Vinculados
                                                            </div>
                                                            <p className="text-xs text-muted-foreground leading-tight">
                                                                Selecione e filtre criativos do catálogo deste cliente.
                                                            </p>
                                                        </div>
                                                        <div className="p-1 max-h-[300px] overflow-hidden">
                                                            <CriativoSelector
                                                                clienteId={task.cliente_id}
                                                                selectedIds={task.criativos || []}
                                                                onSelectionChange={(newSelection) => handleUpdateField("criativos", newSelection.length > 0 ? newSelection : null)}
                                                            />
                                                        </div>
                                                    </PopoverContent>
                                                ) : (
                                                    <PopoverContent align="start" className="w-[260px] p-4 rounded-xl shadow-xl space-y-2" sideOffset={4}>
                                                        <div className="flex items-center gap-2 text-amber-600">
                                                            <AlertCircle className="w-4 h-4" />
                                                            <p className="text-sm font-medium">Cliente Necessário</p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Selecione um cliente acima para vincular os criativos nesta tarefa.
                                                        </p>
                                                    </PopoverContent>
                                                )}
                                            </Popover>

                                            {task.cliente_id && clientes.find(c => c.id === task.cliente_id)?.catalogo_criativos_url && (
                                                <a
                                                    href={clientes.find(c => c.id === task.cliente_id)?.catalogo_criativos_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline w-fit mt-0.5 ml-1"
                                                >
                                                    <LinkIcon className="w-3 h-3 mr-1" />
                                                    Abrir Catálogo de Criativos
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Description Body */}
                                <div className="border rounded-xl p-0 bg-card text-card-foreground shadow-sm mb-6 min-h-[150px] sm:min-h-[200px] overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                                    {isEditingDescription || !task.description ? (
                                        <div className="flex flex-col h-full h-[200px]">
                                            <Textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Escreva uma descrição ou / para adicionar comandos..."
                                                className="w-full flex-1 border-0 resize-none p-4 sm:p-6 text-sm focus-visible:ring-0 rounded-none bg-transparent"
                                                onFocus={() => setIsEditingDescription(true)}
                                            />
                                            {isEditingDescription && (
                                                <div className="flex justify-end p-2 bg-muted/20 border-t">
                                                    <Button size="sm" onClick={handleSaveDescription}>
                                                        Salvar
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className="whitespace-pre-wrap text-sm leading-relaxed p-4 sm:p-6 cursor-text min-h-[150px] [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800"
                                            onClick={() => setIsEditingDescription(true)}
                                            dangerouslySetInnerHTML={{ __html: task.description || '' }}
                                        />
                                    )}
                                </div>

                                {/* Bottom Tabs within Left Column */}
                                <Tabs defaultValue="subtasks" className="w-full mt-8">
                                    <TabsList className="bg-transparent border-b h-10 w-full justify-start gap-4 sm:gap-6 rounded-none px-0 overflow-x-auto flex-nowrap">
                                        <TabsTrigger value="subtasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-1 font-medium pb-2 text-sm whitespace-nowrap">
                                            Subtarefas <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 rounded-full">{task.subtasks?.length || 0}</span>
                                        </TabsTrigger>
                                        {/* Mobile only tab for Activity */}
                                        <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-1 font-medium pb-2 text-sm whitespace-nowrap lg:hidden">
                                            Atividade <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 rounded-full">{task.task_comments?.length || 0}</span>
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="pt-6 pb-12">
                                        <TabsContent value="subtasks" className="m-0 bg-transparent">
                                            <SubtaskList taskId={task.id} subtasks={task.subtasksTree || []} />
                                        </TabsContent>
                                        {/* Mobile Activity Tab */}
                                        <TabsContent value="activity" className="m-0 bg-transparent lg:hidden space-y-6">
                                            <HistoryTimeline history={task.task_history || []} />
                                            <CommentSection taskId={task.id} comments={task.task_comments || []} />
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </div>
                        </div>

                        {/* Right Column: Activity Sidebar (Desktop) */}
                        <div className="w-[300px] lg:w-[350px] xl:w-[400px] flex-shrink-0 flex-col bg-slate-50/50 dark:bg-slate-900/30 border-l relative hidden lg:flex">
                            {/* Sidebar Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                                <h3 className="font-semibold text-base">Atividade</h3>
                            </div>

                            {/* Activity Scroll Area */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <div className="space-y-6 pb-24">
                                    <HistoryTimeline history={task.task_history || []} />
                                    <div className="pt-2">
                                        <CommentSection taskId={task.id} comments={task.task_comments || []} hideForm={true} />
                                    </div>
                                </div>
                            </div>

                            {/* Write Comment Fixed Area */}
                            <div className="p-4 border-t bg-background absolute bottom-0 left-0 right-0 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                                <div className="border rounded-lg shadow-sm bg-card overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                                    <textarea
                                        placeholder="Escreva um comentário..."
                                        className="w-full bg-transparent p-3 text-sm resize-none focus:outline-none min-h-[60px]"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                        disabled={isAddingComment}
                                    />
                                    <div className="flex items-center justify-between px-2 pb-2">
                                        <div className="flex flex-wrap items-center gap-1.5 xl:gap-2">
                                            <Select value={commentTarget} onValueChange={(val: any) => setCommentTarget(val)}>
                                                <SelectTrigger className="h-7 px-2 text-xs bg-slate-100 dark:bg-slate-800 border-0 hidden xl:flex text-muted-foreground w-auto gap-1 focus:ring-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="comentário" className="text-xs">Comentário</SelectItem>
                                                    <SelectItem value="diario_bordo" className="text-xs">Diário de Bordo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-7 rounded-md ml-auto shrink-0 px-2 xl:px-4"
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim() || isAddingComment || isPostingToDiario || !currentUser}
                                        >
                                            <span className="hidden xl:inline">Enviar</span>
                                            <Play className="h-3.5 w-3.5 fill-current xl:ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );

    if (asPage) {
        return (
            <div className="h-full bg-background flex flex-col">
                {innerContent}
            </div>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] md:max-w-[85vw] lg:max-w-[1200px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                {innerContent}
            </DialogContent>
        </Dialog>
    );
}
