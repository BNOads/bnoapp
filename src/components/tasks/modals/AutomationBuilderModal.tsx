import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCreateTaskAutomation, TaskAutomation, useUpdateTaskAutomation } from "@/hooks/useTaskAutomations";
import { useTaskLists } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { Zap, ArrowRight, Activity, PlusCircle, CheckCircle, Bell, ArrowLeft, Trash2, Calendar, RefreshCw, ListTodo, Star } from "lucide-react";

interface AutomationBuilderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: TaskAutomation | null;
    mode?: "create" | "edit" | "duplicate";
}

interface ActionDef {
    id: string;
    type: string;
    payload: any;
}

interface ConditionDef {
    id: string;
    field: string;
    operator: string;
    value: string;
}

export function AutomationBuilderModal({ open, onOpenChange, initialData, mode = "create" }: AutomationBuilderModalProps) {
    const createMutation = useCreateTaskAutomation();
    const updateMutation = useUpdateTaskAutomation();
    const { data: taskLists = [] } = useTaskLists();

    const [users, setUsers] = useState<any[]>([]);
    const [name, setName] = useState("");
    const [triggerType, setTriggerType] = useState<string>("");
    const [actions, setActions] = useState<ActionDef[]>([]);
    const [conditions, setConditions] = useState<ConditionDef[]>([]);

    React.useEffect(() => {
        supabase.from("colaboradores").select("id, nome, email").order("nome").then(({ data }) => {
            if (data) setUsers(data);
        });
    }, []);

    React.useEffect(() => {
        if (open) {
            if (initialData) {
                setName(mode === "duplicate" ? `${initialData.name} (Cópia)` : initialData.name);
                setTriggerType(initialData.trigger_type);
                setActions((initialData.actions || []).map(a => ({
                    id: crypto.randomUUID(),
                    type: a.type,
                    payload: a.payload
                })));
                setConditions(Array.isArray(initialData.trigger_conditions) ? initialData.trigger_conditions.map(c => ({
                    id: crypto.randomUUID(),
                    field: c.field || "",
                    operator: c.operator || "==",
                    value: c.value || ""
                })) : []);
            } else {
                resetForm();
            }
        }
    }, [open, initialData, mode]);

    const TRIGGERS = [
        { id: "new_client", label: "Novo Cliente Adicionado", icon: <PlusCircle className="w-4 h-4 mr-2 text-rose-500" /> },
        { id: "new_launch", label: "Novo Lançamento Criado", icon: <Zap className="w-4 h-4 mr-2 text-rose-500" /> },
        { id: "funnel_changed", label: "Status de Funil Alterado", icon: <Activity className="w-4 h-4 mr-2 text-rose-500" /> },
        { id: "new_budget", label: "Novo Orçamento por Funil", icon: <Activity className="w-4 h-4 mr-2 text-rose-500" /> },
        { id: "new_challenge", label: "Novo Desafio Criado", icon: <Activity className="w-4 h-4 mr-2 text-rose-500" /> },
        { id: "new_traffic_manager", label: "Novo Gestor de Tráfego", icon: <Activity className="w-4 h-4 mr-2 text-rose-500" /> },
        { id: "new_cs", label: "Novo CS Atribuído", icon: <Activity className="w-4 h-4 mr-2 text-rose-500" /> },
    ];

    const ACTIONS_TYPES = [
        { id: "create_task", label: "Criar Nova Tarefa", icon: <PlusCircle className="w-4 h-4 mr-2 text-blue-500" /> },
        { id: "change_status", label: "Alterar Status de Tarefa", icon: <CheckCircle className="w-4 h-4 mr-2 text-blue-500" /> },
        { id: "notify_team", label: "Enviar Aviso à Equipe", icon: <Bell className="w-4 h-4 mr-2 text-blue-500" /> },
    ];

    const RELATIVE_DATE_VARIABLES = [
        { id: "today", label: "Data do Gatilho (Hoje)" },
        { id: "tomorrow", label: "1 dia após Gatilho (Amanhã)" },
        { id: "3_days", label: "3 dias após" },
        { id: "7_days", label: "7 dias após (1 semana)" },
        { id: "15_days", label: "15 dias após" },
        { id: "30_days", label: "30 dias após (1 mês)" },
        { id: "custom_days", label: "Personalizado (X dias após)..." },
    ];

    const RECURRENCE_OPTIONS = [
        { id: "none", label: "Sem recorrência" },
        { id: "daily", label: "Diária" },
        { id: "weekly", label: "Semanal" },
        { id: "monthly", label: "Mensal" },
    ];

    const RECURRENCE_START_OPTIONS = [
        { id: "trigger_date", label: "Data do Gatilho (Hoje)" },
        { id: "trigger_+1", label: "1 dia após o Gatilho" },
        { id: "trigger_+3", label: "3 dias após o Gatilho" },
        { id: "trigger_+7", label: "7 dias após o Gatilho" },
        { id: "trigger_+14", label: "14 dias após o Gatilho" },
        { id: "trigger_+30", label: "30 dias após o Gatilho" },
        { id: "fixed_date", label: "Data fixa..." },
    ];

    const PRIORITY_OPTIONS = [
        { id: "alta", label: "Alta", color: "text-red-600" },
        { id: "media", label: "Média", color: "text-amber-600" },
        { id: "baixa", label: "Baixa", color: "text-blue-500" },
    ];

    const TRIGGER_CONDITION_FIELDS = [
        { id: "traffic_manager", label: "Gestor do Cliente / Tráfego" },
        { id: "cs_manager", label: "Gestor de CS" },
        { id: "funnel_status", label: "Status do Funil" },
        { id: "budget_value", label: "Valor do Orçamento" },
    ];

    const VARIABLES = [
        { id: "{nome_cliente}", label: "Nome do Cliente" },
        { id: "{instagram_cliente}", label: "Instagram do Cliente" },
        { id: "{gestor_cliente}", label: "Gestor do Cliente / Tráfego" },
        { id: "{cs_cliente}", label: "CS do Cliente" },
        { id: "{nome_funil}", label: "Nome do Funil" },
        { id: "{status_funil}", label: "Status do Funil" },
        { id: "{orcamento_funil}", label: "Orçamento do Funil" },
        { id: "{nome_lancamento}", label: "Nome do Lançamento" },
        { id: "{data_atual}", label: "Data Atual" },
    ];

    const VariableSelector = ({ onSelect }: { onSelect: (v: string) => void }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-0 border border-indigo-100">
                    <PlusCircle className="w-3 h-3 mr-1" /> Variáveis
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] max-h-[300px] overflow-auto">
                {VARIABLES.map(v => (
                    <DropdownMenuItem key={v.id} onClick={() => onSelect(v.id)} className="text-xs cursor-pointer">
                        {v.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const addCondition = () => {
        setConditions([...conditions, { id: crypto.randomUUID(), field: "", operator: "==", value: "" }]);
    };

    const removeCondition = (id: string) => {
        setConditions(conditions.filter(c => c.id !== id));
    };

    const updateCondition = (id: string, updates: Partial<ConditionDef>) => {
        setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const addAction = () => {
        setActions([...actions, { id: crypto.randomUUID(), type: "", payload: {} }]);
    };

    const removeAction = (id: string) => {
        setActions(actions.filter(a => a.id !== id));
    };

    const updateAction = (id: string, updates: Partial<ActionDef>) => {
        setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    // Helper: get the current effective due_date_var value for storage
    const getDueDateVar = (payload: any): string | null => {
        if (!payload?.due_date_var || payload.due_date_var === "none") return null;
        if (payload.due_date_var === "custom_days") {
            const days = parseInt(payload.custom_days_value || "1", 10);
            return `custom_${days}`;
        }
        return payload.due_date_var;
    };

    const handleCreate = async () => {
        if (!name || !triggerType || actions.length === 0) return;

        const validActions = actions.filter(a => a.type !== "");
        if (validActions.length === 0) return;

        const actionPayloads = validActions.map(a => ({
            type: a.type,
            payload: a.type === "create_task"
                ? {
                    title: a.payload.title || "Nova Tarefa Automática",
                    description: a.payload.description || "",
                    assignee: a.payload.assignee || "unassigned",
                    due_date_var: getDueDateVar(a.payload),
                    recurrence: a.payload.recurrence && a.payload.recurrence !== "none" ? a.payload.recurrence : null,
                    // recurrence_start stores the resolved value (trigger_date, trigger_+N, or a fixed date)
                    recurrence_start: a.payload.recurrence && a.payload.recurrence !== "none" ? (a.payload.recurrence_start || null) : null,
                    list_id: a.payload.list_id || null,
                    priority: a.payload.priority || null,
                }
                : a.type === "notify_team"
                    ? { message: a.payload.message || "Nova notificação da automação." }
                    : {}
        }));

        try {
            const validConditions = conditions.filter(c => c.field && c.value).map(c => ({
                field: c.field, operator: c.operator, value: c.value
            }));

            if (mode === "edit" && initialData?.id) {
                await updateMutation.mutateAsync({
                    id: initialData.id,
                    name,
                    trigger_type: triggerType,
                    trigger_conditions: validConditions,
                    actions: actionPayloads,
                });
            } else {
                await createMutation.mutateAsync({
                    name,
                    trigger_type: triggerType,
                    trigger_conditions: validConditions,
                    actions: actionPayloads,
                    is_active: true
                });
            }
            onOpenChange(false);
            resetForm();
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setName("");
        setTriggerType("");
        setActions([]);
        setConditions([]);
    };

    const isFormValid = React.useMemo(() => {
        if (name.trim().length === 0) return false;
        if (!triggerType) return false;
        if (actions.length === 0) return false;

        const hasInvalidConditions = conditions.some(c => !c.field || !c.operator || !c.value);
        if (hasInvalidConditions) return false;

        const hasInvalidActions = actions.some(a => {
            if (!a.type) return true;
            if (a.type === "create_task") {
                if (!a.payload?.title || a.payload.title.trim().length === 0) return true;
                // If custom days, require a valid number
                if (a.payload.due_date_var === "custom_days") {
                    const days = parseInt(a.payload.custom_days_value || "0", 10);
                    if (isNaN(days) || days < 1) return true;
                }
                // If recurrence is set, require recurrence_start_type (and fixed_date value if type is fixed_date)
                if (a.payload.recurrence && a.payload.recurrence !== "none") {
                    const startType = a.payload.recurrence_start_type;
                    if (!startType) return true;
                    if (startType === "fixed_date" && !a.payload.recurrence_start_fixed) return true;
                }
            }
            if (a.type === "notify_team") {
                if (!a.payload?.message || a.payload.message.trim().length === 0) return true;
            }
            return false;
        });

        if (hasInvalidActions) return false;

        return true;
    }, [name, triggerType, actions, conditions]);

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) resetForm();
            onOpenChange(val);
        }}>
            <DialogContent className="max-w-[1000px] h-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[#f5f6f8] gap-0">
                <DialogHeader className="p-4 bg-white border-b shrink-0 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3 w-full">
                        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onOpenChange(false)}>
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Button>
                        <Input
                            placeholder="Dê um nome a essa regra de automação..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="border-none shadow-none text-xl font-semibold w-full max-w-lg focus-visible:ring-0 px-0 placeholder:text-slate-300"
                        />
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto p-8 relative flex items-start justify-center pattern-dots pattern-slate-200 pattern-bg-white pattern-size-4 pattern-opacity-100">
                    <div className="flex flex-col md:flex-row items-start gap-8 relative w-full max-w-4xl justify-center z-10 pt-10">
                        {/* Trigger Column */}
                        <div className="w-full md:w-[350px] shrink-0">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 font-semibold text-slate-800">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    Acionar
                                </div>
                                <div className="p-5">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Evento</label>
                                            <Select value={triggerType} onValueChange={setTriggerType}>
                                                <SelectTrigger className="w-full h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors">
                                                    <SelectValue placeholder="Selecione um gatilho..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TRIGGERS.map(t => (
                                                        <SelectItem key={t.id} value={t.id} className="py-2.5">
                                                            <div className="flex items-center">
                                                                {t.icon} {t.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {triggerType && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Condições (Se...)</label>
                                                </div>
                                                {conditions.map((cond) => (
                                                    <div key={cond.id} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg relative group">
                                                        <Button variant="ghost" size="icon" className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full" onClick={() => removeCondition(cond.id)}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                        <Select value={cond.field} onValueChange={(val) => updateCondition(cond.id, { field: val })}>
                                                            <SelectTrigger className="w-full h-9 bg-white shadow-sm border-slate-200 text-xs">
                                                                <SelectValue placeholder="Campo..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {TRIGGER_CONDITION_FIELDS.map(f => (
                                                                    <SelectItem key={f.id} value={f.id} className="text-xs">{f.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="flex gap-2">
                                                            <Select value={cond.operator} onValueChange={(val) => updateCondition(cond.id, { operator: val })}>
                                                                <SelectTrigger className="w-[85px] h-9 bg-white shadow-sm border-slate-200 text-xs shrink-0">
                                                                    <SelectValue placeholder="Op..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="==" className="text-xs">For</SelectItem>
                                                                    <SelectItem value="!=" className="text-xs">Não for</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Select value={cond.value} onValueChange={(val) => updateCondition(cond.id, { value: val })}>
                                                                <SelectTrigger className="flex-1 h-9 bg-white shadow-sm border-slate-200 text-xs">
                                                                    <SelectValue placeholder="Valor..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {users.map((u: any) => (
                                                                        <SelectItem key={u.id} value={u.nome || u.email} className="text-xs">{u.nome || u.email}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button variant="ghost" size="sm" className="w-full border border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 h-9" onClick={addCondition}>
                                                    <PlusCircle className="w-3 h-3 mr-2" />
                                                    Adicionar Condição
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Arrow connector */}
                        <div className="hidden md:flex flex-col items-center justify-center shrink-0 mt-[80px]">
                            <ArrowRight className="w-6 h-6 text-slate-300" />
                        </div>

                        {/* Actions Column */}
                        <div className="w-full md:w-[450px] shrink-0">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[300px] flex flex-col">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 font-semibold text-slate-800 shrink-0">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                    Ações
                                </div>
                                <div className="p-5 flex flex-col gap-4 flex-1 bg-slate-50/50">
                                    {actions.map((act, index) => (
                                        <div key={act.id} className="border border-slate-200 rounded-xl p-4 bg-white relative group shadow-sm">
                                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeAction(act.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <div className="space-y-4 pr-6">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ação {index + 1}</label>
                                                    <Select value={act.type} onValueChange={(val) => updateAction(act.id, { type: val })}>
                                                        <SelectTrigger className="w-full h-10 bg-white">
                                                            <SelectValue placeholder="Selecione uma ação..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {ACTIONS_TYPES.map(a => (
                                                                <SelectItem key={a.id} value={a.id} className="py-2.5">
                                                                    <div className="flex items-center">
                                                                        {a.icon} {a.label}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {act.type === "create_task" && (
                                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                                        {/* Title */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Título da Tarefa Gerada</label>
                                                                <VariableSelector onSelect={(v) => updateAction(act.id, { payload: { ...act.payload, title: (act.payload.title || "") + " " + v } })} />
                                                            </div>
                                                            <Input
                                                                className="bg-white h-10 border-slate-200"
                                                                placeholder="Ex: Ligar para novo cliente"
                                                                value={act.payload?.title || ""}
                                                                onChange={(e) => updateAction(act.id, { payload: { ...act.payload, title: e.target.value } })}
                                                            />
                                                        </div>

                                                        {/* Description */}
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Descrição</label>
                                                                <VariableSelector onSelect={(v) => updateAction(act.id, { payload: { ...act.payload, description: (act.payload.description || "") + " " + v } })} />
                                                            </div>
                                                            <Textarea
                                                                className="bg-white min-h-[60px] border-slate-200 resize-none text-sm"
                                                                placeholder="Descrição opcional com variáveis..."
                                                                value={act.payload?.description || ""}
                                                                onChange={(e) => updateAction(act.id, { payload: { ...act.payload, description: e.target.value } })}
                                                            />
                                                        </div>

                                                        {/* Assignee */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Responsável</label>
                                                            <Select value={act.payload?.assignee || "unassigned"} onValueChange={(val) => updateAction(act.id, { payload: { ...act.payload, assignee: val } })}>
                                                                <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                                                                    <SelectValue placeholder="Selecione..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="unassigned">Sem responsável automático</SelectItem>
                                                                    <SelectItem value="{traffic_manager}">Gestor do Cliente / Tráfego (Dinâmico)</SelectItem>
                                                                    <SelectItem value="{cs}">CS (Dinâmico)</SelectItem>
                                                                    {users.map((u: any) => (
                                                                        <SelectItem key={u.id} value={u.nome || u.email}>{u.nome || u.email}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Lista */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <ListTodo className="w-3 h-3" /> Lista
                                                            </label>
                                                            <Select value={act.payload?.list_id || "none"} onValueChange={(val) => updateAction(act.id, { payload: { ...act.payload, list_id: val === "none" ? null : val } })}>
                                                                <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                                                                    <SelectValue placeholder="Sem lista..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Sem lista</SelectItem>
                                                                    {taskLists.map((list: any) => (
                                                                        <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Prioridade */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <Star className="w-3 h-3" /> Prioridade
                                                            </label>
                                                            <Select value={act.payload?.priority || "none"} onValueChange={(val) => updateAction(act.id, { payload: { ...act.payload, priority: val === "none" ? null : val } })}>
                                                                <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                                                                    <SelectValue placeholder="Sem prioridade..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Sem prioridade</SelectItem>
                                                                    {PRIORITY_OPTIONS.map(p => (
                                                                        <SelectItem key={p.id} value={p.id}>
                                                                            <span className={p.color}>{p.label}</span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Prazo Dinâmico */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3" /> Prazo Dinâmico
                                                            </label>
                                                            <Select
                                                                value={act.payload?.due_date_var || "none"}
                                                                onValueChange={(val) => updateAction(act.id, { payload: { ...act.payload, due_date_var: val === "none" ? null : val, custom_days_value: val === "custom_days" ? (act.payload?.custom_days_value || "7") : undefined } })}
                                                            >
                                                                <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                                                                    <SelectValue placeholder="Prazo Dinâmico..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Sem prazo</SelectItem>
                                                                    {RELATIVE_DATE_VARIABLES.map((v) => (
                                                                        <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {/* Custom days input */}
                                                            {act.payload?.due_date_var === "custom_days" && (
                                                                <div className="flex items-center gap-2 mt-1.5">
                                                                    <Input
                                                                        type="number"
                                                                        min={1}
                                                                        max={365}
                                                                        className="bg-white h-9 border-slate-200 w-24 text-center font-semibold"
                                                                        placeholder="7"
                                                                        value={act.payload?.custom_days_value || ""}
                                                                        onChange={(e) => updateAction(act.id, { payload: { ...act.payload, custom_days_value: e.target.value } })}
                                                                    />
                                                                    <span className="text-sm text-slate-500">dias após o gatilho</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Recorrência */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                <RefreshCw className="w-3 h-3" /> Recorrência
                                                            </label>
                                                            <Select
                                                                value={act.payload?.recurrence || "none"}
                                                                onValueChange={(val) => updateAction(act.id, { payload: { ...act.payload, recurrence: val, recurrence_start: val === "none" ? null : act.payload?.recurrence_start } })}
                                                            >
                                                                <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                                                                    <SelectValue placeholder="Sem recorrência..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {RECURRENCE_OPTIONS.map(r => (
                                                                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {/* Recurrence start date — required when recurrence is active */}
                                                            {act.payload?.recurrence && act.payload.recurrence !== "none" && (
                                                                <div className="space-y-1 mt-1.5">
                                                                    <label className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider flex items-center gap-1">
                                                                        Base da 1ª Ocorrência *
                                                                    </label>
                                                                    <Select
                                                                        value={act.payload?.recurrence_start_type || ""}
                                                                        onValueChange={(val) => updateAction(act.id, {
                                                                            payload: {
                                                                                ...act.payload,
                                                                                recurrence_start_type: val,
                                                                                recurrence_start: val === "fixed_date" ? (act.payload?.recurrence_start_fixed || "") : val,
                                                                            }
                                                                        })}
                                                                    >
                                                                        <SelectTrigger className="w-full h-9 bg-white border-slate-200 text-sm">
                                                                            <SelectValue placeholder="Selecione a base da 1ª ocorrência..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {RECURRENCE_START_OPTIONS.map(opt => (
                                                                                <SelectItem key={opt.id} value={opt.id} className="text-xs">{opt.label}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {act.payload?.recurrence_start_type === "fixed_date" && (
                                                                        <Input
                                                                            type="date"
                                                                            className="bg-white h-9 border-slate-200 text-sm mt-1"
                                                                            value={act.payload?.recurrence_start_fixed || ""}
                                                                            onChange={(e) => updateAction(act.id, {
                                                                                payload: {
                                                                                    ...act.payload,
                                                                                    recurrence_start_fixed: e.target.value,
                                                                                    recurrence_start: e.target.value,
                                                                                }
                                                                            })}
                                                                        />
                                                                    )}
                                                                    <p className="text-[10px] text-slate-400">
                                                                        Define o due_date da 1ª tarefa e o início da série de recorrências.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {act.type === "notify_team" && (
                                                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mensagem da Notificação</label>
                                                        <Input
                                                            className="bg-white h-10 border-slate-200"
                                                            placeholder="Ex: Pessoal, temos um novo cliente!"
                                                            value={act.payload?.message || ""}
                                                            onChange={(e) => updateAction(act.id, { payload: { ...act.payload, message: e.target.value } })}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <Button variant="outline" className="w-full border-dashed border-2 border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 py-6" onClick={addAction}>
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Adicionar ação
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 sm:p-5 bg-white border-t shrink-0 flex items-center w-full relative z-20">
                    <div className="flex-1 flex items-center">
                        <div className="flex items-center text-sm text-slate-500 bg-slate-50 border px-3 py-2 rounded-lg font-medium">
                            Quando <span className="mx-1.5 text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">{TRIGGERS.find(t => t.id === triggerType)?.label || "..."}</span>
                            então <span className="mx-1.5 text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">{actions.filter(a => a.type).length} ação(ões)</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isFormValid && (
                            <span className="text-xs text-rose-500 font-medium bg-rose-50 px-2 py-1 rounded border border-rose-100 hidden sm:inline-block">
                                Preencha todos os campos
                            </span>
                        )}
                        <Button variant="ghost" className="text-slate-500 hover:text-slate-800 font-medium" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 font-medium h-10"
                        >
                            {createMutation.isPending || updateMutation.isPending ? "Salvando..." : mode === "edit" ? "Salvar Alterações" : "Criar Automação"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
