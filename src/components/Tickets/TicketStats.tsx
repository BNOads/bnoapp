import { Ticket } from "@/hooks/useTickets";
import { Inbox, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

interface TicketStatsProps {
    tickets: Ticket[];
}

export function TicketStats({ tickets }: TicketStatsProps) {
    const stats = useMemo(() => {
        const total = tickets.length;
        const emAberto = tickets.filter(t => t.status === "aberto" || t.status === "em_atendimento").length;
        const now = new Date();
        const atrasados = tickets.filter(t =>
            t.sla_limite && new Date(t.sla_limite) < now && t.status !== "encerrado"
        ).length;
        const resolvidos = tickets.filter(t => t.status === "encerrado").length;
        return { total, emAberto, atrasados, resolvidos };
    }, [tickets]);

    const items = [
        {
            label: "Total",
            value: stats.total,
            icon: Inbox,
            borderColor: "border-l-slate-400",
            iconColor: "text-slate-500",
            valueColor: "text-slate-800 dark:text-slate-100",
        },
        {
            label: "Em aberto",
            value: stats.emAberto,
            icon: Clock,
            borderColor: "border-l-blue-500",
            iconColor: "text-blue-500",
            valueColor: "text-blue-600 dark:text-blue-400",
        },
        {
            label: "Atrasados",
            value: stats.atrasados,
            icon: AlertTriangle,
            borderColor: "border-l-red-500",
            iconColor: "text-red-500",
            valueColor: "text-red-600 dark:text-red-400",
        },
        {
            label: "Resolvidos",
            value: stats.resolvidos,
            icon: CheckCircle2,
            borderColor: "border-l-green-500",
            iconColor: "text-green-500",
            valueColor: "text-green-600 dark:text-green-400",
        },
    ];

    return (
        <div className="flex items-stretch gap-0 border rounded-xl overflow-hidden bg-card shadow-sm">
            {items.map((item, index) => (
                <div
                    key={index}
                    className={`flex-1 flex items-center gap-3 px-6 py-4 border-l-4 ${item.borderColor} ${
                        index < items.length - 1 ? "border-r border-border" : ""
                    }`}
                >
                    <item.icon className={`h-5 w-5 shrink-0 ${item.iconColor}`} />
                    <div>
                        <p className={`text-2xl font-bold leading-none ${item.valueColor}`}>{item.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
