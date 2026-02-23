import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rocket, Calendar, DollarSign, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAuth } from "@/components/Auth/AuthContext";
import { format, differenceInDays, differenceInHours, differenceInMinutes, isFuture, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Lancamento {
    id: string;
    nome_lancamento: string;
    status_lancamento: string;
    investimento_total: number;
    data_inicio_captacao: string | null;
    data_fim_captacao: string | null;
    data_inicio_aquecimento: string | null;
    data_inicio_cpl: string | null;
    data_inicio_carrinho: string | null;
    data_fechamento: string | null;
    checklist_configuracao: Record<string, boolean> | null;
    gestor_responsavel: {
        nome: string;
        avatar_url: string | null;
    } | null;
}

const LaunchTimer = ({ lancamento }: { lancamento: Lancamento }) => {
    const [timeLeft, setTimeLeft] = useState<{ dias: number; horas: number; minutos: number } | null>(null);
    const [nextEvent, setNextEvent] = useState<{ label: string; data: string } | null>(null);

    useEffect(() => {
        const datasChave = [
            { label: "Início", data: lancamento.data_inicio_captacao },
            { label: "Fim da Captação", data: lancamento.data_fim_captacao },
            { label: "Aquecimento", data: lancamento.data_inicio_aquecimento },
            { label: "CPL", data: lancamento.data_inicio_cpl },
            { label: "Carrinho", data: lancamento.data_inicio_carrinho },
            { label: "Fechamento", data: lancamento.data_fechamento }
        ].filter((d): d is { label: string; data: string } => d.data !== null);

        const calcular = () => {
            const agora = new Date();
            const proximo = datasChave
                .filter(d => isFuture(parseISO(d.data)))
                .sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime())[0];

            setNextEvent(proximo || null);

            if (proximo) {
                const dataEvento = parseISO(proximo.data);
                const dias = differenceInDays(dataEvento, agora);
                const horas = differenceInHours(dataEvento, agora) % 24;
                const minutos = differenceInMinutes(dataEvento, agora) % 60;
                setTimeLeft({ dias, horas, minutos });
            } else {
                setTimeLeft(null);
            }
        };

        calcular();
        const interval = setInterval(calcular, 60000);
        return () => clearInterval(interval);
    }, [lancamento]);

    if (!nextEvent || !timeLeft) return <span className="text-xs text-muted-foreground">-</span>;

    return (
        <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground font-bold mb-0 uppercase tracking-wide leading-none">{nextEvent.label}</span>
            <Badge variant={timeLeft.dias > 7 ? "default" : "destructive"} className="text-[11px] py-0 px-2 min-h-[22px]">
                {timeLeft.dias > 0 ? `${timeLeft.dias} dias restantes` : 'Hoje'}
            </Badge>
        </div>
    );
};

export function LancamentosSidebar() {
    const navigate = useNavigate();
    const { isAdmin, isGestorProjetos } = useUserPermissions();
    const { user } = useAuth();
    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [loading, setLoading] = useState(true);

    const canSeeAll = isAdmin || isGestorProjetos;

    useEffect(() => {
        const carregarLancamentos = async () => {
            if (!user?.id) return;

            try {
                setLoading(true);

                const { data: colaboradorData } = await supabase
                    .from('colaboradores')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!colaboradorData) {
                    setLancamentos([]);
                    return;
                }

                let query = supabase
                    .from('lancamentos')
                    .select(`
                        id, 
                        nome_lancamento, 
                        status_lancamento, 
                        investimento_total, 
                        data_inicio_captacao, 
                        data_fim_captacao,
                        data_inicio_aquecimento,
                        data_inicio_cpl,
                        data_inicio_carrinho,
                        data_fechamento,
                        checklist_configuracao,
                        gestor_responsavel:colaboradores!lancamentos_gestor_responsavel_id_fkey(nome, avatar_url)
                    `)
                    .eq('ativo', true)
                    .in('status_lancamento', ['em_captacao', 'cpl', 'remarketing'])
                    .order('data_inicio_captacao', { ascending: false, nullsFirst: false })
                    .limit(5);

                if (!canSeeAll) {
                    query = query.eq('gestor_responsavel_id', colaboradorData.id);
                }

                const { data, error } = await query;

                if (error) throw error;

                setLancamentos((data || []).map(item => ({
                    ...item,
                    checklist_configuracao: item.checklist_configuracao as Record<string, boolean> | null,
                    gestor_responsavel: item.gestor_responsavel as any
                })));
            } catch (error) {
                console.error('Erro ao carregar lançamentos:', error);
            } finally {
                setLoading(false);
            }
        };

        carregarLancamentos();
    }, [user?.id, canSeeAll]);

    const getStatusColor = (status: string) => {
        const statusColors: Record<string, string> = {
            'em_captacao': 'bg-blue-500/10 text-blue-600 border-blue-200',
            'cpl': 'bg-purple-500/10 text-purple-600 border-purple-200',
            'remarketing': 'bg-orange-500/10 text-orange-600 border-orange-200',
        };
        return statusColors[status] || 'bg-muted text-muted-foreground';
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            'em_captacao': 'Capt.',
            'cpl': 'CPL',
            'remarketing': 'Rmk.',
        };
        return statusMap[status] || status;
    };

    if (loading) {
        return (
            <Card className="h-[250px] animate-pulse">
                <CardHeader className="pb-1.5 pt-3 px-3">
                    <div className="h-4 w-32 bg-muted rounded" />
                </CardHeader>
                <CardContent className="space-y-2 p-2 mt-2">
                    {[1, 2].map(i => (
                        <div key={i} className="p-2 rounded-lg border bg-card/50 h-[68px]" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (lancamentos.length === 0) return null;

    return (
        <Card>
            <CardHeader className="pb-3 px-4 pt-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span>Lançamentos Ativos</span>
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => navigate('/ferramentas/lancamentos')}>
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
                {[...lancamentos].sort((a, b) => {
                    const getProximoEvento = (l: Lancamento) => {
                        const datas = [
                            l.data_inicio_captacao, l.data_fim_captacao, l.data_inicio_aquecimento,
                            l.data_inicio_cpl, l.data_inicio_carrinho, l.data_fechamento
                        ].filter((d): d is string => d !== null);
                        const futuros = datas.filter(d => isFuture(parseISO(d))).map(d => parseISO(d).getTime()).sort((x, y) => x - y);
                        return futuros.length > 0 ? futuros[0] : null;
                    };
                    const nextA = getProximoEvento(a);
                    const nextB = getProximoEvento(b);
                    if (!nextA && !nextB) return 0;
                    if (!nextA) return 1;
                    if (!nextB) return -1;
                    return nextA - nextB;
                }).map((lancamento) => {
                    const checklist = lancamento.checklist_configuracao || {};
                    const pendingCount = Object.values(checklist).filter(val => val === false).length;

                    return (
                        <div
                            key={lancamento.id}
                            onClick={() => navigate(`/lancamentos/${lancamento.id}`)}
                            className="flex flex-col p-1.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-blue-500 cursor-pointer transition-all gap-1.5 shadow-sm group"
                        >
                            {/* Row 1: Title + Manager */}
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold text-[15px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-2" title={lancamento.nome_lancamento}>
                                    {lancamento.nome_lancamento}
                                </span>
                                {lancamento.gestor_responsavel && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Avatar className="h-6 w-6 border border-slate-100 dark:border-slate-800">
                                            <AvatarImage src={lancamento.gestor_responsavel.avatar_url || undefined} alt={lancamento.gestor_responsavel.nome} />
                                            <AvatarFallback className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                                {lancamento.gestor_responsavel.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate max-w-[100px]">
                                            {lancamento.gestor_responsavel.nome}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Row 2: Pendencies (Full Line if exists, or compact?) 
                                User wanted "Pendências completa". Placing it here creates a middle row.
                            */}
                            {pendingCount > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                                    </span>
                                    <span className="text-[10px] text-orange-700 dark:text-orange-400 font-bold uppercase tracking-wide">
                                        {pendingCount} Pendências
                                    </span>
                                </div>
                            )}

                            {/* Row 3: Investment + Timer */}
                            <div className="flex items-center justify-between pt-1 mt-0.5">
                                {/* Investment */}
                                {lancamento.investimento_total > 0 ? (
                                    <div className="flex flex-col justify-center">
                                        <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-[15px] leading-none tracking-tight">
                                            <DollarSign className="h-3.5 w-3.5 stroke-[3]" />
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                                notation: 'compact',
                                                maximumFractionDigits: 1
                                            }).format(lancamento.investimento_total)}
                                        </span>
                                    </div>
                                ) : <span />}

                                {/* Timer - Days Only */}
                                <LaunchTimer lancamento={lancamento} />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
