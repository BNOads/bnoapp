import React, { useState } from "react";
import { useTaskAutomations, useUpdateTaskAutomation, useDeleteTaskAutomation } from "@/hooks/useTaskAutomations";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Trash2, Power, PowerOff, Bell, CheckCircle, MoreVertical, Edit, Copy, Activity } from "lucide-react";
import { AutomationBuilderModal } from "../modals/AutomationBuilderModal";
import { AutomationLogsModal } from "../modals/AutomationLogsModal";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskAutomation } from "@/hooks/useTaskAutomations";

export function AutomacoesView() {
    const { data: automations = [], isLoading } = useTaskAutomations();
    const updateMutation = useUpdateTaskAutomation();
    const deleteMutation = useDeleteTaskAutomation();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const [selectedAutomation, setSelectedAutomation] = useState<TaskAutomation | null>(null);
    const [builderMode, setBuilderMode] = useState<"create" | "edit" | "duplicate">("create");

    if (isLoading) {
        return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando automações...</div>;
    }

    const toggleActive = (id: string, currentStatus: boolean) => {
        updateMutation.mutate({ id, is_active: !currentStatus });
    };

    const handleDelete = (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta automação?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleOpenBuilder = (mode: "create" | "edit" | "duplicate", auto?: TaskAutomation) => {
        setBuilderMode(mode);
        setSelectedAutomation(auto || null);
        setIsBuilderOpen(true);
    };

    const getActionLabel = (type: string) => {
        if (type === "create_task") return "Criar Tarefa";
        if (type === "change_status") return "Mudar Status";
        if (type === "notify_team") return "Aviso Equipe";
        return type;
    };

    const getActionIcon = (type: string) => {
        if (type === "create_task") return <Plus className="w-3 h-3 mr-1" />;
        if (type === "change_status") return <CheckCircle className="w-3 h-3 mr-1" />;
        if (type === "notify_team") return <Bell className="w-3 h-3 mr-1" />;
        return null;
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                        <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                            <Zap className="w-4 h-4" />
                        </div>
                        Automações
                    </h2>
                    <p className="text-slate-500 mt-1 text-sm">
                        Crie regras para gerar ou atualizar tarefas e avisos automaticamente conforme eventos no sistema.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsLogsOpen(true)} className="gap-2 font-medium bg-white">
                        <Activity className="w-4 h-4 text-slate-500" />
                        Ver Logs
                    </Button>
                    <Button onClick={() => handleOpenBuilder("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium">
                        <Zap className="w-4 h-4 fill-white text-white" />
                        Nova Regra
                    </Button>
                </div>
            </div>

            {automations.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Zap className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">Nenhuma automação ativa</h3>
                    <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">
                        Automatize seu fluxo de trabalho criando regras que geram tarefas e avisos sempre que algo importante ocorrer.
                    </p>
                    <Button onClick={() => handleOpenBuilder("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6">
                        <Plus className="w-4 h-4" />
                        Criar Primeira Automação
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {automations.map((auto) => (
                        <div key={auto.id} className={`bg-white border ${!auto.is_active ? 'border-slate-200 opacity-70' : 'border-indigo-100'} rounded-xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all`}>
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-lg text-slate-800">{auto.name}</h3>
                                    {!auto.is_active && (
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 font-medium">
                                            Pausada
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="font-semibold text-slate-400 text-xs tracking-wider uppercase">
                                        QUANDO
                                    </span>
                                    <Badge variant="outline" className="bg-slate-50 text-slate-700 font-medium border-slate-200 shadow-sm">
                                        {auto.trigger_type}
                                    </Badge>
                                    <span className="font-semibold text-slate-400 text-xs tracking-wider uppercase ml-1">
                                        ENTÃO FAZER ({auto.actions?.length || 0})
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {(auto.actions || []).map((action, idx) => (
                                            <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 font-medium border-blue-100 shadow-sm flex items-center">
                                                {getActionIcon(action.type)}
                                                {getActionLabel(action.type)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleActive(auto.id, auto.is_active)}
                                    className={`${auto.is_active ? "text-slate-600 border-slate-200 hover:bg-slate-50" : "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700"} font-medium h-9 w-[110px] justify-center transition-colors`}
                                >
                                    {auto.is_active ? <PowerOff className="w-4 h-4 mr-2 opacity-50" /> : <Power className="w-4 h-4 mr-2" />}
                                    {auto.is_active ? "Pausar" : "Ativar"}
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-slate-800 hover:bg-slate-50 h-9 w-9 data-[state=open]:bg-muted transition-colors rounded-full"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => handleOpenBuilder("edit", auto)} className="cursor-pointer gap-2">
                                            <Edit className="w-4 h-4" />
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenBuilder("duplicate", auto)} className="cursor-pointer gap-2">
                                            <Copy className="w-4 h-4" />
                                            Duplicar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(auto.id)} className="cursor-pointer text-red-600 focus:bg-red-50 gap-2">
                                            <Trash2 className="w-4 h-4" />
                                            Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AutomationBuilderModal
                open={isBuilderOpen}
                onOpenChange={setIsBuilderOpen}
                initialData={selectedAutomation}
                mode={builderMode}
            />
            <AutomationLogsModal
                open={isLogsOpen}
                onOpenChange={setIsLogsOpen}
            />
        </div>
    );
}
