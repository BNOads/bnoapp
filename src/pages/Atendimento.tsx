import { CalendarDays, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EscalaReunioes } from "@/components/Atendimento/EscalaReunioes";
import { ClientesEmAlerta } from "@/components/Atendimento/ClientesEmAlerta";
import { AnaliseReunioes } from "@/components/Atendimento/AnaliseReunioes";
import { LiveMeetingBanner } from "@/components/Atendimento/LiveMeetingBanner";
import { AtendimentoKPIs } from "@/components/Atendimento/AtendimentoKPIs";

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
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-foreground">Atendimento ao Cliente</h1>
                <p className="text-sm text-muted-foreground">
                    Central de reuniões, alertas e análise de saúde dos clientes.
                </p>
            </div>

            {/* Clientes em Alerta — horizontal strip at the top */}
            <ClientesEmAlerta />

            {/* Today's meeting KPIs */}
            <AtendimentoKPIs />

            {/* Live Meeting Banner */}
            <LiveMeetingBanner />

            {/* Escala de Reuniões */}
            <SectionCard icon={CalendarDays} title="Escala de Reuniões">
                <EscalaReunioes />
            </SectionCard>

            {/* Análise */}
            <SectionCard icon={BarChart3} title="Análise de Reuniões">
                <AnaliseReunioes />
            </SectionCard>
        </div>
    );
}
