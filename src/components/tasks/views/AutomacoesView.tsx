import React, { useState } from "react";
import { useTaskAutomations, useUpdateTaskAutomation, useDeleteTaskAutomation, useTaskAutomationLogs, useReExecuteTaskAutomationLog, TaskAutomationLogWithAutomation } from "@/hooks/useTaskAutomations";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Trash2, Power, PowerOff, Bell, CheckCircle, MoreVertical, Edit, Copy, Activity, XCircle, AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { AutomationBuilderModal } from "../modals/AutomationBuilderModal";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskAutomation } from "@/hooks/useTaskAutomations";

export function AutomacoesView() {
    const { data: automations = [], isLoading } = useTaskAutomations();
    const { data: logs = [], isLoading: logsLoading } = useTaskAutomationLogs();
    const updateMutation = useUpdateTaskAutomation();
    const deleteMutation = useDeleteTaskAutomation();
    const reExecuteMutation = useReExecuteTaskAutomationLog();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [selectedAutomation, setSelectedAutomation] = useState<TaskAutomation | null>(null);
    const [builderMode, setBuilderMode] = useState<"create" | "edit" | "duplicate">("create");
    const [logsExpanded, setLogsExpanded] = useState(true);
    const [logsFilter, setLogsFilter] = useState<"all" | "success" | "error" | "skipped">("all");
    const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

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

    const handleRetryLog = async (log: TaskAutomationLogWithAutomation) => {
        setRetryingLogId(log.id);
        try {
            await reExecuteMutation.mutateAsync(log);
        } finally {
            setRetryingLogId(null);
        }
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

    const filteredLogs = logs.filter(log => logsFilter === "all" || log.status === logsFilter);

    const statusConfig = {
        success: { icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Sucesso", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
        error: { icon: <XCircle className="w-3.5 h-3.5" />, label: "Erro", className: "bg-red-50 text-red-700 border-red-100" },
        skipped: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Ignorada", className: "bg-amber-50 text-amber-700 border-amber-100" },
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto w-full">
            {/* Header */}
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
                <Button onClick={() => handleOpenBuilder("create")} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium">
                    <Zap className="w-4 h-4 fill-white text-white" />
                    Nova Regra
                </Button>
            </div>

            {/* Automations list */}
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

            {/* ── Inline Logs Panel ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Panel header */}
                <button
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                    onClick={() => setLogsExpanded(!logsExpanded)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                            <Activity className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <span className="font-semibold text-slate-800 text-sm">Histórico de Execuções</span>
                            <span className="ml-2 text-xs text-slate-400 font-normal">
                                {logsLoading ? "Carregando..." : `${logs.length} registros`}
                            </span>
                        </div>
                        {!logsLoading && logs.filter(l => l.status === "error").length > 0 && (
                            <Badge className="bg-red-50 text-red-600 border border-red-100 text-[10px] px-1.5 py-0.5 font-semibold">
                                {logs.filter(l => l.status === "error").length} erro(s)
                            </Badge>
                        )}
                    </div>
                    {logsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {logsExpanded && (
                    <>
                        {/* Filter tabs */}
                        <div className="flex gap-1 px-6 pb-3 border-b border-slate-100">
                            {(["all", "success", "error", "skipped"] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setLogsFilter(f)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${logsFilter === f
                                            ? "bg-slate-800 text-white"
                                            : "text-slate-500 hover:bg-slate-100"
                                        }`}
                                >
                                    {f === "all" ? "Todos" : f === "success" ? "Sucesso" : f === "error" ? "Erros" : "Ignoradas"}
                                    {f !== "all" && (
                                        <span className="ml-1.5 opacity-70">{logs.filter(l => l.status === f).length}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Log entries */}
                        <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                            {logsLoading ? (
                                <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
                                    <Activity className="w-4 h-4 animate-pulse" />
                                    Carregando logs...
                                </div>
                            ) : filteredLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 text-center px-8">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                        <Activity className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 text-sm">
                                        {logsFilter === "all" ? "Nenhuma execução registrada ainda." : `Nenhum registro com status "${logsFilter}".`}
                                    </p>
                                </div>
                            ) : (
                                filteredLogs.map((log) => {
                                    const cfg = statusConfig[log.status as keyof typeof statusConfig];
                                    return (
                                        <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors">
                                            {/* Status indicator */}
                                            <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border shrink-0 ${cfg?.className}`}>
                                                {cfg?.icon}
                                                {cfg?.label}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-slate-800 text-sm truncate">
                                                        {log.automations?.name || "Automação Apagada"}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                                        {log.trigger_event}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-mono leading-relaxed break-words">
                                                    {log.message}
                                                </p>
                                                {log.status === "error" && (
                                                    <div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 mt-1 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            disabled={retryingLogId === log.id || reExecuteMutation.isPending}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRetryLog(log);
                                                            }}
                                                        >
                                                            <RotateCcw className={`w-3 h-3 mr-1.5 ${retryingLogId === log.id ? "animate-spin" : ""}`} />
                                                            {retryingLogId === log.id ? "Reexecutando..." : "Reexecutar"}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Timestamp */}
                                            <div className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap pt-0.5">
                                                {new Date(log.created_at).toLocaleString("pt-BR", {
                                                    day: "2-digit", month: "2-digit", year: "2-digit",
                                                    hour: "2-digit", minute: "2-digit"
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>

            <AutomationBuilderModal
                open={isBuilderOpen}
                onOpenChange={setIsBuilderOpen}
                initialData={selectedAutomation}
                mode={builderMode}
            />
        </div>
    );
}
