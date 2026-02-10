import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Plus, ChevronRight, Clock, Beaker } from "lucide-react";
import { useLaboratorioTestes } from "@/hooks/useLaboratorioTestes";
import { NovoTesteModal } from "@/components/LaboratorioTestes/NovoTesteModal";
import { DEFAULT_FILTERS, type TesteFilters, STATUS_LABELS } from "@/types/laboratorio-testes";

interface TestesClientePanelProps {
    clienteId: string;
    clienteNome: string;
    isAuthenticated: boolean;
    canCreateContent: boolean;
    currentUserId: string | null;
    currentColaboradorId: string | null;
}

const STATUS_PILL_COLORS: Record<string, string> = {
    planejado: "bg-slate-100 text-slate-700 border-slate-200",
    rodando: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pausado: "bg-yellow-100 text-yellow-700 border-yellow-200",
    concluido: "bg-blue-100 text-blue-700 border-blue-200",
    cancelado: "bg-red-100 text-red-700 border-red-200",
};

export const TestesClientePanel = ({
    clienteId,
    clienteNome,
    isAuthenticated,
    canCreateContent,
    currentUserId,
    currentColaboradorId
}: TestesClientePanelProps) => {
    const [filters] = useState<TesteFilters>({
        ...DEFAULT_FILTERS,
        cliente_id: clienteId
    });

    const { testes, loading, createTeste, refetch } = useLaboratorioTestes(filters, currentUserId || undefined, currentColaboradorId || undefined);

    const [showNovoModal, setShowNovoModal] = useState(false);

    if (testes.length === 0 && !isAuthenticated) {
        return null;
    }

    return (
        <div className="h-full flex flex-col">
            <Card className="border-none shadow-md flex-1 bg-white/90 backdrop-blur-md overflow-hidden rounded-3xl border border-white/40 ring-1 ring-black/5">
                <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center shadow-inner">
                                <Beaker className="h-6 w-6 text-violet-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">
                                    Testes Rodando
                                </h2>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mt-1.5 opacity-60">Laboratório</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="h-7 w-7 rounded-full p-0 flex items-center justify-center bg-violet-100/80 text-violet-700 font-black border-none text-[11px] shadow-sm">
                                {testes.length}
                            </Badge>
                            {isAuthenticated && canCreateContent && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setShowNovoModal(true)}
                                    className="h-10 w-10 text-violet-600 hover:text-violet-700 hover:bg-violet-100 rounded-2xl transition-all"
                                >
                                    <Plus className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Carregando testes...</div>
                        ) : testes.length > 0 ? (
                            testes.map(teste => (
                                <div
                                    key={teste.id}
                                    className="p-4 bg-white/60 hover:bg-white rounded-[24px] border border-transparent hover:border-violet-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 cursor-pointer group relative overflow-hidden"
                                    onClick={() => window.open(`/laboratorio-testes/${teste.id}`, '_blank')}
                                >
                                    {/* Status Icon container mimicking the image */}
                                    <div className={`w-12 h-12 rounded-[18px] shrink-0 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${teste.status === 'rodando' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                                        <Clock className={`h-6 w-6 ${teste.status === 'rodando' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-black text-gray-900 truncate tracking-tight mb-0.5">
                                            {teste.nome}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-bold truncate">
                                            <span className="opacity-80">{clienteNome.split(' ')[0]}</span>
                                            {teste.funil && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                    <span className="text-violet-600/70">{teste.funil}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Badge className={`text-[10px] h-7 px-4 rounded-full border-none font-black shadow-sm tracking-wide ${STATUS_PILL_COLORS[teste.status]}`}>
                                            {STATUS_LABELS[teste.status]}
                                        </Badge>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 group-hover:text-violet-500 group-hover:bg-violet-50 transition-all">
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                <FlaskConical className="h-12 w-12 text-violet-200 mx-auto mb-4" />
                                <p className="text-base font-bold text-gray-400">Nenhum teste ativo</p>
                                <p className="text-xs text-gray-400/70 mt-1 max-w-[200px] mx-auto">Prepare seus experimentos para otimizar os resultados.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <NovoTesteModal
                open={showNovoModal}
                onOpenChange={setShowNovoModal}
                onSuccess={refetch}
                createTeste={createTeste}
                currentColaboradorId={currentColaboradorId || undefined}
                initialData={{ cliente_id: clienteId }}
            />
        </div>
    );
};
