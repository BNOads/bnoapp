import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { List, Kanban, Users, BarChart3, Plus, Search, Layers, Grid2X2, CalendarIcon, AlertCircle, CheckCircle2, Flag } from "lucide-react";

import { useTasks, TaskFilters } from "@/hooks/useTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { TarefasList } from "@/components/tasks/views/TarefasList";
import { TaskKanban } from "@/components/tasks/views/TaskKanban";
import { TasksByPersonView } from "@/components/tasks/views/TasksByPersonView";
import { AdminTasksPanel } from "@/components/tasks/views/AdminTasksPanel";
import { exportTasksToPDF } from "@/lib/exportTasksPdf";
import { PRIORITY_LABELS } from "@/types/tasks";

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
    const [activeMainTab, setActiveMainTab] = useState<"minhas" | "time" | "usuario">("minhas");
    const [hideCompleted, setHideCompleted] = useState(false);

    // Selection for ByPerson view mainly, but could be global
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

    // Modals state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createDefaultAssignee, setCreateDefaultAssignee] = useState<string>("unassigned");
    const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    // Detail Dialog state
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Prepare payload dynamically for useTasks to route "Minhas" cleanly
    const appliedFilters = { ...filters };
    if (activeMainTab === "minhas") {
        appliedFilters.assignee = currentUser?.nome || currentUser?.email || "";
    } else if (filters.assignee && filters.assignee !== "all") {
        // use specific assignee if selected
    } else {
        appliedFilters.assignee = "all";
    }

    const { data: tasks = [], isLoading } = useTasks(appliedFilters);

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

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando tarefas...</div>;
        }

        if (activeMainTab === "minhas") {
            const filteredTasks = hideCompleted ? tasks.filter(t => !t.completed) : tasks;
            return <TarefasList tasks={filteredTasks} onTaskClick={handleTaskClick} />;
        }

        const ByPersonBase = (
            <TasksByPersonView
                tasks={tasks}
                onTaskClick={handleTaskClick}
                selectedTasks={selectedTasks}
                onToggleSelectTask={handleToggleSelectTask}
                onCreateTaskForPerson={(person) => {
                    setCreateDefaultAssignee(person);
                    setIsCreateOpen(true);
                }}
                gridLayout={activeMainTab === "usuario"}
                hideCompleted={hideCompleted}
            />
        );

        if (activeMainTab === "time") {
            return ByPersonBase;
        }

        if (activeMainTab === "usuario") {
            return (
                <div className="space-y-6 w-full max-w-[1400px] mx-auto xl:px-4">
                    {isAdmin && <AdminTasksPanel tasks={tasks} />}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Users className="w-5 h-5" /> Tarefas por Responsável
                            </h2>
                        </div>
                        {ByPersonBase}
                    </div>
                </div>
            );
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
                        {selectedTasks.length > 0 && (activeMainTab === "time" || activeMainTab === "usuario") && (
                            <Button variant="secondary" onClick={() => setIsBulkEditOpen(true)} className="gap-2">
                                <Layers className="w-4 h-4" />
                                Editar Lote ({selectedTasks.length})
                            </Button>
                        )}

                        <label className="text-sm font-medium flex items-center gap-2 mr-2 cursor-pointer select-none text-muted-foreground bg-muted p-1.5 px-3 rounded-md border">
                            <input
                                type="checkbox"
                                checked={hideCompleted}
                                onChange={(e) => setHideCompleted(e.target.checked)}
                                className="rounded border-gray-300 w-4 h-4"
                            />
                            Ocultar concluídas
                        </label>

                        <Button variant="outline" onClick={() => exportTasksToPDF(tasks)} className="gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Exportar PDF
                        </Button>

                        <div className="flex items-center bg-muted/50 p-1 rounded-md border text-sm font-medium mx-2">
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
                                onClick={() => setActiveMainTab("usuario")}
                                className={`px-4 py-1.5 rounded-sm flex items-center gap-2 transition-colors ${activeMainTab === "usuario" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                            >
                                <Grid2X2 className="w-4 h-4" />
                                Por Usuário
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
                                className="pl-9 h-10 w-full"
                            />
                        </div>

                        <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v }))}>
                            <SelectTrigger className="w-[140px] h-10">
                                <Flag className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Prioridade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="alta">{PRIORITY_LABELS.alta}</SelectItem>
                                <SelectItem value="media">{PRIORITY_LABELS.media}</SelectItem>
                                <SelectItem value="baixa">{PRIORITY_LABELS.baixa}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                            <SelectTrigger className="w-[140px] h-10">
                                <List className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="pendentes">Pendentes</SelectItem>
                                <SelectItem value="concluidas">Concluídas</SelectItem>
                            </SelectContent>
                        </Select>

                        {activeMainTab !== "minhas" && (
                            <Select value={filters.assignee} onValueChange={(v) => setFilters(f => ({ ...f, assignee: v }))}>
                                <SelectTrigger className="w-[140px] h-10">
                                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Responsável" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        <Select value={filters.recurrence} onValueChange={(v) => setFilters(f => ({ ...f, recurrence: v }))}>
                            <SelectTrigger className="w-[140px] h-10">
                                <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
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

                        <Select value={filters.date} onValueChange={(v) => setFilters(f => ({ ...f, date: v }))}>
                            <SelectTrigger className="w-[180px] h-10">
                                <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Datas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as datas</SelectItem>
                                <SelectItem value="hoje">Hoje</SelectItem>
                                <SelectItem value="semana">Esta semana</SelectItem>
                                <SelectItem value="mes">Este mês</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <span className="w-2 h-2 rounded-full border border-current opacity-50"></span>
                            <span className="text-sm font-medium">Pendentes</span>
                        </div>
                        <span className="text-4xl font-bold">{pendingCount}</span>
                    </div>
                    <div className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground opacity-50" />
                            <span className="text-sm font-medium">Concluídas</span>
                        </div>
                        <span className="text-4xl font-bold">{completedCount}</span>
                    </div>
                    <div className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden border-rose-100 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20">
                        <div className="flex items-center gap-2 text-destructive mb-1">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Atrasadas</span>
                        </div>
                        <span className="text-4xl font-bold text-foreground">{overdueCount}</span>
                    </div>
                    <div className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Flag className="w-4 h-4 text-rose-500 opacity-60" />
                            <span className="text-sm font-medium">Alta prioridade</span>
                        </div>
                        <span className="text-4xl font-bold">{highPriorityCount}</span>
                    </div>
                </div>
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

            <CreateTaskModal
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                defaultAssignee={createDefaultAssignee}
            />
        </div >
    );
}
