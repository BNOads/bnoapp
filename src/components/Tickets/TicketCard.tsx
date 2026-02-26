import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Ticket } from "@/hooks/useTickets";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, MessageSquare, Paperclip, AlertTriangle } from "lucide-react";

interface TicketCardProps {
    ticket: Ticket;
    onClick: () => void;
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "critica": return "bg-red-500";
            case "alta": return "bg-orange-500";
            case "media": return "bg-blue-500";
            case "baixa": return "bg-slate-400";
            default: return "bg-slate-200";
        }
    };

    return (
        <Card
            className="group cursor-pointer hover:shadow-md transition-all border-l-4 hover:border-l-primary"
            style={{ borderLeftColor: getPriorityColor(ticket.prioridade || "") }}
            onClick={onClick}
        >
            <CardHeader className="p-3 pb-0">
                <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">#{ticket.numero}</span>
                    {ticket.prioridade === "critica" && (
                        <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                    )}
                </div>
                <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {ticket.descricao}
                </h3>
            </CardHeader>

            <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5 py-0 px-1.5 font-normal">
                        {ticket.categoria}
                    </Badge>
                    <span className="text-[11px] font-medium truncate">
                        {ticket.clientes?.nome || "Sem cliente"}
                    </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span className="text-[10px]">0</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            <span className="text-[10px]">0</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        <Clock className="h-3 w-3" />
                        <span>
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="p-3 pt-0 border-top bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5 border border-background">
                        <AvatarFallback className="text-[8px]">
                            {ticket.profiles?.nome?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                        {ticket.profiles?.nome || "Pendente"}
                    </span>
                </div>

                {ticket.sla_estimado && ticket.status !== "encerrado" && (
                    <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] font-medium text-primary">SLA</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
