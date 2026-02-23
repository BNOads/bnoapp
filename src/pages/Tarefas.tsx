import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { List, Kanban, Users, BarChart3, Plus, Search, Layers, Grid2X2, CalendarIcon, AlertCircle, CheckCircle2, Flag, Filter, ChevronDown, Zap } from "lucide-react";

import { useTasks, TaskFilters } from "@/hooks/useTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";

import { TarefasList } from "@/components/tasks/views/TarefasList";
import { TaskKanban } from "@/components/tasks/views/TaskKanban";
import { TasksByPersonView } from "@/components/tasks/views/TasksByPersonView";
import { TasksByListView } from "@/components/tasks/views/TasksByListView";
import { AdminTasksPanel } from "@/components/tasks/views/AdminTasksPanel";
import { AutomacoesView } from "@/components/tasks/views/AutomacoesView";
import { Task, PRIORITY_LABELS } from "@/types/tasks";
import { isOverdue, isInDateRange, DateRangePreset } from "@/lib/dateUtils";

import { BulkTaskModal } from "@/components/tasks/modals/BulkTaskModal";
import { BulkEditModal } from "@/components/tasks/modals/BulkEditModal";
import { CreateTaskModal } from "@/components/tasks/modals/CreateTaskModal";
import { TaskDetailDialog } from "@/components/tasks/details/TaskDetailDialog";

export default function Tarefas() {
    const { userData: currentUser } = useCurrentUser();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

    const [filters, setFilters] = useState<TaskFilters>({
        search: "",
        priority: "all",
        category: "all",
        assignee: "all",
        recurrence: "all",
        status: "all",
        date: "all"
    });
    const [activeMainTab, setActiveMainTab] = useState<"minhas" | "time" | "listas" | "automacoes">("minhas");
    const [timeViewType, setTimeViewType] = useState<"tabela" | "kanban">("tabela");
    const [minhasViewType, setMinhasViewType] = useState<"tabela" | "kanban">("tabela");
    const [minhasAba, setMinhasAba] = useState<"atribuidas" | "criadas">("atribuidas");
    const [hideCompleted, setHideCompleted] = useState(false);

    // Selection for ByPerson view mainly, but could be global
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

    // Modals state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createDefaultAssignee, setCreateDefaultAssignee] = useState<string | null>(null);
    const [createDefaultListId, setCreateDefaultListId] = useState<string | null>(null);
    const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);

    const [kpiPopupFilter, setKpiPopupFilter] = useState<{ title: string; filterFn: (t: Task) => boolean } | null>(null);

    const [colaboradores, setColaboradores] = useState<{ nome: string }[]>([]);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    // Detail Dialog state
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    React.useEffect(() => {
        supabase.from("colaboradores")
            .select("nome")
            .then(({ data }) => {
                if (data) setColaboradores(data);
            });
    }, []);

    // Prepare payload dynamically for useTasks to route "Minhas" cleanly
    const appliedFilters = { ...filters };
    if (activeMainTab === "minhas") {
        if (minhasAba === "atribuidas") {
            appliedFilters.assignee = currentUser?.nome || currentUser?.email || "";
            delete appliedFilters.created_by_id;
        } else if (minhasAba === "criadas") {
            appliedFilters.created_by_id = currentUser?.user_id || currentUser?.id || "";
            delete appliedFilters.assignee;
        }
    } else if (filters.assignee && filters.assignee !== "all") {
        // use specific assignee if selected
    } else {
    }

    const { data: rawTasks = [], isLoading } = useTasks(appliedFilters);

    // Apply the local date filter
    const tasks = React.useMemo(() => {
        if (!filters.date || filters.date === "all") return rawTasks;

        let preset: DateRangePreset = "all";
        if (filters.date === "hoje") preset = "today";
        if (filters.date === "semana") preset = "week";
        if (filters.date === "mes") preset = "month";
        if (filters.date === "atrasadas") preset = "overdue";
        if (filters.date !== "all" && filters.date !== "hoje" && filters.date !== "semana" && filters.date !== "mes" && filters.date !== "atrasadas") {
            preset = "custom";
        }

        return rawTasks.filter(task => {
            if (preset === "custom") {
                return isInDateRange(task.due_date, preset, task.completed, new Date(`${filters.date}T12:00:00`), new Date(`${filters.date}T12:00:00`));
            }
            return isInDateRange(task.due_date, preset, task.completed);
        });
    }, [rawTasks, filters.date]);

    const pendingCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;
    const overdueCount = tasks.filter(t => !t.completed && t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length; // naive isOverdue inline
    const highPriorityCount = tasks.filter(t => !t.completed && t.priority === "alta").length;

    const handleTaskClick = (id: string) => {
        setSelectedTaskId(id);
        setIsDetailOpen(true);
    };

    const handleToggleSelectTask = (id: string) => {
        setSelectedTasks(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleSelectBatch = (ids: string[], select: boolean) => {
        if (select) {
            setSelectedTasks(prev => Array.from(new Set([...prev, ...ids])));
        } else {
            setSelectedTasks(prev => prev.filter(id => !ids.includes(id)));
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando tarefas...</div>;
        }

        if (activeMainTab === "minhas") {
            const filteredTasks = hideCompleted ? tasks.filter(t => !t.completed) : tasks;
            return (
                <div className="space-y-6 w-full max-w-[1400px] mx-auto xl:px-4">
                    <div className="mt-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between xl:justify-start gap-4 mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 mr-4">
                                <List className="w-5 h-5 hidden sm:block" /> Minhas Tarefas
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center bg-muted/50 p-1 rounded-md border text-sm font-medium">
                                    <button
                                        onClick={() => setMinhasAba("atribuidas")}
                                        className={`px-3 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${minhasAba === "atribuidas" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                                    >
                                        Atribuídas a mim
                                    </button>
                                    <button
                                        onClick={() => setMinhasAba("criadas")}
                                        className={`px-3 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${minhasAba === "criadas" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                                    >
                                        Criadas por mim
                                    </button>
                                </div>
                                <div className="flex items-center bg-muted/50 p-1 rounded-md border text-sm font-medium">
                                    <button
                                        onClick={() => setMinhasViewType("tabela")}
                                        className={`px-3 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${minhasViewType === "tabela" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                                    >
                                        <List className="w-4 h-4" />
                                        Lista
                                    </button>
                                    <button
                                        onClick={() => setMinhasViewType("kanban")}
                                        className={`px-3 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${minhasViewType === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                                    >
                                        <Grid2X2 className="w-4 h-4" />
                                        Kanban
                                    </button>
                                </div>
                            </div>
                        </div>
                        {selectedTasks.length > 0 && minhasViewType === "tabela" && (
                            <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-top-1">
                                <Button variant="secondary" onClick={() => setIsBulkEditOpen(true)} className="gap-2 shadow-sm border bg-card hover:bg-muted font-semibold text-primary">
                                    <Layers className="w-4 h-4" />
                                    Editar Lote ({selectedTasks.length} {selectedTasks.length === 1 ? 'tarefa' : 'tarefas'})
                                </Button>
                            </div>
                        )}
                        {minhasViewType === "kanban" ? (
                            <TaskKanban tasks={filteredTasks} onTaskClick={handleTaskClick} />
                        ) : (
                            <TarefasList
                                tasks={filteredTasks}
                                onTaskClick={handleTaskClick}
                                selectedTasks={selectedTasks}
                                onToggleSelectTask={handleToggleSelectTask}
                                onSelectBatch={handleSelectBatch}
                            />
                        )}
                    </div>
                </div>
            );
        }

        const ByPersonBase = (
            <TasksByPersonView
                tasks={tasks}
                onTaskClick={handleTaskClick}
                selectedTasks={selectedTasks}
                onToggleSelectTask={handleToggleSelectTask}
                onSelectBatch={handleSelectBatch}
                onCreateTaskForPerson={(person) => {
                    setCreateDefaultAssignee(person);
                    setIsCreateOpen(true);
                }}
                onOpenBulkEdit={() => setIsBulkEditOpen(true)}
                gridLayout={activeMainTab === "usuario"}
                hideCompleted={hideCompleted}
            />
        );

        if (activeMainTab === "listas") {
            return (
                <TasksByListView
                    tasks={tasks}
                    onTaskClick={handleTaskClick}
                    selectedTasks={selectedTasks}
                    onToggleSelectTask={handleToggleSelectTask}
                    onSelectBatch={handleSelectBatch}
                    isAdmin={isAdmin}
                    hideCompleted={hideCompleted}
                    onCreateTaskForList={(listId) => {
                        setCreateDefaultAssignee("unassigned");
                        setCreateDefaultListId(listId);
                        setIsCreateOpen(true);
                    }}
                    onOpenBulkEdit={() => setIsBulkEditOpen(true)}
                />
            );
        }

        if (activeMainTab === "time") {
            return (
                <div className="space-y-6 w-full max-w-[1400px] mx-auto xl:px-4">
                    {timeViewType === "kanban" && isAdmin && <AdminTasksPanel tasks={tasks} />}
                    <div className={timeViewType === "kanban" ? "mt-8" : "mt-4"}>
                        <div className="flex items-center gap-4 mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Users className="w-5 h-5" /> Tarefas por Responsável
                            </h2>
                            <div className="flex items-center bg-muted/50 p-1 rounded-md border text-sm font-medium">
                                <button
                                    onClick={() => setTimeViewType("tabela")}
                                    className={`px-3 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${timeViewType === "tabela" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                                >
                                    <List className="w-4 h-4" />
                                    Tabela
                                </button>
                                <button
                                    onClick={() => setTimeViewType("kanban")}
                                    className={`px-3 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${timeViewType === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                                >
                                    <Grid2X2 className="w-4 h-4" />
                                    Agrupado
                                </button>
                            </div>
                        </div>
                        <TasksByPersonView
                            tasks={tasks}
                            onTaskClick={handleTaskClick}
                            selectedTasks={selectedTasks}
                            onToggleSelectTask={handleToggleSelectTask}
                            onSelectBatch={handleSelectBatch}
                            onCreateTaskForPerson={(person) => {
                                setCreateDefaultAssignee(person);
                                setIsCreateOpen(true);
                            }}
                            gridLayout={timeViewType === "kanban"}
                            hideCompleted={hideCompleted}
                        />
                    </div>
                </div>
            );
        }

        if (activeMainTab === "automacoes") {
            return <AutomacoesView />;
        }

        return null;
    };

    return (
        <div className="flex flex-col min-h-screen bg-background pb-20">
            <div className="p-6 pb-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Gerencie suas atividades e da sua equipe
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">

                        <div className="flex flex-wrap items-center bg-muted/50 p-1 rounded-md border text-sm font-medium mx-2 gap-1">
                            <button
                                onClick={() => setActiveMainTab("minhas")}
                                className={`px-4 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${activeMainTab === "minhas" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                            >
                                <List className="w-4 h-4" />
                                Minhas
                            </button>
                            <button
                                onClick={() => setActiveMainTab("time")}
                                className={`px-4 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${activeMainTab === "time" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                            >
                                <Users className="w-4 h-4" />
                                Time
                            </button>
                            <button
                                onClick={() => setActiveMainTab("listas")}
                                className={`px-4 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${activeMainTab === "listas" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                            >
                                <Kanban className="w-4 h-4" />
                                Listas
                            </button>
                            <button
                                onClick={() => setActiveMainTab("automacoes")}
                                className={`px-4 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${activeMainTab === "automacoes" ? "bg-yellow-500 text-white shadow-sm" : "text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-600"}`}
                            >
                                <Zap className="w-4 h-4" />
                                Automações
                            </button>
                        </div>

                        <Button variant="outline" onClick={() => setIsBulkCreateOpen(true)} className="gap-2">
                            <Layers className="w-4 h-4" />
                            Criação em Lote
                        </Button>

                        <Button onClick={() => { setCreateDefaultAssignee("unassigned"); setIsCreateOpen(true); }} className="bg-foreground text-background hover:bg-foreground/90 gap-2">
                            <Plus className="w-4 h-4" />
                            Nova Tarefa
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center mb-6">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:flex-1">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar tarefas..."
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                className="pl-9 h-10 w-full bg-background border-border/50 rounded-xl shadow-sm text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full lg:w-auto">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-10 bg-background border-border/50 rounded-xl shadow-sm gap-2 font-medium w-full lg:w-auto">
                                        <Filter className="h-4 w-4 text-slate-500" />
                                        Filtros
                                        <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-[300px] sm:w-[500px] p-4 rounded-2xl shadow-xl">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-2 border-b">
                                            <h4 className="font-semibold text-sm">Filtros de Tarefas</h4>
                                            <Button variant="ghost" size="sm" onClick={() => setFilters({ search: filters.search, priority: "all", category: "all", assignee: "all", recurrence: "all", status: "all", date: "all" })} className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                                                Limpar Filtros
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                                                <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v }))}>
                                                    <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                                                        <SelectValue placeholder="Prioridade" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todas</SelectItem>
                                                        <SelectItem value="alta">{PRIORITY_LABELS.alta}</SelectItem>
                                                        <SelectItem value="media">{PRIORITY_LABELS.media}</SelectItem>
                                                        <SelectItem value="baixa">{PRIORITY_LABELS.baixa}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Status</label>
                                                <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                                                    <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todas</SelectItem>
                                                        <SelectItem value="pendentes">Pendentes</SelectItem>
                                                        <SelectItem value="concluidas">Concluídas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {activeMainTab !== "minhas" && (
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                                                    <Select value={filters.assignee} onValueChange={(v) => setFilters(f => ({ ...f, assignee: v }))}>
                                                        <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                                                            <SelectValue placeholder="Responsável" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Todos</SelectItem>
                                                            {colaboradores.map(c => (
                                                                <SelectItem key={c.nome} value={c.nome}>{c.nome}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Recorrência</label>
                                                <Select value={filters.recurrence} onValueChange={(v) => setFilters(f => ({ ...f, recurrence: v }))}>
                                                    <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                                                        <SelectValue placeholder="Recorrência" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todas</SelectItem>
                                                        <SelectItem value="none">Sem repetição</SelectItem>
                                                        <SelectItem value="diario">Diária</SelectItem>
                                                        <SelectItem value="semanal">Semanal</SelectItem>
                                                        <SelectItem value="mensal">Mensal</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground">Data</label>
                                                <Select value={filters.date} onValueChange={(v) => {
                                                    if (v !== "custom") setFilters(f => ({ ...f, date: v }));
                                                }}>
                                                    <SelectTrigger className="w-full h-9 bg-background border-border/50 rounded-lg shadow-sm text-sm font-medium">
                                                        <SelectValue placeholder="Datas" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todas as datas</SelectItem>
                                                        <SelectItem value="hoje">Hoje</SelectItem>
                                                        <SelectItem value="semana">Esta semana</SelectItem>
                                                        <SelectItem value="mes">Este mês</SelectItem>
                                                        <div className="px-2 py-1 flex items-center gap-2 border-t mt-1">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="outline" className="w-full justify-start text-left font-normal h-8 px-2 text-xs">
                                                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                                                        <span>Data Personalizada</span>
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={filters.date !== "all" && filters.date !== "hoje" && filters.date !== "semana" && filters.date !== "mes" ? new Date(`${filters.date}T12:00:00`) : undefined}
                                                                        onSelect={(date) => {
                                                                            if (date) {
                                                                                setFilters(f => ({ ...f, date: date.toISOString().split('T')[0] }));
                                                                            }
                                                                        }}
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                        {filters.date !== "all" && filters.date !== "hoje" && filters.date !== "semana" && filters.date !== "mes" && (
                                                            <SelectItem value={filters.date}>{new Date(`${filters.date}T12:00:00`).toLocaleDateString('pt-BR')}</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <button
                            onClick={() => setHideCompleted(!hideCompleted)}
                            className={`text-sm font-medium flex items-center justify-center gap-2 transition-colors h-10 px-4 rounded-md shrink-0 lg:ml-auto ${hideCompleted
                                ? "bg-muted text-muted-foreground hover:bg-muted/80 border"
                                : "bg-green-500 hover:bg-green-600 text-white shadow-sm"
                                }`}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {hideCompleted ? "Mostrar concluídas" : "Ocultar concluídas"}
                        </button>
                    </div>
                </div>

                {activeMainTab !== "automacoes" && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <button
                            onClick={() => setKpiPopupFilter({ title: 'Tarefas Pendentes', filterFn: (t) => !t.completed })}
                            className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden text-left hover:border-primary/50 transition-colors cursor-pointer text-foreground"
                        >
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <span className="w-2 h-2 rounded-full border border-current opacity-50"></span>
                                <span className="text-sm font-medium">Pendentes</span>
                            </div>
                            <span className="text-4xl font-bold">{pendingCount}</span>
                        </button>
                        <button
                            onClick={() => setKpiPopupFilter({ title: 'Tarefas Concluídas', filterFn: (t) => t.completed })}
                            className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden text-left hover:border-primary/50 transition-colors cursor-pointer text-foreground"
                        >
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <CheckCircle2 className="w-4 h-4 text-muted-foreground opacity-50" />
                                <span className="text-sm font-medium">Concluídas</span>
                            </div>
                            <span className="text-4xl font-bold">{completedCount}</span>
                        </button>
                        <button
                            onClick={() => setKpiPopupFilter({ title: 'Tarefas Atrasadas', filterFn: (t) => !t.completed && !!t.due_date && isOverdue(t.due_date, false) })}
                            className="p-4 rounded-xl border flex py-6 flex-col justify-center relative overflow-hidden border-rose-100 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 text-left hover:border-rose-300 dark:hover:border-rose-700 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-2 text-destructive mb-1">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Atrasadas</span>
                            </div>
                            <span className="text-4xl font-bold text-foreground">{overdueCount}</span>
                        </button>
                        <button
                            onClick={() => setKpiPopupFilter({ title: 'Alta Prioridade', filterFn: (t) => !t.completed && t.priority === 'alta' })}
                            className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden text-left hover:border-primary/50 transition-colors cursor-pointer text-foreground"
                        >
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Flag className="w-4 h-4 text-rose-500 opacity-60" />
                                <span className="text-sm font-medium">Alta prioridade</span>
                            </div>
                            <span className="text-4xl font-bold">{highPriorityCount}</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 bg-slate-50/30 dark:bg-background pt-4 px-6">
                {renderContent()}
            </div>

            <BulkTaskModal
                open={isBulkCreateOpen}
                onOpenChange={setIsBulkCreateOpen}
            />

            <BulkEditModal
                open={isBulkEditOpen}
                onOpenChange={setIsBulkEditOpen}
                selectedTaskIds={selectedTasks}
                onClearSelection={() => setSelectedTasks([])}
            />

            <TaskDetailDialog
                taskId={selectedTaskId}
                open={isDetailOpen && selectedTaskId !== "new"}
                onOpenChange={(open) => {
                    setIsDetailOpen(open);
                    if (!open) setSelectedTaskId(null);
                }}
            />

            <Dialog open={!!kpiPopupFilter} onOpenChange={(open) => !open && setKpiPopupFilter(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{kpiPopupFilter?.title}</DialogTitle>
                        <DialogDescription>Tarefas correspondentes a este indicador baseadas nos seus filtros atuais.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto mt-2 -mx-2 px-2 pb-4">
                        {kpiPopupFilter && (
                            <div className="bg-slate-50/30 dark:bg-background rounded-md">
                                <TarefasList
                                    tasks={tasks.filter(kpiPopupFilter.filterFn)}
                                    onTaskClick={(id) => {
                                        setSelectedTaskId(id);
                                        setIsDetailOpen(true);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <CreateTaskModal
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                defaultAssignee={createDefaultAssignee}
                defaultListId={createDefaultListId}
            />
        </div>
    );
}
