import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTaskSessions } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Loader2, Calendar, Building2, Users, CheckCircle2, AlertCircle, Flag, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABELS, Task } from '@/types/tasks';
import { isOverdue } from '@/lib/dateUtils';
import { startOfDay, subDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from "react-day-picker";
import { TarefasList } from './TarefasList';
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { TaskDetailDialog } from '@/components/tasks/details/TaskDetailDialog';

interface AnalyticsData {
    tasksPending: number;
    tasksCompleted: number;
    tasksOverdue: number;
    tasksHighPriority: number;
    rankingByAssignee: { name: string; completed: number; avgTimeTracked: number; totalTimeTracked: number }[];
    rankingByClient: { name: string; completed: number; pending: number; totalTimeTracked: number }[];
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
    const [selectedUserLine, setSelectedUserLine] = useState<string>("all");
    const [selectedClientLine, setSelectedClientLine] = useState<string>("all");
    const [dateRangeFilter, setDateRangeFilter] = useState<string>("30");
    const [clientes, setClientes] = useState<{ id: string, nome: string }[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [dateRangeObj, setDateRangeObj] = useState<DateRange | undefined>(undefined);
    const [kpiPopupFilter, setKpiPopupFilter] = useState<{ title: string; filterFn: (t: any) => boolean } | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            const { data: listsData, error: listsError } = await supabase.from('task_lists').select('id, name');
            if (listsError) console.error("Error fetching task lists:", listsError);

            const listMap: Record<string, string> = {};
            listsData?.forEach(l => { listMap[l.id] = (l as any).name; });
            setTaskLists(listMap);

            const { data: tasks, error } = await supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    assignee,
                    priority,
                    completed,
                    completed_at,
                    due_date,
                    time_tracked,
                    list_id,
                    cliente_id,
                    created_at
                `)
                .order('created_at', { ascending: false })
                .limit(10000);

            if (error) throw error;
            setAllTasks(tasks || []);

            const { data: clientesData } = await supabase.from("clientes").select("id, nome").eq("ativo", true);
            if (clientesData) setClientes(clientesData);
        } catch (err) {
            console.error("Error fetching tasks for analytics", err);
            // Ensure analytics isn't stuck if fetch fails
            setAllTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const { startDateLimit, endDateLimit, todayStr, daysToTrack } = useMemo(() => {
        const now = new Date();
        const today = startOfDay(now);
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        let days = 30;

        if (dateRangeFilter === "ontem") {
            startDate = subDays(today, 1);
            endDate = today;
        } else if (dateRangeFilter === "1") {
            startDate = today;
            endDate = subDays(today, -1);
        } else if (dateRangeFilter !== "all" && !dateRangeFilter.includes("~")) {
            days = parseInt(dateRangeFilter, 10);
            startDate = subDays(today, days);
            endDate = subDays(today, -1);
        } else if (dateRangeFilter.includes("~")) {
            const [startStr, endStr] = dateRangeFilter.split("~");
            if (startStr && endStr) {
                startDate = parseISO(startStr);
                endDate = startOfDay(new Date(new Date(parseISO(endStr)).getTime() + 86400000));
            }
        }

        return {
            startDateLimit: startDate,
            endDateLimit: endDate,
            todayStr: format(today, 'yyyy-MM-dd'),
            daysToTrack: days
        };
    }, [dateRangeFilter]);

    useEffect(() => {
        // We set a default state for analytics if no tasks exist
        if (allTasks.length === 0) {
            setAnalytics({
                tasksPending: 0,
                tasksCompleted: 0,
                tasksOverdue: 0,
                tasksHighPriority: 0,
                rankingByAssignee: [],
                rankingByClient: [],
                priorityDistribution: [],
                priorityColors: {
                    [PRIORITY_LABELS.urgente]: '#ef4444',
                    [PRIORITY_LABELS.alta]: '#eab308',
                    [PRIORITY_LABELS.media]: '#3b82f6',
                    [PRIORITY_LABELS.baixa]: '#22c55e'
                },
                completedPerDay: [],
                averageTimeOverall: 0,
                averageTimeByList: [],
            });
            return;
        }

        let kpiPending = 0;
        let kpiCompleted = 0;
        let kpiOverdue = 0;
        let kpiHighPriority = 0;

        const now = new Date();
        const today = startOfDay(now);

        allTasks.forEach(task => {
            if (selectedUserLine !== "all" && task.assignee !== selectedUserLine) return;
            if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) return;

            let isWithinDateRange = true;
            if (startDateLimit) {
                const targetDateStr = task.completed ? task.completed_at : (task.due_date || task.created_at);
                if (targetDateStr) {
                    const targetDate = targetDateStr.includes('T') ? new Date(targetDateStr) : parseISO(targetDateStr);
                    if (targetDate < startDateLimit || (endDateLimit && targetDate >= endDateLimit)) {
                        isWithinDateRange = false;
                    }
                }
            }

            if (!isWithinDateRange) return;

            if (task.completed) {
                kpiCompleted++;
            } else {
                kpiPending++;
                if (task.due_date && task.due_date < todayStr) {
                    kpiOverdue++;
                }
                if (task.priority === "alta") {
                    kpiHighPriority++;
                }
            }
        });

        const assigneeStats: Record<string, { completed: number; totalTime: number; tasksWithTime: number }> = {};
        const clientStats: Record<string, { completed: number; pending: number; totalTime: number }> = {};
        const priorityCounts: Record<string, number> = {};
        Object.values(PRIORITY_LABELS).forEach(label => {
            priorityCounts[label] = 0;
        });

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
            if (selectedUserLine !== "all" && task.assignee !== selectedUserLine) return;
            if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) return;

            let compDate: Date | null = null;
            if (task.completed && task.completed_at) {
                compDate = new Date(task.completed_at);
                if (startDateLimit && compDate < startDateLimit) return;
                if (endDateLimit && compDate >= endDateLimit) return;
            } else if (!task.completed && task.created_at) {
                const createdDate = new Date(task.created_at);
                if (startDateLimit && createdDate < startDateLimit) return;
                if (endDateLimit && createdDate >= endDateLimit) return;
            }

            if (task.cliente_id) {
                if (!clientStats[task.cliente_id]) {
                    clientStats[task.cliente_id] = { completed: 0, pending: 0, totalTime: 0 };
                }
                if (!task.completed) {
                    clientStats[task.cliente_id].pending++;
                }
            }

            if (task.completed && compDate) {
                const dKey = format(compDate, 'yyyy-MM-dd');
                if (dailyMap[dKey] !== undefined) {
                    dailyMap[dKey]++;
                }

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

                if (task.cliente_id) {
                    clientStats[task.cliente_id].completed++;
                    if (task.time_tracked && task.time_tracked > 0) {
                        clientStats[task.cliente_id].totalTime += task.time_tracked;
                    }
                }

                if (task.list_id) {
                    if (!listStats[task.list_id]) {
                        listStats[task.list_id] = { completed: 0, totalTime: 0 };
                    }
                    listStats[task.list_id].completed++;
                    if (task.time_tracked && task.time_tracked > 0) {
                        listStats[task.list_id].totalTime += task.time_tracked;
                    }
                }

                if (task.time_tracked && task.time_tracked > 0) {
                    globalTotalTime += task.time_tracked;
                    globalTasksWithTime++;
                }
            }

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

        const rankingClientArr = Object.entries(clientStats)
            .map(([clientId, stats]) => {
                const clientObj = clientes.find(c => c.id === clientId);
                return {
                    name: clientObj ? clientObj.nome : "Cliente Desconhecido",
                    completed: stats.completed,
                    pending: stats.pending,
                    totalTimeTracked: stats.totalTime
                };
            })
            .sort((a, b) => b.totalTimeTracked - a.totalTimeTracked);

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
            .slice(0, 10);

        setAnalytics({
            tasksPending: kpiPending,
            tasksCompleted: kpiCompleted,
            tasksOverdue: kpiOverdue,
            tasksHighPriority: kpiHighPriority,
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
            averageTimeByList: avgByListArr,
            rankingByClient: rankingClientArr
        });

    }, [allTasks, taskLists, clientes, selectedUserLine, selectedClientLine, startDateLimit, endDateLimit, todayStr, daysToTrack]);

    const userTimelineData = useMemo(() => {
        if (allTasks.length === 0) return [];
        let daysToTrackLimit = daysToTrack > 90 ? 90 : daysToTrack;
        const today = startOfDay(new Date());
        const dailyMap: Record<string, number> = {};
        for (let i = daysToTrackLimit - 1; i >= 0; i--) {
            const d = subDays(today, i);
            const k = format(d, 'yyyy-MM-dd');
            dailyMap[k] = 0;
        }
        allTasks.forEach(task => {
            if (task.completed && task.completed_at) {
                const compDate = new Date(task.completed_at);
                if (startDateLimit && compDate < startDateLimit) return;
                if (endDateLimit && compDate >= endDateLimit) return;
                if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) return;
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
    }, [allTasks, selectedUserLine, selectedClientLine, startDateLimit, endDateLimit, daysToTrack]);

    const hourlyCompletionData = useMemo(() => {
        if (allTasks.length === 0) return [];
        const hourlyMap: Record<number, number> = {};
        for (let i = 0; i < 24; i++) hourlyMap[i] = 0;
        allTasks.forEach(task => {
            if (task.completed && task.completed_at) {
                const compDate = new Date(task.completed_at);
                if (startDateLimit && compDate < startDateLimit) return;
                if (endDateLimit && compDate >= endDateLimit) return;
                if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) return;
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
    }, [allTasks, selectedUserLine, selectedClientLine, startDateLimit, endDateLimit]);

    const trackedTimeData = useMemo(() => {
        if (allTasks.length === 0) return [];
        let daysToTrackLimit = daysToTrack > 90 ? 90 : daysToTrack;
        const today = startOfDay(new Date());
        const sessionMap: Record<string, number> = {};
        for (let i = daysToTrackLimit - 1; i >= 0; i--) {
            const d = subDays(today, i);
            const k = format(d, 'yyyy-MM-dd');
            sessionMap[k] = 0;
        }
        allTasks.forEach(task => {
            if (task.completed && task.completed_at && task.time_tracked) {
                const compDate = new Date(task.completed_at);
                if (startDateLimit && compDate < startDateLimit) return;
                if (endDateLimit && compDate >= endDateLimit) return;
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
            horas: Number((totalSeconds / 3600).toFixed(2)),
            segundos: totalSeconds
        }));
    }, [allTasks, selectedUserLine, selectedClientLine, daysToTrack, startDateLimit, endDateLimit]);

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

    const filteredTasksForPopup = useMemo(() => {
        return allTasks.filter(task => {
            if (selectedUserLine !== "all" && task.assignee !== selectedUserLine) return false;
            if (selectedClientLine !== "all" && task.cliente_id !== selectedClientLine) return false;
            if (startDateLimit) {
                const targetDateStr = task.completed ? task.completed_at : (task.due_date || task.created_at);
                if (targetDateStr) {
                    const targetDate = targetDateStr.includes('T') ? new Date(targetDateStr) : parseISO(targetDateStr);
                    if (targetDate < startDateLimit || (endDateLimit && targetDate >= endDateLimit)) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            return true;
        });
    }, [allTasks, selectedUserLine, selectedClientLine, startDateLimit, endDateLimit]);

    const todayStrForPopup = format(startOfDay(new Date()), 'yyyy-MM-dd');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-muted-foreground w-full h-[600px]">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Apurando histórico de produtividade de todas as tarefas...</p>
            </div>
        );
    }

    if (!analytics || allTasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-muted-foreground w-full h-[600px] gap-4">
                <p>Nenhuma tarefa encontrada no sistema.</p>
                <button
                    onClick={() => fetchAnalyticsData()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    const pendingClientsChartData = [...analytics.rankingByClient]
        .filter(c => c.pending > 0)
        .sort((a, b) => b.pending - a.pending)
        .slice(0, 10);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Dashboard de Análise</h2>
                    <p className="text-sm text-muted-foreground">Estatísticas detalhadas de produção e performance</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border border-border/50">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <Select value={dateRangeFilter.includes("~") ? "custom" : dateRangeFilter} onValueChange={(val) => {
                            if (val !== "custom") setDateRangeFilter(val);
                        }}>
                            <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 shadow-none text-sm w-[150px] px-0">
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Hoje</SelectItem>
                                <SelectItem value="ontem">Ontem</SelectItem>
                                <SelectItem value="7">Últimos 7 Dias</SelectItem>
                                <SelectItem value="30">Últimos 30 Dias</SelectItem>
                                <SelectItem value="60">Últimos 60 Dias</SelectItem>
                                <SelectItem value="90">Últimos 90 Dias</SelectItem>
                                <SelectItem value="all">Todo o Histórico</SelectItem>
                                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">Personalizado</div>
                                <div className="px-2 pb-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal bg-card">
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {dateRangeFilter.includes("~") ? (
                                                    <span className="truncate">{format(parseISO(dateRangeFilter.split("~")[0]), "dd/MM/yy")} - {format(parseISO(dateRangeFilter.split("~")[1]), "dd/MM/yy")}</span>
                                                ) : (
                                                    <span>Escolher datas</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarUI
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRangeObj?.from || new Date()}
                                                selected={dateRangeObj}
                                                onSelect={(range) => {
                                                    setDateRangeObj(range);
                                                    if (range?.from && range?.to) {
                                                        const fromStr = format(range.from, "yyyy-MM-dd");
                                                        const toStr = format(range.to, "yyyy-MM-dd");
                                                        setDateRangeFilter(`${fromStr}~${toStr}`);
                                                    }
                                                }}
                                                numberOfMonths={2}
                                                locale={ptBR}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => setKpiPopupFilter({ title: 'Tarefas Pendentes', filterFn: (t) => !t.completed })}
                    className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden text-left hover:border-primary/50 transition-colors cursor-pointer text-foreground"
                >
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <span className="w-2 h-2 rounded-full border border-current opacity-50"></span>
                        <span className="text-sm font-medium">Pendentes</span>
                    </div>
                    <span className="text-4xl font-bold">{analytics.tasksPending}</span>
                </button>

                <button
                    onClick={() => setKpiPopupFilter({ title: 'Tarefas Concluídas', filterFn: (t) => t.completed })}
                    className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden text-left hover:border-primary/50 transition-colors cursor-pointer text-foreground"
                >
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground opacity-50" />
                        <span className="text-sm font-medium">Concluídas</span>
                    </div>
                    <span className="text-4xl font-bold">{analytics.tasksCompleted}</span>
                </button>

                <button
                    onClick={() => setKpiPopupFilter({ title: 'Tarefas Atrasadas', filterFn: (t) => !t.completed && !!t.due_date && t.due_date < todayStrForPopup })}
                    className="p-4 rounded-xl border flex py-6 flex-col justify-center relative overflow-hidden border-rose-100 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 text-left hover:border-rose-300 dark:hover:border-rose-700 transition-colors cursor-pointer"
                >
                    <div className="flex items-center gap-2 text-destructive mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Atrasadas</span>
                    </div>
                    <span className="text-4xl font-bold text-foreground">{analytics.tasksOverdue}</span>
                </button>

                <button
                    onClick={() => setKpiPopupFilter({ title: 'Alta Prioridade', filterFn: (t) => !t.completed && t.priority === 'alta' })}
                    className="p-4 rounded-xl border bg-card flex py-6 flex-col justify-center relative overflow-hidden text-left hover:border-primary/50 transition-colors cursor-pointer text-foreground"
                >
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Flag className="w-4 h-4 text-rose-500 opacity-60" />
                        <span className="text-sm font-medium">Alta prioridade</span>
                    </div>
                    <span className="text-4xl font-bold">{analytics.tasksHighPriority}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-border/50 bg-card shadow-sm flex flex-col h-[400px]">
                    <CardHeader className="pb-2 flex-shrink-0">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Ranking de Clientes
                        </CardTitle>
                        <CardDescription>Baseado nas tarefas e tempo gasto</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-auto flex-1 p-0">
                        <div className="w-full text-sm">
                            <div className="grid grid-cols-4 px-4 py-3 bg-muted/40 font-semibold sticky top-0 border-y border-border/50 text-xs">
                                <div className="col-span-2">Cliente</div>
                                <div className="text-center text-blue-500">Concluídas</div>
                                <div className="text-right">Tempo Total</div>
                            </div>
                            <div className="divide-y divide-border/30">
                                {analytics.rankingByClient.map((rank, i) => (
                                    <div key={rank.name + i} className="grid grid-cols-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                                        <div className="col-span-2 flex items-center gap-2 font-medium truncate">
                                            {i < 3 ? <span className={`text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ${i === 0 ? 'bg-yellow-500 text-yellow-950' : i === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-400 text-orange-950'
                                                }`}>{i + 1}</span> : <span className="text-[10px] w-4 h-4 flex items-center justify-center text-muted-foreground">{i + 1}</span>}
                                            <span className="truncate">{rank.name}</span>
                                        </div>
                                        <div className="text-center font-bold">{rank.completed}</div>
                                        <div className="text-right text-muted-foreground font-mono text-[11px] flex items-center justify-end">
                                            {formatTime(rank.totalTimeTracked)}
                                        </div>
                                    </div>
                                ))}
                                {analytics.rankingByClient.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">Nenhum dado encontrado</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-border/50 bg-card shadow-sm h-[400px] flex flex-col">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <Card className="border-border/50 bg-card shadow-sm h-[320px] flex flex-col">
                    <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between flex-shrink-0">
                        <div>
                            <CardTitle className="text-base font-semibold text-orange-500">Tarefas a Fazer (Top 10 Clientes)</CardTitle>
                            <CardDescription>Clientes com a maior demanda atual pendente</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pendingClientsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} angle={-30} textAnchor="end" height={60} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', color: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="pending" name="Tarefas a Fazer" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!kpiPopupFilter} onOpenChange={(open) => !open && setKpiPopupFilter(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{kpiPopupFilter?.title}</DialogTitle>
                        <DialogDescription>Tarefas correspondentes a este indicador baseadas nos filtros atuais.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto mt-2 -mx-2 px-2 pb-4">
                        {kpiPopupFilter && (
                            <div className="bg-slate-50/30 dark:bg-background rounded-md">
                                <TarefasList
                                    tasks={filteredTasksForPopup.filter(kpiPopupFilter.filterFn) as Task[]}
                                    onTaskClick={(id) => {
                                        setSelectedTaskId(id);
                                        setIsDetailOpen(true);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <TaskDetailDialog
                taskId={selectedTaskId}
                open={isDetailOpen}
                onOpenChange={(open) => {
                    setIsDetailOpen(open);
                    if (!open) setSelectedTaskId(null);
                }}
            />
        </div>
    );
}
