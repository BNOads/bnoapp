import { useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useMeetings } from "@/hooks/useMeetings";
import { RegistroReuniaoModal } from "@/components/Atendimento/RegistroReuniaoModal";
import { VALIDACAO_LABELS } from "@/types/laboratorio-testes";

const CLASSIFICACAO_COLORS: Record<string, string> = {
    em_teste: "bg-yellow-100 text-yellow-700 border-yellow-300",
    deu_bom: "bg-green-100 text-green-700 border-green-300",
    deu_ruim: "bg-red-100 text-red-700 border-red-300",
    inconclusivo: "bg-gray-100 text-gray-600 border-gray-300",
};

const RISCO_COLORS: Record<string, string> = {
    baixo: "bg-green-100 text-green-700",
    medio: "bg-yellow-100 text-yellow-700",
    alto: "bg-red-100 text-red-700",
};

export function ReunioesList() {
    const [search, setSearch] = useState("");
    const [classificacaoFilter, setClassificacaoFilter] = useState("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<any>(null);

    // Last 90 days
    const dataInicio = format(subDays(new Date(), 90), "yyyy-MM-dd");

    const { data: meetings = [], isLoading } = useMeetings({ data_inicio: dataInicio });

    const filtered = meetings.filter((m: any) => {
        const isActive = (m.clientes as any)?.is_active !== false;
        if (!isActive) return false;

        const clienteName = (m.clientes as any)?.nome ?? "";
        const matchSearch = clienteName.toLowerCase().includes(search.toLowerCase());
        const matchClass = classificacaoFilter === "all" || m.classificacao_reuniao === classificacaoFilter;
        return matchSearch && matchClass;
    });

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-8"
                            placeholder="Buscar por cliente..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={classificacaoFilter} onValueChange={setClassificacaoFilter}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Classificação" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {Object.entries(VALIDACAO_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button size="sm" onClick={() => { setEditingMeeting(null); setModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Reunião
                </Button>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-muted py-12 text-center text-sm text-muted-foreground">
                    Nenhuma reunião encontrada nos últimos 90 dias.
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((m: any) => (
                        <Card
                            key={m.id}
                            className="cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => { setEditingMeeting(m); setModalOpen(true); }}
                        >
                            <CardContent className="py-3 px-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{(m.clientes as any)?.nome ?? "—"}</span>
                                            {m.nivel_risco && (
                                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${RISCO_COLORS[m.nivel_risco]}`}>
                                                    Risco {m.nivel_risco}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(parseISO(m.data), "d 'de' MMMM yyyy", { locale: ptBR })}
                                            {m.hora_inicio && ` · ${m.hora_inicio}`}
                                            {m.hora_fim && ` – ${m.hora_fim}`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {m.classificacao_reuniao && (
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${CLASSIFICACAO_COLORS[m.classificacao_reuniao]}`}
                                            >
                                                {VALIDACAO_LABELS[m.classificacao_reuniao as keyof typeof VALIDACAO_LABELS]}
                                            </Badge>
                                        )}
                                        {m.nota && (
                                            <span className="text-xs text-muted-foreground">Nota: {m.nota}/5</span>
                                        )}
                                    </div>
                                </div>
                                {(m.pontos_discutidos || m.proximos_passos) && (
                                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                                        {m.pontos_discutidos || m.proximos_passos}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <RegistroReuniaoModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                meeting={editingMeeting}
            />
        </div>
    );
}
