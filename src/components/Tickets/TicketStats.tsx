import { Card, CardContent } from "@/components/ui/card";
import { Ticket } from "@/hooks/useTickets";
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    Inbox,
    Timer
} from "lucide-react";
import { useMemo } from "react";

interface TicketStatsProps {
    tickets: Ticket[];
}

export function TicketStats({ tickets }: TicketStatsProps) {
    const stats = useMemo(() => {
        const total = tickets.length;
        const abertos = tickets.filter(t => t.status === "aberto").length;
        const emAtendimento = tickets.filter(t => t.status === "em_atendimento").length;
        const aguardandoCliente = tickets.filter(t => t.status === "aguardando_cliente").length;
        const encerrados = tickets.filter(t => t.status === "encerrado").length;
        const prioritarios = tickets.filter(t => t.prioridade === "critica" && t.status !== "encerrado").length;

        return { total, abertos, emAtendimento, aguardandoCliente, encerrados, prioritarios };
    }, [tickets]);

    const items = [
        {
            label: "Total de Tickets",
            value: stats.total,
            icon: Inbox,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            label: "Em Aberto",
            value: stats.abertos + stats.emAtendimento,
            icon: Clock,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
        },
        {
            label: "Críticos",
            value: stats.prioritarios,
            icon: AlertCircle,
            color: "text-red-500",
            bg: "bg-red-500/10",
        },
        {
            label: "Encerrados",
            value: stats.encerrados,
            icon: CheckCircle2,
            color: "text-green-500",
            bg: "bg-green-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item, index) => (
                <Card key={index} className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${item.bg}`}>
                                <item.icon className={`h-5 w-5 ${item.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                                <p className="text-2xl font-bold">{item.value}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
