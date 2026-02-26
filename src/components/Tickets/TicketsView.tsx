import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Filter } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TicketTable } from "./TicketTable";
import { TicketBoard } from "./TicketBoard";
import { CreateTicketModal } from "./CreateTicketModal";
import { TicketStats } from "./TicketStats";

export function TicketsView() {
    const { userData } = useCurrentUser();
    const [viewMode, setViewMode] = useState<"list" | "board">("board");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("meus");

    const filters = {
        responsavel_id: activeTab === "meus" ? userData?.id : undefined,
    };

    const { data: tickets = [], isLoading } = useTickets(filters);

    return (
        <div className="space-y-6 container mx-auto py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Central de Tickets</h1>
                    <p className="text-muted-foreground">
                        Gerencie solicitações de suporte e atendimento de forma centralizada.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="border rounded-md p-1 flex items-center bg-background">
                        <Button
                            variant={viewMode === "board" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("board")}
                            className="h-8 w-8 p-0"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className="h-8 w-8 p-0"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Novo Ticket
                    </Button>
                </div>
            </div>

            <TicketStats tickets={tickets} />

            <Tabs defaultValue="meus" className="w-full" onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="meus">Meus Tickets</TabsTrigger>
                        <TabsTrigger value="todos">Todos os Tickets</TabsTrigger>
                        <TabsTrigger value="dashboard">Analytics</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                            <Filter className="h-4 w-4" /> Filtros
                        </Button>
                    </div>
                </div>

                <TabsContent value="meus" className="mt-0">
                    {isLoading ? (
                        <div className="py-20 text-center text-muted-foreground italic">Carregando seus tickets...</div>
                    ) : viewMode === "board" ? (
                        <TicketBoard tickets={tickets} />
                    ) : (
                        <TicketTable tickets={tickets} />
                    )}
                </TabsContent>

                <TabsContent value="todos" className="mt-0">
                    {isLoading ? (
                        <div className="py-20 text-center text-muted-foreground italic">Carregando todos os tickets...</div>
                    ) : viewMode === "board" ? (
                        <TicketBoard tickets={tickets} />
                    ) : (
                        <TicketTable tickets={tickets} />
                    )}
                </TabsContent>

                <TabsContent value="dashboard" className="mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dashboard Executivo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground italic">Em desenvolvimento...</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
