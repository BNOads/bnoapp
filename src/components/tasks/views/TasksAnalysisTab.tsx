import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTaskSessions } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from 'recharts';
import { Loader2, TrendingUp, Filter, Clock, Users, Timer, Target, CheckCircle2, Calendar, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_LABELS, Task } from '@/types/tasks';
import { startOfDay, startOfWeek, startOfMonth, subDays, format, parseISO, isSameDay, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsData {
    tasksToday: number;
    tasksCompletedTotal: number;
    tasksCompletedWeek: number;
    tasksCompletedMonth: number;

    rankingByAssignee: { name: string; completed: number; avgTimeTracked: number; totalTimeTracked: number }[];

    priorityDistribution: { name: string; value: number }[];
    priorityColors: Record<string, string>;

    completedPerDay: { date: string; displayDate: string; count: number }[];

    averageTimeOverall: number;
    averageTimeByList: { name: string; avgTime: number; completedCount: number }[];
}

export function TasksAnalysisTab() {
    const [loading, setLoading] = useState(true);
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [taskLists, setTaskLists] = useState<Record<string, string>>({});

    // Opções de Filtro Global
    const [selectedUserLine, setSelectedUserLine] = useState<string>("all");
    const [selectedClientLine, setSelectedClientLine] = useState<string>("all");
    const [dateRangeFilter, setDateRangeFilter] = useState<string>("30"); // "30", "60", "90", "all"

    const [clientes, setClientes] = useState<{ id: string, nome: string }[]>([]);

    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            // Fetch task lists for mapping IDs
            const { data: listsData } = await supabase.from('task_lists').select('id, title');
            const listMap: Record<string, string> = {};
            listsData?.forEach(l => { listMap[l.id] = l.title; });
            setTaskLists(listMap);

            // We pull a larger set of tasks but only specific columns to save memory
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select(`
          id,
          title,
          assignee,
          priority,
          completed,
          completed_at,
          time_tracked,
          list_id,
          cliente_id,
          created_at
        `)
                .order('created_at', { ascending: false })
                .limit(10000); // Massive pull for deep historical analytics

            if (error) throw error;
            setAllTasks(tasks || []);

        } catch (err) {
            console.error("Error fetching tasks for analytics", err);
        } finally {
            setLoading(false);
        }

        supabase.from("clientes")
            .select("id, nome")
            .eq("ativo", true)
            .then(({ data }) => {
                if (data) setClientes(data);
            });
    };

    useEffect(() => {
        if (allTasks.length === 0) return;

        // Run aggregations
        const now = new Date();
        const today = startOfDay(now);
        const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const thisMonth = startOfMonth(now);

        // Calcula limite de data de acurdo com o DateRangeFilter (1, 30, 60, 90 dias, ou tudo)
        let startDateLimit: Date | null = null;
        let daysToTrack = 30; // default for graphs
        if (dateRangeFilter !== "all") {
            daysToTrack = parseInt(dateRangeFilter, 10);
            startDateLimit = dateRangeFilter === "1" ? today : subDays(today, daysToTrack);
        }

        let tToday = 0;
        let tTotal = 0;
        let tWeek = 0;
        let tMonth = 0;

        const assigneeStats: Record<string, { completed: number; totalTime: number; tasksWithTime: number }> = {};
        const priorityCounts: Record<string, number> = {};
        Object.values(PRIORITY_LABELS).forEach(label => {
            priorityCounts[label] = 0;
        });

        // Last X days completed map (initialize with zeros)
        const dailyMap: Record<string, number> = {};
        for (let i = daysToTrack - 1; i >= 0; i--) {
            const d = subDays(today, i);
            const k = format(d, 'yyyy-MM-dd');
            dailyMap[k] = 0;
        }

        const listStats: Record<string, { completed: number; totalTime: number }> = {};
        let globalTotalTime = 0;
        let globalTasksWithTime = 0;

        allTasks.forEach(task => {
            // Apply Global User Filter
            if (selectedUserLine !== "all" && task.assignee !== selectedUserLine) {
                return;
            }

            // Apply Global Client Filter
            if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) {
                return;
            }

            // Apply Global Date Filter
            let compDate: Date | null = null;
            if (task.completed && task.completed_at) {
                compDate = new Date(task.completed_at);
                if (startDateLimit && compDate < startDateLimit) {
                    return; // Skip if it's older than the selected date range
                }
            }

            if (task.completed && compDate) {
                if (compDate >= today) tToday++;
                if (compDate >= thisWeek) tWeek++;
                if (compDate >= thisMonth) tMonth++;
                tTotal++;

                // Tracking daily chart (last 30 days)
                const dKey = format(compDate, 'yyyy-MM-dd');
                if (dailyMap[dKey] !== undefined) {
                    dailyMap[dKey]++;
                }

                // Tracking Assignee Stats
                if (task.assignee) {
                    if (!assigneeStats[task.assignee]) {
                        assigneeStats[task.assignee] = { completed: 0, totalTime: 0, tasksWithTime: 0 };
                    }
                    assigneeStats[task.assignee].completed++;

                    if (task.time_tracked && task.time_tracked > 0) {
                        assigneeStats[task.assignee].totalTime += task.time_tracked;
                        assigneeStats[task.assignee].tasksWithTime++;
                    }
                }

                // List Stats
                if (task.list_id) {
                    if (!listStats[task.list_id]) {
                        listStats[task.list_id] = { completed: 0, totalTime: 0 };
                    }
                    listStats[task.list_id].completed++;
                    if (task.time_tracked && task.time_tracked > 0) {
                        listStats[task.list_id].totalTime += task.time_tracked;
                    }
                }

                // Global Time
                if (task.time_tracked && task.time_tracked > 0) {
                    globalTotalTime += task.time_tracked;
                    globalTasksWithTime++;
                }
            }

            // Priorities
            const priorityLabel = PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS];
            if (priorityLabel) {
                priorityCounts[priorityLabel]++;
            }
        });

        const rankingArr = Object.entries(assigneeStats)
            .map(([name, stats]) => ({
                name,
                completed: stats.completed,
                avgTimeTracked: stats.tasksWithTime > 0 ? stats.totalTime / stats.tasksWithTime : 0,
                totalTimeTracked: stats.totalTime
            }))
            .sort((a, b) => b.completed - a.completed);

        const pdData = Object.entries(priorityCounts)
            .map(([name, value]) => ({ name, value }))
            .filter(p => p.value > 0);

        const compPerDayArr = Object.entries(dailyMap).map(([dateStr, count]) => {
            return {
                date: dateStr,
                displayDate: format(parseISO(dateStr), 'MMM dd', { locale: ptBR }),
                count
            }
        });

        const avgByListArr = Object.entries(listStats)
            .filter(([_, stats]) => stats.completed > 0)
            .map(([id, stats]) => ({
                name: taskLists[id] || "Sem Lista",
                avgTime: stats.totalTime / stats.completed,
                completedCount: stats.completed
            }))
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, 10); // Top 10 longest lists

        setAnalytics({
            tasksToday: tToday,
            tasksCompletedTotal: tTotal,
            tasksCompletedWeek: tWeek,
            tasksCompletedMonth: tMonth,
            rankingByAssignee: rankingArr,
            priorityDistribution: pdData,
            priorityColors: {
                [PRIORITY_LABELS.urgente]: '#ef4444',
                [PRIORITY_LABELS.alta]: '#eab308',
                [PRIORITY_LABELS.media]: '#3b82f6',
                [PRIORITY_LABELS.baixa]: '#22c55e'
            },
            completedPerDay: compPerDayArr,
            averageTimeOverall: globalTasksWithTime > 0 ? globalTotalTime / globalTasksWithTime : 0,
            averageTimeByList: avgByListArr
        });

    }, [allTasks, taskLists, selectedUserLine, selectedClientLine, dateRangeFilter]);

    const userTimelineData = useMemo(() => {
        if (allTasks.length === 0) return [];

        let daysToTrack = dateRangeFilter === "all" ? 30 : parseInt(dateRangeFilter, 10);
        // Avoid rendering 5000 days on the chart, limit to 90 for performance
        if (daysToTrack > 90) daysToTrack = 90;

        const today = startOfDay(new Date());
        const dailyMap: Record<string, number> = {};
        for (let i = daysToTrack - 1; i >= 0; i--) {
            const d = subDays(today, i);
            const k = format(d, 'yyyy-MM-dd');
            dailyMap[k] = 0;
        }

        // Calculate startDateLimit for filtering
        let startDateLimit: Date | null = null;
        if (dateRangeFilter !== "all") {
            startDateLimit = dateRangeFilter === "1" ? today : subDays(today, parseInt(dateRangeFilter, 10));
        }

        allTasks.forEach(task => {
            if (task.completed && task.completed_at) {
                const compDate = new Date(task.completed_at);
                // Apply date range filter
                if (startDateLimit && compDate < startDateLimit) {
                    return;
                }

                if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) {
                    return;
                }

                if (selectedUserLine === "all" || task.assignee === selectedUserLine) {
                    const dKey = format(compDate, 'yyyy-MM-dd');
                    if (dailyMap[dKey] !== undefined) {
                        dailyMap[dKey]++;
                    }
                }
            }
        });

        return Object.entries(dailyMap).map(([dateStr, count]) => ({
            date: dateStr,
            displayDate: format(parseISO(dateStr), 'd MMM', { locale: ptBR }),
            count
        }));
    }, [allTasks, selectedUserLine, selectedClientLine, dateRangeFilter]);

    const hourlyCompletionData = useMemo(() => {
        if (allTasks.length === 0) return [];

        const hourlyMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourlyMap[i] = 0;

        const today = startOfDay(new Date());
        let startDateLimit: Date | null = null;
        if (dateRangeFilter !== "all") {
            startDateLimit = dateRangeFilter === "1" ? today : subDays(today, parseInt(dateRangeFilter, 10));
        }

        allTasks.forEach(task => {
            if (task.completed && task.completed_at) {
                const compDate = new Date(task.completed_at);
                // Apply date range filter
                if (startDateLimit && compDate < startDateLimit) {
                    return;
                }

                if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) {
                    return;
                }

                if (selectedUserLine === "all" || task.assignee === selectedUserLine) {
                    const hr = compDate.getHours();
                    hourlyMap[hr]++;
                }
            }
        });

        return Object.entries(hourlyMap).map(([hrStr, count]) => ({
            hour: `${hrStr.padStart(2, '0')}:00`,
            count
        }));
    }, [allTasks, selectedUserLine, selectedClientLine, dateRangeFilter]);

    // Data para o gráfico de Ponto (Horas Trabalhadas no Dia)
    const trackedTimeData = useMemo(() => {
        if (allTasks.length === 0) return [];

        let daysToTrack = dateRangeFilter === "all" ? 30 : parseInt(dateRangeFilter, 10);
        if (daysToTrack > 90) daysToTrack = 90;

        const today = startOfDay(new Date());
        const sessionMap: Record<string, number> = {};

        // Inicializa zerado pros dias no eixo x
        for (let i = daysToTrack - 1; i >= 0; i--) {
            const d = subDays(today, i);
            const k = format(d, 'yyyy-MM-dd');
            sessionMap[k] = 0; // Guardar em segundos aqui
        }

        let startDateLimit: Date | null = null;
        if (dateRangeFilter !== "all") {
            startDateLimit = dateRangeFilter === "1" ? today : subDays(today, parseInt(dateRangeFilter, 10));
        }

        allTasks.forEach(task => {
            if (task.completed && task.completed_at && task.time_tracked) {
                const compDate = new Date(task.completed_at);

                if (startDateLimit && compDate < startDateLimit) return;

                if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) return;

                if (selectedUserLine === "all" || task.assignee === selectedUserLine) {
                    const dKey = format(compDate, 'yyyy-MM-dd');
                    if (sessionMap[dKey] !== undefined) {
                        sessionMap[dKey] += task.time_tracked;
                    }
                }
            }
        });

        return Object.entries(sessionMap).map(([dateStr, totalSeconds]) => ({
            date: dateStr,
            displayDate: format(parseISO(dateStr), 'd MMM', { locale: ptBR }),
            // Convertemos para horas puras, por exemplo 2.5 horas
            horas: Number((totalSeconds / 3600).toFixed(2)),
            segundos: totalSeconds
        }));
    }, [allTasks, selectedUserLine, selectedClientLine, dateRangeFilter]);

    // Format Helper for Time (seconds to HH:MM:SS)
    const formatTime = (seconds: number) => {
        if (!seconds) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getPriorityColor = (name: string) => {
        switch (name) {
            case PRIORITY_LABELS.urgente: return '#ef4444';
            case PRIORITY_LABELS.alta: return '#eab308';
            case PRIORITY_LABELS.media: return '#3b82f6';
            case PRIORITY_LABELS.baixa: return '#22c55e';
            default: return '#71717a';
        }
    };

    if (loading || !analytics) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-muted-foreground w-full h-[600px]">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Apurando histórico de produtividade de todas as tarefas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in pt-2">

            {/* Global Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Dashboard de Análise</h2>
                    <p className="text-sm text-muted-foreground">Estatísticas detalhadas de produção e performance</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border border-border/50">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                            <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 shadow-none text-sm w-[150px] px-0">
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Hoje</SelectItem>
                                <SelectItem value="7">Últimos 7 Dias</SelectItem>
                                <SelectItem value="30">Últimos 30 Dias</SelectItem>
                                <SelectItem value="60">Últimos 60 Dias</SelectItem>
                                <SelectItem value="90">Últimos 90 Dias</SelectItem>
                                <SelectItem value="all">Todo o Histórico</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border border-border/50">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <Select value={selectedUserLine} onValueChange={setSelectedUserLine}>
                            <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 shadow-none text-sm w-[180px] px-0">
                                <SelectValue placeholder="Gestor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Equipe Inteira</SelectItem>
                                {/* We use a unique list of assignees dynamically from the data */}
                                {Array.from(new Set(allTasks.filter(t => t.assignee).map(t => t.assignee))).map(name => (
                                    <SelectItem key={name as string} value={name as string}>{name as string}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border border-border/50">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <Select value={selectedClientLine} onValueChange={setSelectedClientLine}>
                            <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 shadow-none text-sm w-[150px] px-0">
                                <SelectValue placeholder="Cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Clientes</SelectItem>
                                {clientes.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* KPI Cards Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card text-card-foreground shadow-sm border-border/60">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Concluídas Hoje
                                </p>
                                <p className="text-4xl font-bold">{analytics.tasksToday}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card text-card-foreground shadow-sm border-border/60">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Concluídas (Semana)
                                </p>
                                <p className="text-4xl font-bold">{analytics.tasksCompletedWeek}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card text-card-foreground shadow-sm border-border/60">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Concluídas (Mês)
                                </p>
                                <p className="text-4xl font-bold">{analytics.tasksCompletedMonth}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card text-card-foreground shadow-sm border-border/60">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Total Histórico
                                </p>
                                <p className="text-4xl font-bold">{analytics.tasksCompletedTotal}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Prioridades Bar */}
                <Card className="lg:col-span-1 border-border/50 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Prioridades Concluídas</CardTitle>
                        <CardDescription>Volume de tarefas finalizadas por prioridade</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.priorityDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="currentColor" className="opacity-10" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} className="text-xs font-semibold" width={60} />
                                <RechartsTooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {analytics.priorityDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getPriorityColor(entry.name)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Historico Mes Bar */}
                <Card className="lg:col-span-2 border-border/50 bg-card shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold text-foreground/90">Desempenho Geral ({dateRangeFilter === "all" ? "Histórico Completo" : `${dateRangeFilter} dias`})</CardTitle>
                            <CardDescription>Conclusão diária de tarefas no período</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.completedPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', color: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" name="Tarefas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Tabela de Responsáveis */}
                <Card className="lg:col-span-1 border-border/50 bg-card shadow-sm flex flex-col h-[400px]">
                    <CardHeader className="pb-2 flex-shrink-0">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Ranking de Responsáveis
                        </CardTitle>
                        <CardDescription>Baseado no total de tarefas concluídas</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-auto flex-1 p-0">
                        <div className="w-full text-sm">
                            <div className="grid grid-cols-4 px-4 py-3 bg-muted/40 font-semibold sticky top-0 border-y border-border/50 text-xs">
                                <div className="col-span-2">Responsável</div>
                                <div className="text-center text-green-500">Concluídas</div>
                                <div className="text-right">Média/Task</div>
                            </div>
                            <div className="divide-y divide-border/30">
                                {analytics.rankingByAssignee.map((rank, i) => (
                                    <div key={rank.name} className="grid grid-cols-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                                        <div className="col-span-2 flex items-center gap-2 font-medium truncate">
                                            {i < 3 ? <span className={`text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ${i === 0 ? 'bg-yellow-500 text-yellow-950' : i === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-400 text-orange-950'
                                                }`}>{i + 1}</span> : <span className="text-[10px] w-4 h-4 flex items-center justify-center text-muted-foreground">{i + 1}</span>}
                                            <span className="truncate">{rank.name || 'Sem nome'}</span>
                                        </div>
                                        <div className="text-center font-bold">{rank.completed}</div>
                                        <div className="text-right text-muted-foreground font-mono text-[11px] flex items-center justify-end">
                                            {formatTime(rank.avgTimeTracked)}
                                        </div>
                                    </div>
                                ))}
                                {analytics.rankingByAssignee.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">Nenhum dado encontrado</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Produção Individual por Responsavel */}
                <Card className="lg:col-span-2 border-border/50 bg-card shadow-sm h-[400px] flex flex-col">
                    <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between flex-shrink-0">
                        <div>
                            <CardTitle className="text-base font-semibold text-foreground/90">Histórico de Produção ({selectedUserLine === 'all' ? 'Equipe Inteira' : selectedUserLine})</CardTitle>
                            <CardDescription>Visualize o ritmo de entregas ao longo do tempo</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={userTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', color: 'white', borderRadius: '8px' }}
                                />
                                <Area type="monotone" dataKey="count" name="Tarefas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0, fill: '#f87171' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

            </div>

            <div className="grid grid-cols-1 gap-6">

                {/* Horários / Conclusões por Hora */}
                <Card className="border-border/50 bg-card shadow-sm h-[320px] flex flex-col">
                    <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between flex-shrink-0">
                        <div>
                            <CardTitle className="text-base font-semibold">Tabela de Horários - Pico de Entrega</CardTitle>
                            <CardDescription>Volume de tarefas finalizadas em cada hora do dia ({selectedUserLine === 'all' ? 'Equipe Toda' : selectedUserLine})</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyCompletionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', color: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" name="Tarefas" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Gráfico de Horas Trabalhadas por Dia */}
                <Card className="border-border/50 bg-card shadow-sm h-[320px] flex flex-col">
                    <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between flex-shrink-0">
                        <div>
                            <CardTitle className="text-base font-semibold text-blue-500">Horas Trabalhadas (Ponto Diário)</CardTitle>
                            <CardDescription>Soma de todos os tempos rastreados em tarefas por dia ({selectedUserLine === 'all' ? 'Equipe Toda' : selectedUserLine})</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trackedTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', color: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any, name: any, props: any) => {
                                        const sec = props.payload.segundos;
                                        const hr = Math.floor(sec / 3600);
                                        const min = Math.floor((sec % 3600) / 60);
                                        return [`${hr}h ${min}m`, 'Tempo'];
                                    }}
                                />
                                <Bar dataKey="horas" name="Horas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

            </div>

        </div>
    );
}
