import { useState } from "react";
import { Ticket } from "@/hooks/useTickets";
import { TicketCard } from "./TicketCard";
import { TicketDetailsDrawer } from "./TicketDetailsDrawer";
import { Badge } from "@/components/ui/badge";

interface TicketBoardProps {
    tickets: Ticket[];
}

const statusColumns = [
    { id: "aberto", label: "Aberto", color: "bg-blue-500" },
    { id: "em_atendimento", label: "Em Atendimento", color: "bg-yellow-500" },
    { id: "aguardando_cliente", label: "Aguardando Cliente", color: "bg-purple-500" },
    { id: "encerrado", label: "Encerrado", color: "bg-green-500" },
];

export function TicketBoard({ tickets }: TicketBoardProps) {
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    const getTicketsByStatus = (status: string) => {
        return tickets.filter((t) => t.status === status);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[500px]">
            {statusColumns.map((column) => {
                const columnTickets = getTicketsByStatus(column.id);
                return (
                    <div key={column.id} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-2 py-1">
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${column.color}`} />
                                <h3 className="font-semibold text-sm">{column.label}</h3>
                            </div>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                {columnTickets.length}
                            </Badge>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-2 flex-1 flex flex-col gap-3 min-h-[200px] border-2 border-dashed border-transparent hover:border-muted/50 transition-colors">
                            {columnTickets.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                                    <p className="text-xs text-muted-foreground italic">Nenhum ticket</p>
                                </div>
                            ) : (
                                columnTickets.map((ticket) => (
                                    <TicketCard
                                        key={ticket.id}
                                        ticket={ticket}
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                );
            })}

            <TicketDetailsDrawer
                ticketId={selectedTicketId || ""}
                isOpen={!!selectedTicketId}
                onClose={() => setSelectedTicketId(null)}
            />
        </div>
    );
}
