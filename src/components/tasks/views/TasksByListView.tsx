import React, { useState, useEffect } from "react";
import { Task, PRIORITY_LABELS, TaskPriority } from "@/types/tasks";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToggleTaskComplete, useUpdateTask, useDeleteTask, useCreateTask } from "@/hooks/useTaskMutations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MessageSquare, Clock, Plus, Flag, List, ChevronDown, ChevronRight, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Layers, CalendarDays, Lock, MoreVertical, Copy, Building2 } from "lucide-react";
import { isOverdue } from "@/lib/dateUtils";
import { useTaskLists } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/hooks/useTasks";

interface TasksByListViewProps {
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
    selectedTasks: string[];
    onToggleSelectTask: (taskId: string) => void;
    onSelectBatch?: (taskIds: string[], select: boolean) => void;
    isAdmin: boolean;
    hideCompleted?: boolean;
    onCreateTaskForList?: (listId: string) => void;
    onOpenBulkEdit?: () => void;
}

type SortColumn = 'title' | 'assignee' | 'priority' | 'due_date' | 'status';
type SortDirection = 'asc' | 'desc';

export function TasksByListView({ tasks, onTaskClick, selectedTasks, onToggleSelectTask, onSelectBatch, isAdmin, hideCompleted = false, onCreateTaskForList, onOpenBulkEdit }: TasksByListViewProps) {
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const { mutate: updateTask } = useUpdateTask();
    const { mutate: deleteTask } = useDeleteTask();
    const { mutate: createTask } = useCreateTask();
    const { data: taskLists = [], isLoading } = useTaskLists();
    const queryClient = useQueryClient();

    const [isAddListOpen, setIsAddListOpen] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [newListColor, setNewListColor] = useState("#3b82f6");
    const [newListPrivate, setNewListPrivate] = useState(false);
    const [newListAllowedUsers, setNewListAllowedUsers] = useState<string[]>([]);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [listSearch, setListSearch] = useState("");

    const [sortColumn, setSortColumn] = useState<SortColumn>('title');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(null);

    const [colaboradores, setColaboradores] = useState<{ nome: string, avatar_url: string | null, user_id: string }[]>([]);
    const [clientes, setClientes] = useState<{ id: string, nome: string, branding_logo_url?: string }[]>([]);

    useEffect(() => {
        supabase.from("colaboradores")
            .select("nome, avatar_url, user_id")
            .then(({ data }) => {
                if (data) setColaboradores(data);
            });
        supabase.from("clientes")
            .select("id, nome, branding_logo_url")
            .eq("ativo", true)
            .then(({ data }) => {
                if (data) setClientes(data);
            });
    }, []);

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getTasksByList = (listId: string | null) => {
        let listTasks = tasks.filter(t => (listId === "none" || !listId) ? !t.list_id : t.list_id === listId);
        if (hideCompleted) {
            listTasks = listTasks.filter(t => !t.completed);
        }

        return listTasks.sort((a, b) => {
            let valA: any = a[sortColumn];
            let valB: any = b[sortColumn];

            if (sortColumn === 'status') {
                valA = a.completed ? 1 : 0;
                valB = b.completed ? 1 : 0;
            } else if (sortColumn === 'priority') {
                const priorityWeight: Record<string, number> = { 'alta': 3, 'media': 2, 'baixa': 1 };
                valA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
                valB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
            } else if (sortColumn === 'due_date') {
                valA = a.due_date ? new Date(a.due_date).getTime() : 0;
                valB = b.due_date ? new Date(b.due_date).getTime() : 0;
            } else if (typeof valA === 'string' && typeof valB === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        const { error } = await supabase.from("task_lists").insert({
            name: newListName.trim(),
            color: newListColor,
            position: taskLists.length,
            is_locked: newListPrivate,
            allowed_user_ids: newListPrivate ? newListAllowedUsers : []
        });
        if (!error) {
            queryClient.invalidateQueries({ queryKey: taskKeys.taskLists() });
            setIsAddListOpen(false);
            setNewListName("");
            setNewListPrivate(false);
            setNewListAllowedUsers([]);
        }
    };

    const handleDuplicateTask = (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        createTask({
            title: `${task.title} (Cópia)`,
            description: task.description,
            status: 'pendente',
            priority: task.priority || 'media',
            assignee: task.assignee,
            assigned_to_id: task.assigned_to_id,
            list_id: task.list_id,
            due_date: task.due_date,
            due_time: task.due_time,
            category: task.category,
            recurrence: task.recurrence
        });
    };

    const handleDeleteClick = (taskId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            deleteTask(taskId);
        }
    };

    const toggleCollapse = (listId: string) => {
        setCollapsed(prev => ({ ...prev, [listId]: !prev[listId] }));
    };

    const handleCheckboxClick = (e: React.MouseEvent, taskId: string, listId: string | null) => {
        e.stopPropagation();
        if (e.shiftKey && lastSelectedTaskId) {
            const listTasks = getTasksByList(listId).map(t => t.id);
            const start = listTasks.indexOf(lastSelectedTaskId);
            const end = listTasks.indexOf(taskId);
            if (start !== -1 && end !== -1) {
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                const idsToSelect = listTasks.slice(min, max + 1);

                const isDeselecting = selectedTasks.includes(taskId);
                if (onSelectBatch) {
                    onSelectBatch(idsToSelect, !isDeselecting);
                }
            }
        } else {
            onToggleSelectTask(taskId);
        }
        setLastSelectedTaskId(taskId);
    };

    // Combine taskLists and a "Sem Lista" column
    const columns = [
        ...taskLists.map(l => ({ id: l.id, title: l.name, color: l.color, is_locked: l.is_locked })),
        { id: "none", title: "Sem Lista", color: "#94a3b8", is_locked: false }
    ].sort((a, b) => getTasksByList(b.id).length - getTasksByList(a.id).length);

    const filteredColumns = columns.filter(col =>
        (col.title || "").toLowerCase().includes(listSearch.toLowerCase())
    );

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando listas...</div>;

    function CheckCircle2Icon(props: React.SVGProps<SVGSVGElement>) {
        return (
            <svg
                {...props}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
            </svg>
        );
    }

    const renderSortIcon = (column: SortColumn) => {
        if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
        return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    return (
        <div className="pb-20 space-y-4 w-full max-w-[1400px] mx-auto xl:px-4">
            {selectedTasks.length > 0 && onOpenBulkEdit && (
                <div className="flex justify-end animate-in fade-in slide-in-from-top-1">
                    <Button variant="secondary" onClick={onOpenBulkEdit} className="gap-2 shadow-sm border bg-card hover:bg-muted font-semibold text-primary">
                        <Layers className="w-4 h-4" />
                        Editar Lote ({selectedTasks.length} {selectedTasks.length === 1 ? 'tarefa' : 'tarefas'})
                    </Button>
                </div>
            )}
            <div className="flex items-center justify-between xl:mt-4 mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <List className="w-5 h-5" /> Tarefas por Lista
                </h2>
                <div className="flex items-center gap-4">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar listas..."
                            value={listSearch}
                            onChange={(e) => setListSearch(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsAddListOpen(true)} className="gap-2 shrink-0">
                        <Plus className="w-4 h-4" /> Criar Lista
                    </Button>
                </div>
            </div>

            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                {filteredColumns.map(col => {
                    const colTasks = getTasksByList(col.id);
                    if (col.id === "none" && colTasks.length === 0) return null;

                    const isCollapsed = collapsed[col.id] ?? false;

                    return (
                        <div key={col.id} className="border rounded-xl bg-card overflow-hidden shadow-sm">
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors border-b"
                                onClick={() => toggleCollapse(col.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground/60" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/60" />}
                                    <div onClick={e => e.stopPropagation()} className="flex items-center mr-1">
                                        <Checkbox
                                            checked={colTasks.length > 0 && colTasks.every(t => selectedTasks.includes(t.id))}
                                            onCheckedChange={(c) => {
                                                if (onSelectBatch) {
                                                    onSelectBatch(colTasks.map(t => t.id), !!c);
                                                }
                                            }}
                                            className="w-4 h-4"
                                            title="Selecionar todas desta lista"
                                        />
                                    </div>
                                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: col.color }} />
                                    <h3 className="font-semibold text-[15px] flex items-center gap-2">
                                        {col.title}
                                        {col.is_locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" title="Lista Privada" />}
                                    </h3>
                                    <button
                                        className="w-5 h-5 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors ml-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onCreateTaskForList) onCreateTaskForList(col.id === "none" ? "none" : col.id);
                                        }}
                                        title={`Criar tarefa em ${col.title}`}
                                    >
                                        <Plus className="w-3 h-3" strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{colTasks.length} tarefas pendentes</span>
                                </div>
                            </div>

                            {!isCollapsed && (
                                <>
                                    {colTasks.length === 0 ? (
                                        <div className="p-4 text-sm text-muted-foreground italic text-center">
                                            Nenhuma tarefa nesta lista
                                        </div>
                                    ) : (
                                        <div className="bg-background">
                                            <div className="grid grid-cols-12 gap-4 p-3 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                <div className="col-span-12 sm:col-span-5 flex items-center gap-1 select-none cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('title')}>Tarefa {renderSortIcon('title')}</div>
                                                <div className="col-span-12 sm:col-span-2 hidden sm:flex items-center gap-1 select-none cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('assignee')}>Gestor {renderSortIcon('assignee')}</div>
                                                <div className="col-span-3 sm:col-span-1 hidden sm:flex justify-center items-center gap-1 select-none cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('priority')}>Prioridade {renderSortIcon('priority')}</div>
                                                <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-1 select-none cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('due_date')}>Prazo {renderSortIcon('due_date')}</div>
                                                <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-1 select-none cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('status')}>Status {renderSortIcon('status')}</div>
                                            </div>
                                            <div className="divide-y">
                                                {colTasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={`group grid grid-cols-12 gap-4 p-3 transition-colors items-center cursor-pointer ${task.completed ? "bg-emerald-50/50 dark:bg-emerald-950/20 relative before:absolute before:inset-0 before:border-b before:border-emerald-500/20 before:pointer-events-none" : "hover:bg-muted/50 border-b border-transparent"}`}
                                                        onClick={() => onTaskClick(task.id)}
                                                    >
                                                        <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0">
                                                            <div onClick={e => handleCheckboxClick(e, task.id, col.id === 'none' ? null : col.id)} className="shrink-0 pl-1 mt-0.5 sm:mt-0" title="Segure Shift para selecionar múltiplos">
                                                                <Checkbox
                                                                    checked={selectedTasks.includes(task.id)}
                                                                    className="w-4 h-4 rounded-sm border-muted-foreground/30 data-[state=checked]:border-primary pointer-events-none"
                                                                />
                                                            </div>
                                                            <div onClick={e => e.stopPropagation()} className="shrink-0">
                                                                <Checkbox
                                                                    checked={task.completed}
                                                                    onCheckedChange={c => toggleComplete({ id: task.id, completed: c as boolean })}
                                                                    className={`w-5 h-5 transition-all rounded-[4px] ${task.completed ? "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white data-[state=checked]:border-emerald-500" : "border-2 border-muted-foreground/30 hover:border-muted-foreground/50"}`}
                                                                    title="Marcar como concluída"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col min-w-0 flex-1 ml-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`text-[13px] font-medium hover:underline truncate ${task.completed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                                                        {task.title}
                                                                    </p>
                                                                    {task.cliente_id && (
                                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 gap-1 shrink-0 font-normal">
                                                                            <Building2 className="w-2.5 h-2.5" />
                                                                            <span className="truncate max-w-[80px]">{clientes.find(c => c.id === task.cliente_id)?.nome || "Cliente"}</span>
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {task.assignee && (
                                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                                        {(() => {
                                                                            const colab = colaboradores.find(c => c.nome === task.assignee);
                                                                            return colab?.avatar_url ? (
                                                                                <img src={colab.avatar_url} alt={task.assignee} className="w-4 h-4 rounded-full object-cover border" title={task.assignee} />
                                                                            ) : (
                                                                                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold" title={task.assignee}>
                                                                                    {(task.assignee || "?").charAt(0).toUpperCase()}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                        <span className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">
                                                                            RESP: {task.assignee}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Mobile elements */}
                                                            <div className="sm:hidden flex flex-col items-end shrink-0 gap-1 text-xs">
                                                                {task.due_date && <span className={`${isOverdue(task.due_date, task.completed) ? "text-destructive" : "text-muted-foreground"}`}>{format(new Date(`${task.due_date}T12:00:00`), "dd/MM")}</span>}
                                                                {task.priority && !task.completed && <Badge variant="outline" className="text-[9px] px-1 h-4 scale-90">{PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}</Badge>}
                                                            </div>
                                                        </div>

                                                        <div className="col-span-12 sm:col-span-2 hidden sm:flex items-center gap-2 min-w-0" onClick={e => e.stopPropagation()}>
                                                            <Select
                                                                value={task.assignee || "unassigned"}
                                                                onValueChange={(val) => {
                                                                    const newAssignee = val === "unassigned" ? null : val;
                                                                    if (newAssignee) {
                                                                        const colab = colaboradores.find(c => c.nome === newAssignee);
                                                                        updateTask({ id: task.id, updates: { assignee: newAssignee, assigned_to_id: colab?.user_id || undefined } });
                                                                    } else {
                                                                        updateTask({ id: task.id, updates: { assignee: null, assigned_to_id: null } });
                                                                    }
                                                                }}
                                                            >
                                                                <SelectTrigger className="w-full h-auto p-0 border-0 bg-transparent text-[12px] font-medium text-muted-foreground gap-2 shadow-none hover:text-foreground focus:ring-0">
                                                                    <SelectValue>
                                                                        <div className="flex items-center gap-1 min-w-0">
                                                                            {task.assignee ? (
                                                                                <>
                                                                                    {(() => {
                                                                                        const colab = colaboradores.find(c => c.nome === task.assignee);
                                                                                        return colab?.avatar_url ? (
                                                                                            <img src={colab.avatar_url} alt={task.assignee} className="w-5 h-5 rounded-full object-cover border" title={task.assignee} />
                                                                                        ) : (
                                                                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold" title={task.assignee}>
                                                                                                {(task.assignee || "?").charAt(0).toUpperCase()}
                                                                                            </span>
                                                                                        );
                                                                                    })()}
                                                                                    <span className="truncate" title={task.assignee}>{task.assignee}</span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-muted-foreground/30">-</span>
                                                                            )}
                                                                        </div>
                                                                    </SelectValue>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="unassigned">Sem responsável</SelectItem>
                                                                    {colaboradores.map(c => (
                                                                        <SelectItem key={c.user_id} value={c.nome}>{c.nome}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="col-span-3 sm:col-span-1 hidden sm:flex justify-center" onClick={e => e.stopPropagation()}>
                                                            <Select
                                                                value={task.priority || "media"}
                                                                onValueChange={(val) => updateTask({ id: task.id, updates: { priority: val as TaskPriority } })}
                                                            >
                                                                <SelectTrigger className={`h-[22px] px-2 border-0 shadow-sm rounded-full text-[10px] font-medium justify-center focus:ring-0 ${task.priority === 'alta' ? 'bg-rose-500 hover:bg-rose-600 text-white' : task.priority === 'media' ? 'bg-amber-500 hover:bg-amber-600 text-white' : task.priority === 'baixa' ? 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' : 'bg-transparent border border-muted hover:bg-muted text-foreground'}`}>
                                                                    <SelectValue>
                                                                        {task.priority ? PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] : "Média"}
                                                                    </SelectValue>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="baixa">{PRIORITY_LABELS.baixa}</SelectItem>
                                                                    <SelectItem value="media">{PRIORITY_LABELS.media}</SelectItem>
                                                                    <SelectItem value="alta">{PRIORITY_LABELS.alta}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center" onClick={e => e.stopPropagation()}>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <div className={`text-[13px] px-2 py-1 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${task.due_date ? (isOverdue(task.due_date, task.completed) ? "text-destructive font-medium" : "text-muted-foreground") : "text-muted-foreground/50"}`}>
                                                                        {task.due_date ? format(new Date(`${task.due_date}T12:00:00`), "dd/MM/yyyy") : 'Definir'}
                                                                    </div>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="center">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={task.due_date ? new Date(`${task.due_date}T12:00:00`) : undefined}
                                                                        onSelect={(date) => {
                                                                            updateTask({ id: task.id, updates: { due_date: date ? format(date, "yyyy-MM-dd") : null } });
                                                                        }}
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>

                                                        <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-3 relative">
                                                            <Badge variant="outline" className={`capitalize text-[10px] w-[76px] justify-center shadow-sm h-[22px] px-0 ${task.completed ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60" : "bg-muted/40 text-muted-foreground"}`}>
                                                                {task.completed ? "Concluída" : "Pendente"}
                                                            </Badge>
                                                            <div className="absolute right-[-14px] opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div onClick={e => e.stopPropagation()}>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted/60">
                                                                                <MoreVertical className="w-4 h-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuItem onClick={(e) => handleDuplicateTask(task, e)}>
                                                                                <Copy className="w-4 h-4 mr-2" /> Duplicar Tarefa
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={(e) => handleDeleteClick(task.id, e)} className="text-red-600 focus:bg-red-50">
                                                                                <Trash2 className="w-4 h-4 mr-2" /> Excluir Tarefa
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <Dialog open={isAddListOpen} onOpenChange={setIsAddListOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Lista</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome da Lista</Label>
                            <Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Ex: Onboarding ou Sprint 1" />
                        </div>
                        <div className="space-y-2">
                            <Label>Cor</Label>
                            <div className="flex gap-2 flex-wrap">
                                {["#3b82f6", "#10b981", "#eab308", "#ef4444", "#f97316", "#8b5cf6", "#ec4899", "#64748b"].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewListColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 ${newListColor === color ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex flex-col gap-3 rounded-lg border p-4">
                                <div className="flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base flex items-center gap-2">
                                            <Lock className="w-4 h-4" />
                                            Lista Privada
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Somente administradores e pessoas selecionadas verão esta lista.
                                        </p>
                                    </div>
                                    <Checkbox
                                        checked={newListPrivate}
                                        onCheckedChange={(c) => setNewListPrivate(!!c)}
                                    />
                                </div>
                                {newListPrivate && colaboradores.length > 0 && (
                                    <div className="pt-3 border-t mt-1">
                                        <Label className="mb-3 block text-sm font-medium">Permitir visualização para:</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {colaboradores.map(c => (
                                                <div key={c.user_id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`colab-${c.user_id}`}
                                                        checked={newListAllowedUsers.includes(c.user_id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setNewListAllowedUsers(prev => [...prev, c.user_id]);
                                                            } else {
                                                                setNewListAllowedUsers(prev => prev.filter(id => id !== c.user_id));
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={`colab-${c.user_id}`} className="text-sm font-normal cursor-pointer flex items-center gap-2 truncate">
                                                        {c.avatar_url ? (
                                                            <img src={c.avatar_url} alt={c.nome} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                {(c.nome || "?").charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="truncate" title={c.nome || ""}>{c.nome || "Sem Nome"}</span>
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddListOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateList} disabled={!newListName.trim()}>Criar Lista</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
