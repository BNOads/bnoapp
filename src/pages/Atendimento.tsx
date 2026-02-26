import { CalendarDays, BarChart3, MessageSquare, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { EscalaReunioes } from "@/components/Atendimento/EscalaReunioes";
import { ClientesEmAlerta } from "@/components/Atendimento/ClientesEmAlerta";
import { AnaliseReunioes } from "@/components/Atendimento/AnaliseReunioes";
import { LiveMeetingBanner } from "@/components/Atendimento/LiveMeetingBanner";
import { AtendimentoKPIs } from "@/components/Atendimento/AtendimentoKPIs";
import { MensagensSemanaisCard } from "@/components/Atendimento/MensagensSemanaisCard";
import { ResumoReferenciasCard } from "@/components/Atendimento/ResumoReferenciasCard";
import { TicketsView } from "@/components/Tickets/TicketsView";

function SectionCard({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                {children}
            </CardContent>
        </Card>
    );
}

export default function Atendimento() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "reunioes";

    const handleTabChange = (value: string) => {
        setSearchParams({ tab: value });
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-foreground">Atendimento ao Cliente</h1>
                <p className="text-sm text-muted-foreground">
                    Central de reuniões, tickets e análise de saúde dos clientes.
                </p>
            </div>

            {/* Clientes em Alerta — horizontal strip at the top */}
            <ClientesEmAlerta />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="reunioes" className="gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Reuniões
                    </TabsTrigger>
                    <TabsTrigger value="tickets" className="gap-2">
                        <Ticket className="h-4 w-4" />
                        Tickets
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="reunioes" className="mt-6 space-y-6">
                    {/* Resumo e Referências Badge */}
                    <ResumoReferenciasCard />

                    {/* Today's meeting KPIs */}
                    <AtendimentoKPIs />

                    {/* Live Meeting Banner */}
                    <LiveMeetingBanner />

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-4 space-y-6">
                            <SectionCard icon={MessageSquare} title="Mensagens Semanais">
                                <MensagensSemanaisCard />
                            </SectionCard>

                            <SectionCard icon={BarChart3} title="Análise de Reuniões">
                                <AnaliseReunioes />
                            </SectionCard>
                        </div>

                        <div className="lg:col-span-8 space-y-6">
                            <SectionCard icon={CalendarDays} title="Escala de Reuniões">
                                <EscalaReunioes />
                            </SectionCard>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="tickets" className="mt-6">
                    <TicketsView embedded />
                </TabsContent>
            </Tabs>
        </div>
    );
}
