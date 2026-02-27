import { useState, useEffect } from "react";
import { Ticket } from "@/hooks/useTickets";
import { useUpdateTicket } from "@/hooks/useTicketMutations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TicketDetailsDrawer } from "./TicketDetailsDrawer";
import {
    ChevronDown,
    Trash2,
    Search,
    Clock,
    AlertTriangle,
    CheckCircle2,
    UserX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ticketKeys } from "@/hooks/useTickets";
import { useToast } from "@/hooks/use-toast";

interface TicketTableProps {
    tickets: Ticket[];
}

const STATUS_OPTIONS = [
    { value: "all", label: "Todos os status" },
    { value: "aberto", label: "Aberto" },
    { value: "em_atendimento", label: "Em Atendimento" },
    { value: "aguardando_cliente", label: "Aguardando Cliente" },
    { value: "encerrado", label: "Encerrado" },
];

const PRIORITY_OPTIONS = [
    { value: "all", label: "Todas prioridades" },
    { value: "critica", label: "Crítica" },
    { value: "alta", label: "Alta" },
    { value: "media", label: "Média" },
    { value: "baixa", label: "Baixa" },
];

const CATEGORY_OPTIONS = [
    { value: "all", label: "Todas categorias" },
    { value: "Suporte", label: "Suporte" },
    { value: "Financeiro", label: "Financeiro" },
    { value: "Outro", label: "Outro" },
];

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "aberto":
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                    Aberto
                </span>
            );
        case "em_atendimento":
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20">
                    Em Atendimento
                </span>
            );
        case "aguardando_cliente":
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                    Aguardando Cliente
                </span>
            );
        case "encerrado":
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                    Resolvido
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {status}
                </span>
            );
    }
}

function PriorityBadge({ priority }: { priority: string }) {
    switch (priority) {
        case "critica":
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" /> Crítica
                </span>
            );
        case "alta":
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
                    Alta
                </span>
            );
        case "media":
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                    Média
                </span>
            );
        case "baixa":
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400">
                    Baixa
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {priority}
                </span>
            );
    }
}

function SlaCell({ ticket }: { ticket: Ticket }) {
    if (ticket.status === "encerrado") {
        return <span className="text-sm text-muted-foreground">Concluído</span>;
    }
    if (!ticket.sla_limite) {
        return <span className="text-sm text-muted-foreground">--</span>;
    }
    const isOverdue = new Date(ticket.sla_limite) < new Date();
    if (isOverdue) {
        return (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                <Clock className="h-3.5 w-3.5" />
                Atrasado
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {new Date(ticket.sla_limite).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
        </span>
    );
}

export function TicketTable({ tickets }: TicketTableProps) {
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [gestorFilter, setGestorFilter] = useState("all");
    const [clienteFilter, setClienteFilter] = useState("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [colaboradores, setColaboradores] = useState<{ id: string; nome: string; avatar_url?: string | null }[]>([]);
    const [clientes, setClientes] = useState<{ id: string; nome: string; gestor_id: string | null }[]>([]);

    const { mutate: updateTicket } = useUpdateTicket();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    useEffect(() => {
        supabase
            .from("colaboradores")
            .select("user_id, nome, avatar_url")
            .eq("ativo", true)
            .order("nome")
            .then(({ data }) => {
                if (data) setColaboradores(data.filter(c => c.user_id).map(c => ({ id: c.user_id!, nome: c.nome, avatar_url: c.avatar_url })));
            });

        supabase
            .from("clientes")
            .select("id, nome, primary_gestor_user_id")
            .eq("is_active", true)
            .order("nome")
            .then(({ data }) => {
                if (data) setClientes(data.map(c => ({ id: c.id, nome: c.nome, gestor_id: c.primary_gestor_user_id })));
            });
    }, []);

    // Gestor options derived from clientes list
    const gestorOptions = [
        { value: "all", label: "Todos os gestores" },
        ...Array.from(
            new Map(
                clientes
                    .filter(c => c.gestor_id)
                    .map(c => [c.gestor_id!, colaboradores.find(col => col.id === c.gestor_id)?.nome || c.gestor_id!])
            ).entries()
        ).map(([id, nome]) => ({ value: id, label: nome })),
    ];

    const clienteOptions = [
        { value: "all", label: "Todos os clientes" },
        ...clientes.map(c => ({ value: c.id, label: c.nome })),
    ];

    // Client-side filter
    const filtered = tickets.filter(t => {
        const q = search.toLowerCase();
        const matchSearch =
            !q ||
            (t.clientes?.nome || "").toLowerCase().includes(q);
        const matchStatus = statusFilter === "all" || t.status === statusFilter;
        const matchPriority = priorityFilter === "all" || t.prioridade === priorityFilter;
        const matchCategory = categoryFilter === "all" || t.categoria === categoryFilter;
        const matchCliente = clienteFilter === "all" || t.cliente_id === clienteFilter;
        const clienteInfo = clientes.find(c => c.id === t.cliente_id);
        const matchGestor = gestorFilter === "all" || clienteInfo?.gestor_id === gestorFilter;
        return matchSearch && matchStatus && matchPriority && matchCategory && matchCliente && matchGestor;
    });

    const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                filtered.forEach(t => next.delete(t.id));
                return next;
            });
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                filtered.forEach(t => next.add(t.id));
                return next;
            });
        }
    };

    const handleDelete = async (ticketId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja excluir este ticket?")) return;
        const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
        if (error) {
            toast({ title: "Erro ao excluir ticket", description: error.message, variant: "destructive" });
        } else {
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            toast({ title: "Ticket excluído" });
        }
    };

    const handleStatusChange = (ticketId: string, newStatus: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateTicket({ id: ticketId, updates: { status: newStatus as any } });
    };

    const handlePrioridadeChange = (ticketId: string, newPrioridade: string, e: React.MouseEvent) => {
        e.stopPropagation();
        updateTicket({ id: ticketId, updates: { prioridade: newPrioridade } });
    };

    const handleResponsavelChange = (ticketId: string, userId: string | null, e: React.MouseEvent) => {
        e.stopPropagation();
        updateTicket({ id: ticketId, updates: { responsavel_id: userId } });
    };

    return (
        <div className="space-y-3">
            {/* Filters row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Buscar por cliente..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-9 bg-background"
                    />
                </div>
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9 bg-background">
                        <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                        {clienteOptions.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={gestorFilter} onValueChange={setGestorFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9 bg-background">
                        <SelectValue placeholder="Todos os gestores" />
                    </SelectTrigger>
                    <SelectContent>
                        {gestorOptions.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9 bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9 bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PRIORITY_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-9 bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORY_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            <th className="w-10 px-4 py-3 text-left">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={toggleAll}
                                    aria-label="Selecionar todos"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-12">
                                <span className="flex items-center gap-1">
                                    # <ChevronDown className="h-3 w-3 opacity-50" />
                                </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    Cliente <ChevronDown className="h-3 w-3 opacity-50" />
                                </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    Categoria <ChevronDown className="h-3 w-3 opacity-50" />
                                </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-foreground">
                                <span className="flex items-center gap-1">
                                    Prioridade <ChevronDown className="h-3 w-3 opacity-50" />
                                </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    Responsável <ChevronDown className="h-3 w-3 opacity-50" />
                                </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    Status <ChevronDown className="h-3 w-3 opacity-50" />
                                </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    SLA <ChevronDown className="h-3 w-3 opacity-50" />
                                </span>
                            </th>
                            <th className="w-10 px-2 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="h-24 text-center text-muted-foreground italic text-sm">
                                    Nenhum ticket encontrado.
                                </td>
                            </tr>
                        ) : (
                            filtered.map(ticket => (
                                <tr
                                    key={ticket.id}
                                    className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                                    onClick={() => setSelectedTicketId(ticket.id)}
                                >
                                    {/* Checkbox */}
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedIds.has(ticket.id)}
                                            onCheckedChange={checked => {
                                                setSelectedIds(prev => {
                                                    const next = new Set(prev);
                                                    if (checked) next.add(ticket.id);
                                                    else next.delete(ticket.id);
                                                    return next;
                                                });
                                            }}
                                            aria-label="Selecionar ticket"
                                        />
                                    </td>
                                    {/* # */}
                                    <td className="px-3 py-3 font-mono text-xs font-semibold text-muted-foreground">
                                        {ticket.numero}
                                    </td>
                                    {/* Cliente */}
                                    <td className="px-3 py-3 max-w-[220px]">
                                        <p className="font-medium text-sm leading-tight truncate">
                                            {ticket.clientes?.nome || "—"}
                                        </p>
                                    </td>
                                    {/* Categoria */}
                                    <td className="px-3 py-3 text-sm text-muted-foreground capitalize">
                                        {ticket.categoria || "—"}
                                    </td>
                                    {/* Prioridade */}
                                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="rounded-md ring-offset-background hover:ring-2 hover:ring-border hover:ring-offset-1 transition-all">
                                                    <PriorityBadge priority={ticket.prioridade || ""} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="min-w-[140px]">
                                                {PRIORITY_OPTIONS.filter(p => p.value !== "all").map(p => (
                                                    <DropdownMenuItem
                                                        key={p.value}
                                                        onClick={e => handlePrioridadeChange(ticket.id, p.value, e)}
                                                        className={`text-sm ${ticket.prioridade === p.value ? "font-bold" : ""}`}
                                                    >
                                                        {p.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                    {/* Responsável */}
                                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted border border-transparent hover:border-border transition-all -mx-2">
                                                    <Avatar className="h-6 w-6 shrink-0">
                                                        <AvatarImage src={ticket.responsavel_avatar || undefined} />
                                                        <AvatarFallback className="text-[10px] bg-indigo-500 text-white">
                                                            {ticket.responsavel_nome?.substring(0, 2).toUpperCase() || "??"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm truncate max-w-[100px]">
                                                        {ticket.responsavel_nome || "Não atribuído"}
                                                    </span>
                                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="min-w-[180px]">
                                                {colaboradores.map(c => (
                                                    <DropdownMenuItem
                                                        key={c.id}
                                                        onClick={e => handleResponsavelChange(ticket.id, c.id, e)}
                                                        className={`text-sm gap-2 ${ticket.responsavel_id === c.id ? "font-bold" : ""}`}
                                                    >
                                                        <Avatar className="h-5 w-5 shrink-0">
                                                            <AvatarImage src={c.avatar_url || undefined} />
                                                            <AvatarFallback className="text-[9px] bg-indigo-500 text-white">
                                                                {c.nome.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {c.nome}
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={e => handleResponsavelChange(ticket.id, null, e)}
                                                    className="text-sm gap-2 text-muted-foreground"
                                                >
                                                    <UserX className="h-4 w-4" /> Remover responsável
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                    {/* Status */}
                                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted border border-transparent hover:border-border transition-all -mx-2">
                                                    <StatusBadge status={ticket.status || ""} />
                                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                {STATUS_OPTIONS.filter(s => s.value !== "all").map(s => (
                                                    <DropdownMenuItem
                                                        key={s.value}
                                                        onClick={e => handleStatusChange(ticket.id, s.value, e)}
                                                        className="text-sm"
                                                    >
                                                        {s.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                    {/* SLA */}
                                    <td className="px-3 py-3">
                                        <SlaCell ticket={ticket} />
                                    </td>
                                    {/* Delete */}
                                    <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={e => handleDelete(ticket.id, e)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <TicketDetailsDrawer
                ticketId={selectedTicketId || ""}
                isOpen={!!selectedTicketId}
                onClose={() => setSelectedTicketId(null)}
            />
        </div>
    );
}
