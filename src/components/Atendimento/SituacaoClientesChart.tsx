import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const getSituacaoColor = (situacao: string) => {
    switch (situacao) {
        case "resultados_normais": return "#3b82f6"; // blue-500
        case "alerta": return "#ef4444"; // red-500
        case "nao_iniciado": return "#6b7280"; // gray-500
        case "ponto_de_atencao": return "#eab308"; // yellow-500
        case "indo_bem": return "#22c55e"; // green-500
        default: return "#9ca3af"; // gray-400
    }
};

const formatSituacaoName = (situacao: string) => {
    switch (situacao) {
        case "resultados_normais": return "Resultados Normais";
        case "alerta": return "Alerta";
        case "nao_iniciado": return "Não Iniciado";
        case "ponto_de_atencao": return "Ponto de Atenção";
        case "indo_bem": return "Indo Bem";
        default: return "Outros / Sem Situação";
    }
};

// Custom percentage label
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label if < 5%
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export function SituacaoClientesChart() {
    const [selectedSlice, setSelectedSlice] = useState<any | null>(null);
    const navigate = useNavigate();

    const { data: clientes = [], isLoading } = useQuery({
        queryKey: ["situacao-clientes-distribuicao"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome, situacao_cliente")
                .eq("is_active", true);

            if (error) throw new Error(error.message);
            return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const chartData = useMemo(() => {
        if (!clientes.length) return [];

        const groups: Record<string, any[]> = {};
        clientes.forEach(c => {
            const key = c.situacao_cliente || "sem_situacao";
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });

        return Object.entries(groups)
            .map(([key, clientsList]) => ({
                id: key,
                name: formatSituacaoName(key),
                value: clientsList.length,
                color: getSituacaoColor(key),
                clients: clientsList
            }))
            .sort((a, b) => b.value - a.value);
    }, [clientes]);

    return (
        <>
            <Card>
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                        Situação dos Clientes
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 h-[240px] flex items-center justify-center">
                    {isLoading ? (
                        <div className="h-32 w-32 animate-pulse bg-muted rounded-full" />
                    ) : chartData.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum dado encontrado</p>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    onClick={(data, index) => setSelectedSlice(data.payload)}
                                    className="cursor-pointer outline-none"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [`${value} clientes`, "Quantidade"]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '11px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selectedSlice} onOpenChange={(open) => !open && setSelectedSlice(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedSlice?.color }} />
                            {selectedSlice?.name} ({selectedSlice?.value} clientes)
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea className="max-h-[300px] mt-2 pr-4">
                        <div className="flex flex-col gap-2">
                            {selectedSlice?.clients?.map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                    <span className="text-sm font-medium">{c.nome}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => navigate(`/clientes?id=${c.id}`)}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}
