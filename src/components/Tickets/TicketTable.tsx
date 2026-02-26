import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Ticket } from "@/hooks/useTickets";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { TicketDetailsDrawer } from "./TicketDetailsDrawer";

interface TicketTableProps {
    tickets: Ticket[];
}

export function TicketTable({ tickets }: TicketTableProps) {
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "aberto":
                return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">Aberto</Badge>;
            case "em_atendimento":
                return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20">Em Atendimento</Badge>;
            case "aguardando_cliente":
                return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20">Aguardando Cliente</Badge>;
            case "encerrado":
                return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">Encerrado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "critica":
                return (
                    <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Crítica
                    </Badge>
                );
            case "alta":
                return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Alta</Badge>;
            case "media":
                return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Média</Badge>;
            case "baixa":
                return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Baixa</Badge>;
            default:
                return <Badge variant="outline">{priority}</Badge>;
        }
    };

    return (
        <div className="border rounded-lg bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[100px]">Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead className="text-right">Aberto em</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tickets.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground whitespace-nowrap">
                                Nenhum ticket encontrado.
                            </TableCell>
                        </TableRow>
                    ) : (
                        tickets.map((ticket) => (
                            <TableRow
                                key={ticket.id}
                                className="cursor-pointer hover:bg-muted/30 transition-colors"
                                onClick={() => setSelectedTicketId(ticket.id)}
                            >
                                <TableCell className="font-mono text-xs font-semibold">
                                    #{ticket.numero}
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap">
                                    {ticket.clientes?.nome || "Sem cliente"}
                                </TableCell>
                                <TableCell className="capitalize">{ticket.categoria}</TableCell>
                                <TableCell>{getStatusBadge(ticket.status || "")}</TableCell>
                                <TableCell>{getPriorityBadge(ticket.prioridade || "")}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px]">
                                                {ticket.profiles?.nome?.substring(0, 2).toUpperCase() || "??"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm truncate max-w-[120px]">
                                            {ticket.profiles?.nome || "Não atribuído"}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {ticket.status === "encerrado" ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-xs font-medium">
                                                    {ticket.sla_estimado ? format(new Date(ticket.sla_estimado), "dd/MM HH:mm") : "--"}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                    {format(new Date(ticket.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <TicketDetailsDrawer
                ticketId={selectedTicketId || ""}
                isOpen={!!selectedTicketId}
                onClose={() => setSelectedTicketId(null)}
            />
        </div>
    );
}
