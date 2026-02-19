import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { List, Kanban, Users, BarChart3, Plus, Search, Layers } from "lucide-react";

import { useTasks, TaskFilters } from "@/hooks/useTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { TarefasList } from "@/components/tasks/views/TarefasList";
import { TaskKanban } from "@/components/tasks/views/TaskKanban";
import { TasksByPersonView } from "@/components/tasks/views/TasksByPersonView";
import { AdminTasksPanel } from "@/components/tasks/views/AdminTasksPanel";
import { exportTasksToPDF } from "@/lib/exportTasksPdf";

import { BulkTaskModal } from "@/components/tasks/modals/BulkTaskModal";
import { BulkEditModal } from "@/components/tasks/modals/BulkEditModal";
import { CreateTaskModal } from "@/components/tasks/modals/CreateTaskModal";
import { TaskDetailDialog } from "@/components/tasks/details/TaskDetailDialog";

export default function Tarefas() {
    const { data: currentUser } = useCurrentUser();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

    const [filters, setFilters] = useState<TaskFilters>({
        search: "",
        priority: "all",
        category: "all",
        assignee: "all",
    });
    const [activeView, setActiveView] = useState("list");

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

    const { data: tasks = [], isLoading } = useTasks(filters);

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

        if (activeView === "list") return <TarefasList tasks={tasks} onTaskClick={handleTaskClick} />;
        if (activeView === "kanban") return <TaskKanban tasks={tasks} onTaskClick={handleTaskClick} />;
        if (activeView === "person") return <TasksByPersonView
            tasks={tasks}
            onTaskClick={handleTaskClick}
            selectedTasks={selectedTasks}
            onToggleSelectTask={handleToggleSelectTask}
            onCreateTaskForPerson={(person) => {
                setCreateDefaultAssignee(person);
                setIsCreateOpen(true);
            }}
        />;
        if (activeView === "admin" && isAdmin) return <AdminTasksPanel tasks={tasks} />;

        return null;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
            <div className="p-6 pb-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Gerencie suas atividades e da sua equipe
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {selectedTasks.length > 0 && activeView === "person" && (
                            <Button variant="secondary" onClick={() => setIsBulkEditOpen(true)} className="gap-2">
                                <Layers className="w-4 h-4" />
                                Editar Lote ({selectedTasks.length})
                            </Button>
                        )}

                        <Button variant="outline" onClick={() => exportTasksToPDF(tasks)} className="gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Exportar PDF
                        </Button>

                        <Button variant="outline" onClick={() => setIsBulkCreateOpen(true)} className="gap-2">
                            <Layers className="w-4 h-4" />
                            Criação em Lote
                        </Button>

                        <Button onClick={() => { setCreateDefaultAssignee("unassigned"); setIsCreateOpen(true); }} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nova Tarefa
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                    <Tabs value={activeView} onValueChange={setActiveView} className="w-full lg:w-auto overflow-x-auto pb-1">
                        <TabsList className="bg-muted">
                            <TabsTrigger value="list" className="gap-2 h-8 px-3">
                                <List className="w-4 h-4" />
                                <span className="hidden sm:inline">Lista</span>
                            </TabsTrigger>
                            <TabsTrigger value="kanban" className="gap-2 h-8 px-3">
                                <Kanban className="w-4 h-4" />
                                <span className="hidden sm:inline">Quadro</span>
                            </TabsTrigger>
                            <TabsTrigger value="person" className="gap-2 h-8 px-3">
                                <Users className="w-4 h-4" />
                                <span className="hidden sm:inline">Por Pessoa</span>
                            </TabsTrigger>
                            {isAdmin && (
                                <TabsTrigger value="admin" className="gap-2 h-8 px-3">
                                    <BarChart3 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Admin</span>
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </Tabs>

                    {activeView !== "admin" && (
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar tarefas..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                    className="pl-9 h-9"
                                />
                            </div>

                            <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v }))}>
                                <SelectTrigger className="w-full sm:w-[130px] h-9">
                                    <SelectValue placeholder="Prioridade" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as prior.</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
                                    <SelectItem value="media">Média</SelectItem>
                                    <SelectItem value="baixa">Baixa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-50/30 dark:bg-background pt-4 px-6">
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
        </div>
    );
}
