import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Clock,
    User,
    MessageSquare,
    History,
    Paperclip,
    CheckCircle2,
    XCircle,
    ExternalLink,
    MessageCircle,
    Calendar,
    AlertTriangle,
    Send
} from "lucide-react";
import { useTicket } from "@/hooks/useTickets";
import { useUpdateTicket, useCloseTicket } from "@/hooks/useTicketMutations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdvancedRichTextEditor } from "@/components/ui/AdvancedRichTextEditor";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface TicketDetailsDrawerProps {
    ticketId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function TicketDetailsDrawer({ ticketId, isOpen, onClose }: TicketDetailsDrawerProps) {
    const { data: ticket, isLoading } = useTicket(ticketId);
    const updateTicket = useUpdateTicket();
    const closeTicket = useCloseTicket();

    const [solution, setSolution] = useState("");
    const [activeTab, setActiveTab] = useState("info");

    if (!isOpen) return null;

    const handleCloseTicket = async () => {
        if (!solution) return;
        await closeTicket.mutateAsync({
            id: ticketId,
            solucao_descricao: solution,
        });
        setSolution("");
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "aberto": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Aberto</Badge>;
            case "em_atendimento": return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Em Atendimento</Badge>;
            case "aguardando_cliente": return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Aguardando Cliente</Badge>;
            case "encerrado": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Encerrado</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "critica": return <Badge variant="destructive">Crítica</Badge>;
            case "alta": return <Badge className="bg-orange-500/10 text-orange-600">Alta</Badge>;
            default: return <Badge variant="outline">{priority}</Badge>;
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-[600px] p-0 flex flex-col h-full">
                {isLoading || !ticket ? (
                    <div className="flex-1 flex items-center justify-center italic text-muted-foreground">
                        Carregando detalhes do ticket...
                    </div>
                ) : (
                    <>
                        <SheetHeader className="p-6 border-b bg-muted/20">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-mono text-muted-foreground">#{ticket.numero}</span>
                                <div className="flex items-center gap-2">
                                    {getPriorityBadge(ticket.prioridade)}
                                    {getStatusBadge(ticket.status)}
                                </div>
                            </div>
                            <SheetTitle className="text-xl font-bold leading-tight">
                                {ticket.categoria}: {ticket.clientes?.nome}
                            </SheetTitle>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(ticket.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                                </div>
                                {ticket.origem && (
                                    <div className="flex items-center gap-1 capitalize">
                                        <History className="h-3 w-3" />
                                        Origem: {ticket.origem}
                                    </div>
                                )}
                            </div>
                        </SheetHeader>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                            <div className="px-6 border-b">
                                <TabsList className="h-12 w-full justify-start bg-transparent gap-6">
                                    <TabsTrigger value="info" className="px-0 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
                                        Informações
                                    </TabsTrigger>
                                    <TabsTrigger value="timeline" className="px-0 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
                                        Histórico
                                    </TabsTrigger>
                                    <TabsTrigger value="tasks" className="px-0 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
                                        Tarefas
                                    </TabsTrigger>
                                    <TabsTrigger value="attachments" className="px-0 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
                                        Anexos
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6">
                                    <TabsContent value="info" className="mt-0 space-y-6">
                                        {/* Descrição */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-primary" /> Descrição
                                            </h4>
                                            <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed border whitespace-pre-wrap">
                                                {ticket.descricao}
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Cliente e Responsável */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</p>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>{ticket.clientes?.nome?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold">{ticket.clientes?.nome}</span>
                                                        {ticket.clientes?.whatsapp_grupo_url && (
                                                            <a
                                                                href={ticket.clientes.whatsapp_grupo_url}
                                                                target="_blank"
                                                                className="text-[10px] text-green-600 hover:underline flex items-center gap-1"
                                                            >
                                                                <MessageCircle className="h-3 w-3" /> Abrir no WhatsApp
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Responsável</p>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>{(ticket as any).profiles?.nome?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold">{(ticket as any).profiles?.nome || "Não atribuído"}</span>
                                                        <span className="text-[10px] text-muted-foreground">{(ticket as any).profiles?.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SLA Info */}
                                        {ticket.status !== "encerrado" && (ticket as any).sla_estimado && (
                                            <div className={`p-4 rounded-lg flex items-center gap-3 border ${new Date((ticket as any).sla_estimado) < new Date() ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
                                                }`}>
                                                <Clock className={`h-5 w-5 ${new Date((ticket as any).sla_estimado) < new Date() ? "text-red-500" : "text-blue-500"
                                                    }`} />
                                                <div>
                                                    <p className={`text-xs font-bold uppercase ${new Date((ticket as any).sla_estimado) < new Date() ? "text-red-600" : "text-blue-600"
                                                        }`}>
                                                        {new Date((ticket as any).sla_estimado) < new Date() ? "SLA Vencido!" : "Previsão de Solução"}
                                                    </p>
                                                    <p className="text-sm font-medium">
                                                        {format(new Date((ticket as any).sla_estimado), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Solução (se encerrado) */}
                                        {ticket.status === "encerrado" && (
                                            <div className="space-y-3 pt-2">
                                                <h4 className="text-sm font-semibold flex items-center gap-2 text-green-600">
                                                    <CheckCircle2 className="h-4 w-4" /> Solução Registrada
                                                </h4>
                                                <div className="bg-green-50/50 rounded-lg p-4 border border-green-200">
                                                    <MarkdownRenderer content={ticket.solucao_descricao || ""} />
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="timeline" className="mt-0">
                                        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                                            {ticket.ticket_logs?.map((log: any) => (
                                                <div key={log.id} className="relative">
                                                    <div className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-background border-2 border-primary" />
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold capitalize">{log.acao}</span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{log.descricao}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[10px] font-medium">{log.profiles?.nome}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="tasks" className="mt-0">
                                        <div className="space-y-4">
                                            {((ticket as any).tasks || [])?.map((task: any) => (
                                                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{task.title}</span>
                                                        <span className="text-[10px] text-muted-foreground uppercase">{task.status}</span>
                                                    </div>
                                                    {task.completed ? (
                                                        <Badge className="bg-green-500/10 text-green-600">Concluída</Badge>
                                                    ) : (
                                                        <Badge variant="outline">Em aberto</Badge>
                                                    )}
                                                </div>
                                            ))}
                                            {(!(ticket as any).tasks || (ticket as any).tasks.length === 0) && (
                                                <p className="text-sm text-center py-10 text-muted-foreground italic">Nenhuma tarefa vinculada.</p>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="attachments" className="mt-0">
                                        <div className="grid grid-cols-2 gap-3">
                                            {ticket.ticket_anexos?.map((anexo: any) => (
                                                <div key={anexo.id} className="flex items-center justify-between p-3 border rounded-lg group">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        <span className="text-xs truncate">{anexo.nome_arquivo}</span>
                                                    </div>
                                                    <a href={anexo.arquivo_url} target="_blank" className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                        {(!ticket.ticket_anexos || ticket.ticket_anexos.length === 0) && (
                                            <p className="text-sm text-center py-10 text-muted-foreground italic">Nenhum anexo encontrado.</p>
                                        )}
                                    </TabsContent>
                                </div>
                            </ScrollArea>

                            {/* Footer de Ação (Apenas se não encerrado) */}
                            {ticket.status !== "encerrado" && (
                                <div className="p-6 border-t bg-muted/10 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Responder / Solução</label>
                                        <AdvancedRichTextEditor
                                            content={solution}
                                            onChange={setSolution}
                                            placeholder="Descreva a solução ou resposta ao cliente..."
                                            className="bg-background"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1 gap-2"
                                            onClick={handleCloseTicket}
                                            disabled={!solution || closeTicket.isPending}
                                        >
                                            <CheckCircle2 className="h-4 w-4" /> Encerra Ticket
                                        </Button>
                                        <Button variant="outline" className="gap-2">
                                            <Send className="h-4 w-4" /> Enviar Resposta
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Tabs>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
