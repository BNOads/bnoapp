import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Clock,
    MessageSquare,
    CheckCircle2,
    ExternalLink,
    MessageCircle,
    Send,
    Plus,
    Unlink,
    ChevronDown,
    Paperclip,
    TicketCheck,
    UserX,
    StickyNote,
    History,
    ArrowLeftRight,
    User,
    AlertTriangle,
} from "lucide-react";
import { useTicket } from "@/hooks/useTickets";
import { useUpdateTicket, useCloseTicket, useUnlinkTaskFromTicket } from "@/hooks/useTicketMutations";
import { LinkTaskToTicketDialog } from "./LinkTaskToTicketDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { ticketKeys } from "@/hooks/useTickets";
import { useToast } from "@/hooks/use-toast";

interface TicketDetailsDrawerProps {
    ticketId: string;
    isOpen: boolean;
    onClose: () => void;
}

const STATUS_OPTIONS = [
    { value: "aberto", label: "Aberto" },
    { value: "em_atendimento", label: "Em Atendimento" },
    { value: "aguardando_cliente", label: "Aguardando Cliente" },
    { value: "encerrado", label: "Encerrado" },
];

const PRIORITY_OPTIONS = [
    { value: "baixa", label: "Baixa" },
    { value: "media", label: "Média" },
    { value: "alta", label: "Alta" },
    { value: "critica", label: "Crítica" },
];

type Colab = { id: string; nome: string; avatar_url?: string | null };

function StatusChip({ status, onChange, disabled }: { status: string; onChange: (v: string) => void; disabled?: boolean }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        aberto: { label: "Aberto", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
        em_atendimento: { label: "Em Atendimento", cls: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20" },
        aguardando_cliente: { label: "Aguardando", cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" },
        encerrado: { label: "Resolvido", cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" },
    };
    const c = cfg[status] || { label: status, cls: "bg-muted text-muted-foreground border-border" };
    if (disabled) return <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${c.cls}`}>{c.label}</span>;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${c.cls}`}>
                    {c.label} <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {STATUS_OPTIONS.map(s => (
                    <DropdownMenuItem key={s.value} onClick={() => onChange(s.value)} className={`text-sm ${status === s.value ? "font-bold" : ""}`}>
                        {s.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function PriorityChip({ priority, onChange, disabled }: { priority: string; onChange: (v: string) => void; disabled?: boolean }) {
    const cfg: Record<string, { label: string; cls: string }> = {
        critica: { label: "⚠ Crítica", cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/20" },
        alta: { label: "Alta", cls: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400" },
        media: { label: "Média", cls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400" },
        baixa: { label: "Baixa", cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-400" },
    };
    const c = cfg[priority] || { label: priority, cls: "bg-muted text-muted-foreground border-border" };
    if (disabled) return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${c.cls}`}>{c.label}</span>;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${c.cls}`}>
                    {c.label} <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {PRIORITY_OPTIONS.map(p => (
                    <DropdownMenuItem key={p.value} onClick={() => onChange(p.value)} className={`text-sm ${priority === p.value ? "font-bold" : ""}`}>
                        {p.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

type ActivityItem = {
    id: string;
    type: "log" | "annotation";
    acao?: string;
    descricao: string;
    created_at: string;
    author?: string;
    author_avatar?: string;
};

export function TicketDetailsDrawer({ ticketId, isOpen, onClose }: TicketDetailsDrawerProps) {
    const { data: ticket, isLoading } = useTicket(ticketId);
    const { mutate: updateTicket } = useUpdateTicket();
    const closeTicket = useCloseTicket();
    const unlinkTask = useUnlinkTaskFromTicket();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { userData: currentUser } = useCurrentUser();

    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [colaboradores, setColaboradores] = useState<Colab[]>([]);
    const [annotationInput, setAnnotationInput] = useState("");
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    // Close dialog state
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [solucaoText, setSolucaoText] = useState("");

    // Transfer dialog state
    const [showTransferDialog, setShowTransferDialog] = useState(false);

    useEffect(() => {
        if (isOpen) {
            supabase.from("colaboradores").select("user_id, nome, avatar_url").eq("ativo", true).order("nome")
                .then(({ data }) => {
                    if (data) setColaboradores(data.filter(c => c.user_id).map(c => ({ id: c.user_id!, nome: c.nome, avatar_url: c.avatar_url })));
                });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isClosed = ticket?.status === "encerrado";
    const responsavelAtual = colaboradores.find(c => c.id === ticket?.responsavel_id);
    const slaOverdue = ticket?.sla_limite && new Date(ticket.sla_limite) < new Date() && !isClosed;

    const activityItems: ActivityItem[] = (ticket?.ticket_logs || []).map((log: any) => ({
        id: log.id,
        type: log.acao === "anotacao" ? "annotation" : "log",
        acao: log.acao,
        descricao: log.descricao,
        created_at: log.created_at,
        author: log.profiles?.nome,
        author_avatar: log.profiles?.avatar_url,
    })).sort((a: ActivityItem, b: ActivityItem) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const handleSubmitNote = async () => {
        if (!annotationInput.trim() || !currentUser) return;
        setIsSubmittingNote(true);
        try {
            await supabase.from("ticket_logs").insert({
                ticket_id: ticketId,
                user_id: currentUser.user_id || currentUser.id,
                acao: "anotacao",
                descricao: annotationInput.trim(),
            });
            queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            toast({ title: "Anotação adicionada" });
            setAnnotationInput("");
        } catch (e: any) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!solucaoText.trim()) return;
        await closeTicket.mutateAsync({ id: ticketId, solucao_descricao: solucaoText });
        setShowCloseDialog(false);
        setSolucaoText("");
    };

    const handleTransfer = (colab: Colab) => {
        updateTicket({ id: ticketId, updates: { responsavel_id: colab.id } });
        setShowTransferDialog(false);
        toast({ title: "Responsável alterado", description: `Transferido para ${colab.nome}` });
    };

    const openTask = (taskId: string) => {
        onClose();
        setTimeout(() => {
            navigate("/tarefas");
            setTimeout(() => window.dispatchEvent(new CustomEvent("open-task-detail", { detail: taskId })), 300);
        }, 100);
    };

    const acoesLabel: Record<string, string> = {
        criado: "Ticket aberto",
        atualizado: "Atualizado",
        encerrado: "Encerrado",
        anotacao: "Anotação",
        status_alterado: "Status alterado",
        responsavel_alterado: "Responsável alterado",
    };

    const tasks: any[] = (ticket as any)?.tasks || [];
    const openTasks = tasks.filter(t => !t.completed);
    const doneTasks = tasks.filter(t => t.completed);

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent className="sm:max-w-[680px] p-0 flex flex-col h-full gap-0">
                    {isLoading || !ticket ? (
                        <div className="flex-1 flex items-center justify-center italic text-muted-foreground text-sm">
                            Carregando detalhes...
                        </div>
                    ) : (
                        <>
                            {/* ── HEADER ────────────────────────────────── */}
                            <div className="px-6 pt-5 pb-4 border-b bg-muted/20 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        #{ticket.numero}
                                    </span>
                                    <StatusChip
                                        status={ticket.status || "aberto"}
                                        onChange={(v) => updateTicket({ id: ticketId, updates: { status: v as any } })}
                                        disabled={isClosed}
                                    />
                                    <PriorityChip
                                        priority={ticket.prioridade || "media"}
                                        onChange={(v) => updateTicket({ id: ticketId, updates: { prioridade: v } })}
                                        disabled={isClosed}
                                    />
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7 shrink-0">
                                        <AvatarFallback className="text-xs">{ticket.clientes?.nome?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-base leading-tight">{ticket.clientes?.nome}</p>
                                        {(ticket.clientes as any)?.whatsapp_grupo_url && (
                                            <a href={(ticket.clientes as any).whatsapp_grupo_url} target="_blank"
                                                className="text-[10px] text-green-600 hover:underline flex items-center gap-0.5 mt-0.5">
                                                <MessageCircle className="h-3 w-3" /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Responsável + Criado por + SLA */}
                                <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
                                    {/* Responsável */}
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Responsável</p>
                                        {isClosed ? (
                                            <div className="flex items-center gap-1.5">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={responsavelAtual?.avatar_url || undefined} />
                                                    <AvatarFallback className="text-[9px] bg-indigo-500 text-white">{(responsavelAtual?.nome || "?")[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium">{responsavelAtual?.nome || "—"}</span>
                                            </div>
                                        ) : (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="flex items-center gap-1.5 hover:bg-muted/60 rounded px-1 py-0.5 transition-colors border border-transparent hover:border-border">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarImage src={responsavelAtual?.avatar_url || undefined} />
                                                            <AvatarFallback className="text-[9px] bg-indigo-500 text-white">
                                                                {(responsavelAtual?.nome || (ticket as any).profiles?.nome || "?")[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs font-medium">{responsavelAtual?.nome || (ticket as any).profiles?.nome || "Atribuir"}</span>
                                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="min-w-[180px]">
                                                    {colaboradores.map(c => (
                                                        <DropdownMenuItem key={c.id} onClick={() => updateTicket({ id: ticketId, updates: { responsavel_id: c.id } })} className={`gap-2 text-sm ${ticket.responsavel_id === c.id ? "font-bold" : ""}`}>
                                                            <Avatar className="h-5 w-5"><AvatarImage src={c.avatar_url || undefined} /><AvatarFallback className="text-[9px] bg-indigo-500 text-white">{c.nome.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                                            {c.nome}
                                                        </DropdownMenuItem>
                                                    ))}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => updateTicket({ id: ticketId, updates: { responsavel_id: null } })} className="text-sm gap-2 text-muted-foreground">
                                                        <UserX className="h-4 w-4" /> Remover
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>

                                    {/* Criado por */}
                                    {((ticket as any).criado_por_nome || ticket.criado_por) && (
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Criado por</p>
                                            <div className="flex items-center gap-1.5">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={(ticket as any).criado_por_avatar || undefined} />
                                                    <AvatarFallback className="text-[9px] bg-emerald-500 text-white">
                                                        {((ticket as any).criado_por_nome || "?")[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-medium">{(ticket as any).criado_por_nome || "—"}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* SLA */}
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">SLA</p>
                                        {isClosed ? (
                                            <span className="text-xs font-medium text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</span>
                                        ) : (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button className={`flex items-center gap-1 text-xs font-medium px-1 py-0.5 rounded hover:bg-muted/60 border border-transparent hover:border-border transition-colors ${slaOverdue ? "text-red-600" : "text-foreground"}`}>
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {ticket.sla_limite ? format(new Date(ticket.sla_limite), "dd/MM HH:mm") : "Definir"}
                                                        {slaOverdue && <span className="text-[10px] font-bold ml-0.5 text-red-600">VENCIDO</span>}
                                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent align="start" className="w-auto p-0">
                                                    <Calendar mode="single" selected={ticket.sla_limite ? new Date(ticket.sla_limite) : undefined}
                                                        onSelect={(d) => d && updateTicket({ id: ticketId, updates: { sla_limite: d.toISOString() } })} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── SCROLLABLE BODY ───────────────────────── */}
                            <ScrollArea className="flex-1">
                                <div className="px-6 py-5 space-y-6">

                                    {/* Descrição */}
                                    <section>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                                            <MessageSquare className="h-3.5 w-3.5" /> Descrição
                                        </h4>
                                        <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed border whitespace-pre-wrap text-foreground">
                                            {ticket.descricao || <span className="italic text-muted-foreground">Sem descrição.</span>}
                                        </div>
                                    </section>

                                    {/* Solução registrada */}
                                    {isClosed && ticket.solucao_descricao && (
                                        <section>
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-green-600 flex items-center gap-1.5 mb-2">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Solução Registrada
                                            </h4>
                                            <div className="bg-green-50/50 rounded-lg p-4 border border-green-200">
                                                <MarkdownRenderer content={ticket.solucao_descricao} />
                                            </div>
                                        </section>
                                    )}

                                    {/* ── TAREFAS ─────────────────────────── */}
                                    <section>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <TicketCheck className="h-3.5 w-3.5" /> Tarefas vinculadas
                                                {tasks.length > 0 && (
                                                    <span className="ml-1 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                        {tasks.length}
                                                    </span>
                                                )}
                                            </h4>
                                            {!isClosed && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsLinkDialogOpen(true)}>
                                                    <Plus className="h-3.5 w-3.5" /> Vincular
                                                </Button>
                                            )}
                                        </div>

                                        {tasks.length === 0 ? (
                                            <div className="border-2 border-dashed rounded-xl py-6 text-center">
                                                <TicketCheck className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                                                <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {tasks.map((task: any) => (
                                                    <div
                                                        key={task.id}
                                                        className={`group relative flex items-start gap-3 px-4 py-3 border rounded-xl hover:shadow-sm transition-all cursor-pointer ${task.completed ? "bg-muted/20 border-border/50 opacity-70" : "bg-background border-primary/20 hover:border-primary/40"}`}
                                                        onClick={() => openTask(task.id)}
                                                    >
                                                        {/* Left stripe */}
                                                        <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${task.completed ? "bg-green-400" : "bg-primary"}`} />
                                                        <div className="flex-1 min-w-0 ml-1">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className={`text-sm font-semibold leading-snug ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                                                    {task.title}
                                                                </p>
                                                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 shrink-0 mt-0.5 transition-opacity" />
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                                {task.assignee && (
                                                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                        <User className="h-3 w-3" /> {task.assignee}
                                                                    </span>
                                                                )}
                                                                {task.due_date && (
                                                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                        <Clock className="h-3 w-3" />{task.due_date}
                                                                    </span>
                                                                )}
                                                                {task.completed
                                                                    ? <Badge className="h-4 bg-green-500/10 text-green-700 text-[10px] py-0 px-1.5 font-medium border-green-200">✓ Concluída</Badge>
                                                                    : <Badge variant="outline" className="h-4 text-[10px] py-0 px-1.5 font-medium">Em aberto</Badge>
                                                                }
                                                            </div>
                                                        </div>
                                                        {!isClosed && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); unlinkTask.mutate({ ticketId, taskId: task.id }); }}
                                                                className="p-1 rounded hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                                title="Desvincular"
                                                            >
                                                                <Unlink className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* ── ACTION BUTTONS (like screenshot) ── */}
                                        {!isClosed && (
                                            <div className="flex items-center gap-3 mt-4">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 gap-2 h-11 text-sm font-medium"
                                                    onClick={() => setShowTransferDialog(true)}
                                                >
                                                    <ArrowLeftRight className="h-4 w-4" />
                                                    Transferir
                                                </Button>
                                                <Button
                                                    className="flex-1 gap-2 h-11 text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
                                                    onClick={() => setShowCloseDialog(true)}
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Encerrar
                                                </Button>
                                            </div>
                                        )}
                                    </section>

                                    {/* Anexos */}
                                    {ticket.ticket_anexos && ticket.ticket_anexos.length > 0 && (
                                        <section>
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                                                <Paperclip className="h-3.5 w-3.5" /> Anexos
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {ticket.ticket_anexos.map((anexo: any) => (
                                                    <a key={anexo.id} href={anexo.arquivo_url} target="_blank"
                                                        className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/30 transition-colors group">
                                                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span className="text-xs truncate flex-1">{anexo.nome_arquivo}</span>
                                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
                                                    </a>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* ── ACTIVITY FEED ────────────────────── */}
                                    <section>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-4">
                                            <History className="h-3.5 w-3.5" /> Atividade
                                        </h4>

                                        {activityItems.length > 0 && (
                                            <div className="relative pl-5 space-y-4 mb-5 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-0.5 before:bg-border">
                                                {activityItems.map((item) => (
                                                    <div key={item.id} className="relative">
                                                        <div className={`absolute -left-[18px] top-1 h-2.5 w-2.5 rounded-full border-2 ${item.type === "annotation" ? "bg-amber-400 border-amber-400" : "bg-background border-primary/60"}`} />
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                {item.type === "annotation" ? (
                                                                    <>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            {item.author && (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Avatar className="h-4 w-4">
                                                                                        <AvatarImage src={item.author_avatar || undefined} />
                                                                                        <AvatarFallback className="text-[7px]">{item.author[0]}</AvatarFallback>
                                                                                    </Avatar>
                                                                                    <span className="text-xs font-semibold">{item.author}</span>
                                                                                </div>
                                                                            )}
                                                                            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
                                                                                <StickyNote className="h-2.5 w-2.5" /> Anotação
                                                                            </span>
                                                                        </div>
                                                                        <div className="bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 rounded-lg p-2.5 text-sm leading-relaxed">
                                                                            {item.descricao}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-foreground">{acoesLabel[item.acao || ""] || item.acao}</p>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">{item.descricao}</p>
                                                                        {item.author && (
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                <Avatar className="h-3.5 w-3.5">
                                                                                    <AvatarImage src={item.author_avatar || undefined} />
                                                                                    <AvatarFallback className="text-[6px]">{item.author[0]}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-[10px] text-muted-foreground">{item.author}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                                {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Annotation input */}
                                        {!isClosed && (
                                            <div className="border rounded-xl overflow-hidden bg-background focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                                                <Textarea
                                                    value={annotationInput}
                                                    onChange={e => setAnnotationInput(e.target.value)}
                                                    placeholder="Adicione uma anotação interna..."
                                                    className="border-0 shadow-none resize-none focus-visible:ring-0 text-sm min-h-[70px] bg-transparent"
                                                    onKeyDown={e => {
                                                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmitNote();
                                                    }}
                                                />
                                                <div className="flex items-center justify-between px-3 py-2 bg-muted/10 border-t">
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" /> Anotação interna · ⌘↵</span>
                                                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleSubmitNote} disabled={!annotationInput.trim() || isSubmittingNote}>
                                                        <Send className="h-3.5 w-3.5" /> Salvar
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </section>

                                    <div className="h-2" />
                                </div>
                            </ScrollArea>
                        </>
                    )}

                    <LinkTaskToTicketDialog
                        ticketId={ticketId}
                        isOpen={isLinkDialogOpen}
                        onClose={() => setIsLinkDialogOpen(false)}
                    />
                </SheetContent>
            </Sheet>

            {/* ── ENCERRAR DIALOG ──────────────────────────────────── */}
            <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" /> Encerrar Ticket
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">Descreva a solução aplicada para encerrar este ticket.</p>
                        <Textarea
                            value={solucaoText}
                            onChange={e => setSolucaoText(e.target.value)}
                            placeholder="Descreva a solução..."
                            className="min-h-[120px] resize-none"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
                        <Button
                            className="bg-foreground text-background hover:bg-foreground/90 gap-2"
                            onClick={handleCloseTicket}
                            disabled={!solucaoText.trim() || closeTicket.isPending}
                        >
                            <CheckCircle2 className="h-4 w-4" /> Encerrar Ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── TRANSFERIR DIALOG ─────────────────────────────────── */}
            <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5" /> Transferir Responsabilidade
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-1.5 max-h-72 overflow-y-auto">
                        {colaboradores.map(c => (
                            <button
                                key={c.id}
                                onClick={() => handleTransfer(c)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left ${ticket?.responsavel_id === c.id ? "bg-primary/5 font-semibold ring-1 ring-primary/20" : ""}`}
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={c.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs bg-indigo-500 text-white">{c.nome.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{c.nome}</span>
                                {ticket?.responsavel_id === c.id && (
                                    <Badge variant="outline" className="ml-auto text-[10px] py-0">Atual</Badge>
                                )}
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
