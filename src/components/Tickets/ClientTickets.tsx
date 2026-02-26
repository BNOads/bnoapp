import { useTickets } from "@/hooks/useTickets";
import { TicketTable } from "./TicketTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateTicketModal } from "./CreateTicketModal";

interface ClientTicketsProps {
    clienteId: string;
}

export function ClientTickets({ clienteId }: ClientTicketsProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { data: tickets = [], isLoading } = useTickets({ cliente_id: clienteId });

    return (
        <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Tickets do Cliente</h3>
                <Button size="sm" variant="outline" className="h-8 gap-2" onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Abrir Ticket
                </Button>
            </div>

            {isLoading ? (
                <div className="py-10 text-center text-sm text-muted-foreground italic">Carregando tickets...</div>
            ) : (
                <TicketTable tickets={tickets} />
            )}

            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                defaultClienteId={clienteId}
            />
        </div>
    );
}
