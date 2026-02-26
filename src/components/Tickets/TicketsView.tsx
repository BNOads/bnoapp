import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TicketTable } from "./TicketTable";
import { CreateTicketModal } from "./CreateTicketModal";
import { TicketStats } from "./TicketStats";

export function TicketsView({ embedded = false }: { embedded?: boolean }) {
    const { userData } = useCurrentUser();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showOnlyMine, setShowOnlyMine] = useState(false);

    const filters = {
        responsavel_id: showOnlyMine ? userData?.user_id : undefined,
    };

    const { data: tickets = [], isLoading } = useTickets(filters);

    return (
        <div className={embedded ? "space-y-4" : "space-y-4 container mx-auto py-6"}>
            {!embedded && (
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Central de Tickets</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Gerencie solicitações de suporte e atendimento de forma centralizada.
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Novo Ticket
                    </Button>
                </div>
            )}

            {/* Stats */}
            <TicketStats tickets={tickets} />

            {/* Toggle row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Switch
                        id="only-mine"
                        checked={showOnlyMine}
                        onCheckedChange={setShowOnlyMine}
                    />
                    <Label htmlFor="only-mine" className="text-sm cursor-pointer select-none">
                        Somente meus tickets
                    </Label>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                        {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
                    </span>
                    {embedded && (
                        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-1.5 h-8">
                            <Plus className="h-3.5 w-3.5" /> Novo Ticket
                        </Button>
                    )}
                </div>
            </div>

            {/* Table / loading */}
            {isLoading ? (
                <div className="py-20 text-center text-muted-foreground italic">
                    Carregando tickets...
                </div>
            ) : (
                <TicketTable tickets={tickets} />
            )}

            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
