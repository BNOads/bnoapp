import React, { useState, useEffect } from "react";
import { Task, PRIORITY_LABELS } from "@/types/tasks";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToggleTaskComplete, useUpdateTask, useDeleteTask } from "@/hooks/useTaskMutations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MessageSquare, Clock, Plus, Flag, List, ChevronDown, ChevronRight, Trash2, Search } from "lucide-react";
import { isOverdue } from "@/lib/dateUtils";
import { useTaskLists } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/hooks/useTasks";

interface TasksByListViewProps {
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
    isAdmin: boolean;
    onCreateTaskForList?: (listId: string) => void;
}

export function TasksByListView({ tasks, onTaskClick, isAdmin, onCreateTaskForList }: TasksByListViewProps) {
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const { mutate: updateTask } = useUpdateTask(); // adding this back if needed but not strictly necessary to fix unused warning, I'll ignore
    const { mutate: deleteTask } = useDeleteTask();
    const { data: taskLists = [], isLoading } = useTaskLists();
    const queryClient = useQueryClient();

    const [isAddListOpen, setIsAddListOpen] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [newListColor, setNewListColor] = useState("#3b82f6");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [listSearch, setListSearch] = useState("");

    const [colaboradores, setColaboradores] = useState<{ nome: string, avatar_url: string | null }[]>([]);

    useEffect(() => {
        supabase.from("colaboradores")
            .select("nome, avatar_url")
            .then(({ data }) => {
                if (data) setColaboradores(data);
            });
    }, []);

    const getTasksByList = (listId: string | null) => {
        if (listId === "none" || !listId) {
            return tasks.filter(t => !t.list_id && !t.completed);
        }
        return tasks.filter(t => t.list_id === listId && !t.completed);
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        const { error } = await supabase.from("task_lists").insert({
            name: newListName.trim(),
            color: newListColor,
            position: taskLists.length
        });
        if (!error) {
            queryClient.invalidateQueries({ queryKey: taskKeys.taskLists() });
            setIsAddListOpen(false);
            setNewListName("");
        }
    };

    const toggleCollapse = (colId: string) => {
        setCollapsed(prev => ({ ...prev, [colId]: !prev[colId] }));
    };

    // Combine taskLists and a "Sem Lista" column
    const columns = [
        ...taskLists.map(l => ({ id: l.id, title: l.name, color: l.color })),
        { id: "none", title: "Sem Lista", color: "#94a3b8" }
    ].sort((a, b) => getTasksByList(b.id).length - getTasksByList(a.id).length);

    const filteredColumns = columns.filter(col =>
        col.title.toLowerCase().includes(listSearch.toLowerCase())
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

    return (
        <div className="pb-20 space-y-6 w-full max-w-[1400px] mx-auto xl:px-4">
            <div className="flex items-center justify-between mt-8 mb-4">
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
                                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: col.color }} />
                                    <h3 className="font-semibold text-[15px]">{col.title}</h3>
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
                                                <div className="col-span-12 sm:col-span-6 flex items-center gap-1 select-none">Tarefa <span className="opacity-50">↑↓</span></div>
                                                <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-1 select-none">Prioridade <span className="opacity-50">↑↓</span></div>
                                                <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-1 select-none">Prazo <span className="opacity-50">↑</span></div>
                                                <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-1 select-none">Status <span className="opacity-50">↑↓</span></div>
                                            </div>
                                            <div className="divide-y">
                                                {colTasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={`group grid grid-cols-12 gap-4 p-3 transition-colors items-center cursor-pointer hover:bg-muted/50 border-b border-transparent`}
                                                        onClick={() => onTaskClick(task.id)}
                                                    >
                                                        <div className="col-span-12 sm:col-span-6 flex items-center gap-3 min-w-0">
                                                            <div onClick={e => e.stopPropagation()} className="shrink-0 pl-1 mt-0.5 sm:mt-0">
                                                                <Checkbox
                                                                    checked={task.completed}
                                                                    onCheckedChange={c => toggleComplete({ id: task.id, completed: c as boolean })}
                                                                    className="rounded-sm"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[13px] font-medium hover:underline truncate">
                                                                        {task.title}
                                                                    </p>
                                                                </div>
                                                                {task.assignee && (
                                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                                        {(() => {
                                                                            const colab = colaboradores.find(c => c.nome === task.assignee);
                                                                            return colab?.avatar_url ? (
                                                                                <img src={colab.avatar_url} alt={task.assignee} className="w-4 h-4 rounded-full object-cover border" title={task.assignee} />
                                                                            ) : (
                                                                                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold" title={task.assignee}>
                                                                                    {task.assignee.charAt(0).toUpperCase()}
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
                                                                {task.due_date && <span className={`${isOverdue(task.due_date, false) ? "text-destructive" : "text-muted-foreground"}`}>{format(new Date(`${task.due_date}T00:00:00`), "dd/MM")}</span>}
                                                                {task.priority && <Badge variant="outline" className="text-[9px] px-1 h-4 scale-90">{PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}</Badge>}
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2 hidden sm:flex justify-center">
                                                            {task.priority ? (
                                                                <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className={`text-[10px] px-[10px] h-[22px] rounded-full shadow-sm font-medium ${task.priority === 'media' ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : task.priority === 'alta' ? 'bg-rose-500 hover:bg-rose-600 border-transparent text-white' : ''}`}>
                                                                    {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground/30">-</span>
                                                            )}
                                                        </div>

                                                        <div className="col-span-2 hidden sm:flex justify-center">
                                                            {task.due_date ? (
                                                                <span className={`text-[13px] ${isOverdue(task.due_date, false) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                                                    {format(new Date(`${task.due_date}T00:00:00`), "dd/MM/yyyy")}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground/30">-</span>
                                                            )}
                                                        </div>

                                                        <div className="col-span-2 hidden sm:flex justify-center items-center gap-3 relative">
                                                            <Badge variant="outline" className="capitalize text-[10px] w-[76px] justify-center shadow-sm h-[22px] px-0 bg-muted/40 text-muted-foreground">
                                                                Pendente
                                                            </Badge>
                                                            <div className="absolute right-[-10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="w-7 h-7 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                                                                            deleteTask(task.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
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
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddListOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateList} disabled={!newListName.trim()}>Criar Lista</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
