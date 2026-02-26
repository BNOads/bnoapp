import { useTickets } from "@/hooks/useTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketCheck, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export function TicketSummaryWidget() {
    const navigate = useNavigate();
    const { data: tickets = [], isLoading } = useTickets();

    const openTickets = tickets.filter(t => t.status !== 'encerrado');
    const criticalTickets = openTickets.filter(t => t.prioridade === 'critica');
    const overdueTickets = openTickets.filter(t => new Date(t.sla_estimado) < new Date());

    if (isLoading) {
        return (
            <Card className="animate-pulse">
                <CardHeader className="h-12 bg-muted/50" />
                <CardContent className="h-24 bg-muted/20" />
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
            <CardHeader className="pb-2 border-b bg-background/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <TicketCheck className="h-4 w-4 text-primary" /> Central de Tickets
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1" onClick={() => navigate('/atendimento?tab=tickets')}>
                        Ver todos <ArrowRight className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Abertos</span>
                    <span className="text-2xl font-black">{openTickets.length}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Críticos</span>
                    <span className="text-2xl font-black text-red-500">{criticalTickets.length}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Fora SLA</span>
                    <span className="text-2xl font-black text-orange-500">{overdueTickets.length}</span>
                </div>
            </CardContent>
            {criticalTickets.length > 0 && (
                <div className="px-4 pb-4">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                        <span className="text-[10px] font-bold text-red-700 uppercase">Atenção: {criticalTickets.length} ticket(s) crítico(s) aguardando!</span>
                    </div>
                </div>
            )}
        </Card>
    );
}
