import { CalendarDays, BarChart3, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { EscalaReunioes } from "@/components/Atendimento/EscalaReunioes";
import { ClientesEmAlerta } from "@/components/Atendimento/ClientesEmAlerta";
import { AnaliseReunioes } from "@/components/Atendimento/AnaliseReunioes";
import { LiveMeetingBanner } from "@/components/Atendimento/LiveMeetingBanner";
import { MensagensSemanaisCard } from "@/components/Atendimento/MensagensSemanaisCard";
import { ClientesEmOnboarding } from "@/components/Atendimento/ClientesEmOnboarding";
import { SituacaoClientesChart } from "@/components/Atendimento/SituacaoClientesChart";
import { MatrizPresencaReunioes } from "@/components/Atendimento/MatrizPresencaReunioes";
import { DiarioAtendimento } from "@/components/Atendimento/DiarioAtendimento";
import { EscalaContatos } from "@/components/Atendimento/EscalaContatos";
import { PhoneCall } from "lucide-react";

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
                    Central de reuniões e análise de saúde dos clientes.
                </p>
            </div>

            {/* Alertas e Faixas — horizontal strips at the top foram removidos do topo e transferidos para o sidebar */}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                <div className="lg:col-span-4 space-y-6">
                    {/* Alertas passados para view de Card na sidebar */}
                    <LiveMeetingBanner />
                    <ClientesEmAlerta />
                    <ClientesEmOnboarding />

                    <SituacaoClientesChart />

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

                    <SectionCard icon={PhoneCall} title="Escala de Contatos">
                        <EscalaContatos />
                    </SectionCard>

                    {/* Diário de Atendimento Global */}
                    <DiarioAtendimento />
                </div>
            </div>

            {/* Matriz de Presença (Top Level) */}
            <div className="pt-2">
                <MatrizPresencaReunioes />
            </div>
        </div>
    );
}
