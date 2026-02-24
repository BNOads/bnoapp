import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    Clock, Calendar, AlertCircle, Building2, TrendingUp, History, Search, FileText, CheckCircle2, Users, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { format, differenceInDays, parse, isValid, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';

interface ClientStats {
    id: string;
    nome: string;
    avatar_url?: string | null;
    totalReunioes: number;
    ultimaReuniao: Date | null;
    diasSemReuniao: number | null;
    reunioesPorMes: Record<string, number>;
}

interface AnalyticsProps {
    clientes: any[];
    indicesTitulos: any[];
    anoSelecionado: number;
}

export function ArquivoReuniaoAnalytics({ clientes, indicesTitulos, anoSelecionado }: AnalyticsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<'nome' | 'reunioes' | 'ultima' | 'gap'>('gap');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (column: typeof sortColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection(column === 'nome' ? 'asc' : 'desc');
        }
    };

    const SortIcon = ({ column }: { column: typeof sortColumn }) => {
        if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1" />
            : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    // Detecta cliente a partir do texto do heading (mesmo padrão do sidebar/tarefas)
    const detectClient = useCallback((text: string) => {
        if (!text || clientes.length === 0) return null;
        const lowerText = text.toLowerCase();
        const normalizedText = lowerText.replace(/\s+/g, '');
        for (const cliente of clientes) {
            const normalizedNome = cliente.nome.toLowerCase().replace(/\s+/g, '');
            if (lowerText.includes(cliente.nome.toLowerCase()) || normalizedText.includes(normalizedNome)) return cliente;
            if (cliente.aliases && cliente.aliases.length > 0) {
                if (cliente.aliases.some((alias: string) => {
                    const normalizedAlias = alias.toLowerCase().replace(/\s+/g, '');
                    return lowerText.includes(alias.toLowerCase()) || normalizedText.includes(normalizedAlias);
                })) return cliente;
            }
        }
        return null;
    }, [clientes]);

    // Processa os dados brutos do índice para extrair estatísticas por cliente
    const stats: ClientStats[] = useMemo(() => {
        const clientMap = new Map<string, ClientStats>();

        // Inicializa o mapa com todos os clientes ativos
        clientes.forEach(c => {
            clientMap.set(c.id, {
                id: c.id,
                nome: c.nome,
                avatar_url: c.branding_logo_url,
                totalReunioes: 0,
                ultimaReuniao: null,
                diasSemReuniao: null,
                reunioesPorMes: {}
            });
        });

        const today = new Date();

        // Processa cada H2 do índice (que representa uma pauta de reunião)
        indicesTitulos.forEach(heading => {
            if (heading.tag === 'h2') {
                const matchedClient = detectClient(heading.text);
                if (!matchedClient) return;

                const clientId = matchedClient.id;
                const s = clientMap.get(clientId);

                if (s) {
                    s.totalReunioes += 1;

                    // Tenta extrair a data do texto do heading (DD/MM/YYYY ou DD/MM)
                    const dateMatch = heading.text.match(/(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
                    if (dateMatch) {
                        const day = parseInt(dateMatch[1]);
                        const month = parseInt(dateMatch[2]) - 1; // 0-indexed
                        const year = dateMatch[3] ? parseInt(dateMatch[3]) : anoSelecionado;

                        const reuniaoDate = new Date(year, month, day);

                        if (isValid(reuniaoDate)) {
                            if (!s.ultimaReuniao || reuniaoDate > s.ultimaReuniao) {
                                s.ultimaReuniao = reuniaoDate;
                                s.diasSemReuniao = differenceInDays(today, reuniaoDate);
                            }

                            const mesKey = format(reuniaoDate, 'MMM', { locale: ptBR });
                            s.reunioesPorMes[mesKey] = (s.reunioesPorMes[mesKey] || 0) + 1;
                        }
                    }
                }
            }
        });

        // Para os que nunca tiveram reunião no ano, garante que o diasSemReuniao seja algo gigante ou null, e preenche vazio
        const finalStats = Array.from(clientMap.values()).map(s => {
            if (s.diasSemReuniao === null) {
                // Se não achou data, consideramos infinito para fins de ordenação de 'atenção'
                s.diasSemReuniao = 999;
            }
            return s;
        });

        return finalStats;
    }, [clientes, indicesTitulos, anoSelecionado]);

    // Derived statistics
    const topClientes = useMemo(() => {
        return [...stats]
            .filter(s => s.totalReunioes > 0)
            .sort((a, b) => b.totalReunioes - a.totalReunioes)
            .slice(0, 10);
    }, [stats]);

    const clientesNecessitamAtencao = useMemo(() => {
        return [...stats]
            .filter(s => s.diasSemReuniao !== null && s.diasSemReuniao > 14) // Mais de 2 semanas
            .sort((a, b) => (b.diasSemReuniao || 0) - (a.diasSemReuniao || 0));
    }, [stats]);

    const chartData = useMemo(() => {
        return topClientes.map(c => ({
            name: c.nome.length > 15 ? c.nome.substring(0, 15) + '...' : c.nome,
            reunioes: c.totalReunioes,
            fullNome: c.nome
        }));
    }, [topClientes]);

    const getStatusColor = (dias: number | null) => {
        if (dias === null) return "bg-slate-500/10 text-slate-500";
        if (dias >= 999) return "bg-slate-500/10 text-slate-500 border-slate-500/20"; // Sem registro no ano
        if (dias > 30) return "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400";
        if (dias > 14) return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400";
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400";
    };

    const getStatusText = (dias: number | null) => {
        if (dias === null || dias >= 999) return "Sem registro em " + anoSelecionado;
        if (dias === 0) return "Hoje";
        if (dias === 1) return "Ontem";
        return `Há ${dias} dias`;
    };

    const totals = useMemo(() => {
        const reunioesTotais = stats.reduce((acc, curr) => acc + curr.totalReunioes, 0);
        const clientesAtendidos = stats.filter(s => s.totalReunioes > 0).length;
        const clientesCriticos = clientesNecessitamAtencao.length;

        // Reuniões este mes
        const hoje = new Date();
        const inicioMissThisMonth = startOfMonth(hoje);
        const fimMissThisMonth = endOfMonth(hoje);

        return {
            reunioesTotais,
            clientesAtendidos,
            clientesCriticos
        };
    }, [stats, clientesNecessitamAtencao]);


    const filteredStats = useMemo(() => {
        let result = stats;
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(s => s.nome.toLowerCase().includes(lowerTerm));
        }
        const dir = sortDirection === 'asc' ? 1 : -1;
        return [...result].sort((a, b) => {
            switch (sortColumn) {
                case 'nome':
                    return dir * a.nome.localeCompare(b.nome);
                case 'reunioes':
                    return dir * (a.totalReunioes - b.totalReunioes);
                case 'ultima':
                    const aTime = a.ultimaReuniao?.getTime() ?? 0;
                    const bTime = b.ultimaReuniao?.getTime() ?? 0;
                    return dir * (aTime - bTime);
                case 'gap':
                    return dir * ((a.diasSemReuniao || 999) - (b.diasSemReuniao || 999));
                default:
                    return 0;
            }
        });
    }, [stats, searchTerm, sortColumn, sortDirection]);


    return (
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Análise de Engajamento</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Acompanhe o ritmo de reuniões e descubra quais clientes precisam de mais atenção em {anoSelecionado}.
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="shadow-sm border-border/60">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Total de Reuniões</p>
                            <div className="p-2 bg-primary/10 rounded-full">
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold">{totals.reunioesTotais}</h3>
                            <span className="text-xs text-muted-foreground">registradas</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/60">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Clientes Atendidos</p>
                            <div className="p-2 bg-emerald-500/10 rounded-full">
                                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold">{totals.clientesAtendidos}</h3>
                            <span className="text-xs text-muted-foreground">de {stats.length} ativos</span>
                        </div>
                        <Progress value={(totals.clientesAtendidos / Math.max(stats.length, 1)) * 100} className="h-1.5 mt-3" />
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/60 border-red-500/20 dark:border-red-500/20 bg-red-50/30 dark:bg-red-950/10">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">Timing Crítico</p>
                            <div className="p-2 bg-red-500/10 rounded-full">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold text-red-600 dark:text-red-400">{totals.clientesCriticos}</h3>
                            <span className="text-xs text-red-600/70 dark:text-red-400/70">há &gt; 14 dias sem pauta</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela Completa - Primeiro */}
            <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            Relatório Geral de Clientes Ativos
                        </CardTitle>
                    </div>
                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-8 text-xs"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground bg-muted/40 uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-medium rounded-tl-lg cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('nome')}>
                                        <span className="inline-flex items-center">Cliente <SortIcon column="nome" /></span>
                                    </th>
                                    <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('reunioes')}>
                                        <span className="inline-flex items-center">Reuniões em {anoSelecionado} <SortIcon column="reunioes" /></span>
                                    </th>
                                    <th className="px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('ultima')}>
                                        <span className="inline-flex items-center">Última Reunião <SortIcon column="ultima" /></span>
                                    </th>
                                    <th className="px-4 py-3 font-medium rounded-tr-lg cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('gap')}>
                                        <span className="inline-flex items-center">Status (Gap) <SortIcon column="gap" /></span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filteredStats.map(cliente => (
                                        <tr key={cliente.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3 font-medium dark:text-slate-200">
                                                {cliente.nome}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary" className="font-mono text-xs shadow-none">
                                                    {cliente.totalReunioes}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                                                {cliente.ultimaReuniao ? format(cliente.ultimaReuniao, "dd 'de' MMMM", { locale: ptBR }) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={`text-xs font-medium ${getStatusColor(cliente.diasSemReuniao)}`}>
                                                    {getStatusText(cliente.diasSemReuniao)}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                {filteredStats.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                            Nenhum cliente encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ranking Chart */}
                <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/60 flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Top 10 Clientes com Mais Reuniões
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Volume absoluto de pautas registradas em {anoSelecionado}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[220px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-popover border border-border shadow-md rounded-lg p-3 text-sm">
                                                        <p className="font-semibold mb-1">{payload[0].payload.fullNome}</p>
                                                        <div className="flex items-center gap-2 text-primary font-medium">
                                                            <FileText className="w-3.5 h-3.5" />
                                                            {payload[0].value} reuniões
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="reunioes" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`hsl(var(--primary))`} fillOpacity={0.8 - (index * 0.05)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
                                <History className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-sm">Nenhum dado de reunião suficiente</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Timing de Atenção */}
                <Card className="col-span-1 shadow-sm border-border/60 flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            Timing de Atenção (Radar)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Dias desde a última reunião documentada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                        <ScrollArea className="flex-1 h-[220px]">
                            <div className="divide-y divide-border/40">
                                {clientesNecessitamAtencao.length > 0 ? (
                                    clientesNecessitamAtencao.map(cliente => (
                                        <div key={cliente.id} className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/50 overflow-hidden text-[10px] font-bold">
                                                    {cliente.avatar_url ? (
                                                        <img src={cliente.avatar_url} alt={cliente.nome} className="w-full h-full object-cover" />
                                                    ) : (
                                                        cliente.nome.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium truncate leading-tight dark:text-slate-200">{cliente.nome}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                                        Última: {cliente.ultimaReuniao ? format(cliente.ultimaReuniao, 'dd/MM/yyyy') : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 h-5 font-semibold ${getStatusColor(cliente.diasSemReuniao)}`}>
                                                {getStatusText(cliente.diasSemReuniao)}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 mb-3">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm font-medium">Tudo em dia!</p>
                                        <p className="text-xs text-muted-foreground mt-1">Nenhum cliente está há mais de 14 dias sem reunião documentada.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
