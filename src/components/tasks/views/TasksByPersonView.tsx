import React, { useMemo, useState, useEffect } from "react";
import { Task, PRIORITY_LABELS } from "@/types/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToggleTaskComplete, useDeleteTask, useCreateTask } from "@/hooks/useTaskMutations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, UserCircle, Plus, ChevronDown, ChevronRight, Trash2, Flag, Users } from "lucide-react";
import { isOverdue } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskLists } from "@/hooks/useTasks";

interface TasksByPersonViewProps {
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
    selectedTasks: string[];
    onToggleSelectTask: (taskId: string) => void;
    onSelectBatch?: (taskIds: string[], select: boolean) => void;
    onCreateTaskForPerson?: (person: string) => void;
    gridLayout?: boolean;
    hideCompleted?: boolean;
}

export function TasksByPersonView({ tasks, onTaskClick, selectedTasks, onToggleSelectTask, onSelectBatch, onCreateTaskForPerson, gridLayout = false, hideCompleted = false }: TasksByPersonViewProps) {
    const { mutate: toggleComplete } = useToggleTaskComplete();
    const { mutate: deleteTask } = useDeleteTask();
    const { mutate: createTask } = useCreateTask();

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [colaboradores, setColaboradores] = useState<{ nome: string, avatar_url: string | null }[]>([]);

    const [inlineCreatePerson, setInlineCreatePerson] = useState<string | null>(null);
    const [inlineTaskTitle, setInlineTaskTitle] = useState("");

    const { data: taskLists } = useTaskLists();

    const handleInlineCreate = (personStr: string) => {
        if (!inlineTaskTitle.trim()) return;
        const actualPerson = personStr === "Sem Responsável" ? null : personStr;
        const todayStr = format(new Date(), "yyyy-MM-dd");
        createTask({
            title: inlineTaskTitle.trim(),
            priority: 'media',
            list_id: null,
            due_date: todayStr,
            assignee: actualPerson
        });
        setInlineTaskTitle("");
        setInlineCreatePerson(null);
    };

    useEffect(() => {
        supabase.from("colaboradores")
            .select("nome, avatar_url")
            .order("nome")
            .then(({ data }) => {
                if (data) setColaboradores(data);
            });
    }, []);

    const groupedByPerson = useMemo(() => {
        const groups: Record<string, Task[]> = {};
        colaboradores.forEach(c => groups[c.nome] = []);
        tasks.forEach(task => {
            const person = task.assignee || "Sem Responsável";
            if (!groups[person]) groups[person] = [];
            groups[person].push(task);
        });
        return Object.entries(groups).sort(([a], [b]) => {
            if (a === "Sem Responsável") return 1;
            if (b === "Sem Responsável") return -1;
            return a.localeCompare(b);
        });
    }, [tasks, colaboradores]);

    const toggleCollapse = (person: string) => {
        setCollapsed(prev => ({ ...prev, [person]: !prev[person] }));
    };

    // --- Chart Data Calculations ---
    const priorityData = useMemo(() => {
        const counts = { alta: 0, media: 0, baixa: 0 };
        tasks.forEach(t => {
            if (!t.completed && t.priority) {
                counts[t.priority as keyof typeof counts]++;
            }
        });
        return [
            { name: "Alta", value: counts.alta, color: "#ef4444" },
            { name: "Média", value: counts.media, color: "#f59e0b" },
            { name: "Baixa", value: counts.baixa, color: "#6b7280" },
        ].filter(d => d.value > 0);
    }, [tasks]);

    const assigneePieData = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            if (!t.completed) {
                const name = t.assignee || "Sem Responsável";
                // Get just the first name for the pie chart label to match screenshot closely
                const shortName = name === "Sem Responsável" ? name : name.split(' ')[0];
                counts[shortName] = (counts[shortName] || 0) + 1;
            }
        });
        const colors = ["#0ea5e9", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#10b981", "#ef4444", "#3b82f6"];
        return Object.entries(counts)
            .map(([name, value], index) => ({
                name,
                value,
                color: colors[index % colors.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [tasks]);

    const assigneeBarData = useMemo(() => {
        const stats: Record<string, { Pendentes: number; Atrasadas: number }> = {};
        tasks.forEach(t => {
            if (!t.completed) {
                const name = t.assignee ? t.assignee.split(' ')[0] : "Sem Resp.";
                if (!stats[name]) stats[name] = { Pendentes: 0, Atrasadas: 0 };

                stats[name].Pendentes++;
                if (t.due_date && isOverdue(t.due_date, false)) {
                    stats[name].Atrasadas++;
                }
            }
        });
        return Object.entries(stats)
            .map(([name, data]) => ({
                name,
                ...data
            }))
            .sort((a, b) => b.Pendentes - a.Pendentes)
            .slice(0, 6); // Show top 6 for the bar chart
    }, [tasks]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border text-sm p-2 shadow-sm rounded-md shadow-lg">
                    <span className="font-semibold flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: payload[0].payload.color || payload[0].fill }} />
                        {payload[0].name}: {payload[0].value}
                    </span>
                </div>
            );
        }
        return null;
    };

    const chartsSection = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm border-border">
                <CardHeader className="pl-6 pb-2 pt-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                        <Flag className="w-4 h-4" /> Distribuição por Prioridade
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex flex-col items-center justify-center p-0">
                    {priorityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    stroke="none"
                                    dataKey="value"
                                >
                                    {priorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Nenhuma tarefa.</div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 mb-4">
                        {priorityData.map((d) => (
                            <div key={d.name} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span>{d.name}: {d.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border">
                <CardHeader className="pl-6 pb-2 pt-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                        <Users className="w-4 h-4" /> Tarefas por Colaborador
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex flex-col items-center justify-center p-0">
                    {assigneePieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie
                                    data={assigneePieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={85}
                                    stroke="none"
                                    dataKey="value"
                                >
                                    {assigneePieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Nenhuma tarefa.</div>
                    )}
                    <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground mt-2 mb-4 px-4 overflow-hidden h-5">
                        {assigneePieData.slice(0, 4).map((d) => (
                            <div key={d.name} className="flex items-center gap-1.5 whitespace-nowrap">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span>{d.name}: {d.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border">
                <CardHeader className="pl-6 pb-2 pt-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                        <UserCircle className="w-4 h-4" /> Status por Colaborador
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] pr-6 pt-4">
                    {assigneeBarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={assigneeBarData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} width={50} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '6px', fontSize: '13px', border: '1px solid #eee' }} />
                                <Bar dataKey="Pendentes" fill="#111827" radius={[0, 4, 4, 0]} barSize={10} />
                                <Bar dataKey="Atrasadas" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Nenhuma tarefa.</div>
                    )}
                    <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                            <span>Pendentes</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span>Atrasadas</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    if (gridLayout) {
        return (
            <div className="pb-20">
                {chartsSection}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {groupedByPerson.map(([person, originalTasks]) => {
                        const personTasks = hideCompleted ? originalTasks.filter(t => !t.completed) : originalTasks;
                        if (hideCompleted && personTasks.length === 0 && originalTasks.length > 0) return null;
                        const completed = originalTasks.filter(t => t.completed).length;
                        const pending = originalTasks.length - completed;
                        const overdue = originalTasks.filter(t => !t.completed && t.due_date && isOverdue(t.due_date, false)).length;
                        const high = originalTasks.filter(t => !t.completed && t.priority === "alta").length;
                        const taxa = originalTasks.length > 0 ? Math.round((completed / originalTasks.length) * 100) : 0;

                        return (
                            <div key={person} className="border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col h-[500px]">
                                <div className="p-5 flex items-start justify-between border-b bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="flex items-center gap-3">
                                        {person === "Sem Responsável" ? (
                                            <UserCircle className="w-10 h-10 text-muted-foreground" />
                                        ) : (
                                            (() => {
                                                const colab = colaboradores.find(c => c.nome === person);
                                                return colab?.avatar_url ? (
                                                    <img src={colab.avatar_url} alt={person} className="w-10 h-10 rounded-full object-cover border" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-600 dark:text-slate-300">
                                                        {person.charAt(0).toUpperCase()}
                                                    </div>
                                                );
                                            })()
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-lg hover:underline cursor-pointer">{person}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {pending} pendentes · {completed} concluídas
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setInlineCreatePerson(inlineCreatePerson === person ? null : person);
                                                    setInlineTaskTitle("");
                                                }}
                                                className="gap-1.5 h-8 bg-transparent text-foreground border-foreground/20"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span className="text-xs hidden md:inline">Nova Tarefa</span>
                                            </Button>
                                            <div className="text-2xl font-bold ml-2 leading-none">{personTasks.length}</div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider relative -top-1">tarefas</span>
                                    </div>
                                </div>

                                {inlineCreatePerson === person && (
                                    <div className="p-3 bg-muted/40 border-b flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                autoFocus
                                                placeholder={`Nova tarefa para ${person}...`}
                                                value={inlineTaskTitle}
                                                onChange={(e) => setInlineTaskTitle(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleInlineCreate(person)}
                                                className="h-8 text-sm bg-background"
                                            />
                                            <Button size="sm" onClick={() => handleInlineCreate(person)} disabled={!inlineTaskTitle.trim()} className="h-8 px-3 shrink-0">
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-muted/30 border-b flex items-center justify-between text-xs">
                                    <div className="flex gap-4">
                                        <span className="flex items-center gap-1 text-destructive/80 font-medium"><span className="w-2 h-2 rounded-full bg-destructive/20 border border-destructive/50"></span> Atrasadas: {overdue}</span>
                                        <span className="flex items-center gap-1 text-rose-500/80 font-medium"><span className="w-2 h-2 rounded-full bg-rose-500/20 border border-rose-500/50"></span> Alta: {high}</span>
                                    </div>
                                    <span className="flex items-center gap-1 text-emerald-500/80 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500/50"></span> Taxa: {taxa}%</span>
                                </div>

                                <Progress value={taxa} className="h-1 rounded-none bg-border [&>div]:bg-emerald-500" />

                                <div className="flex-1 p-4 overflow-y-auto">
                                    {personTasks.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic text-center py-4">Nenhuma tarefa</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {personTasks.slice(0, 10).map(task => (
                                                <div
                                                    key={task.id}
                                                    className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${task.completed ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-background hover:border-primary/50"}`}
                                                    onClick={() => onTaskClick(task.id)}
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div onClick={e => e.stopPropagation()}>
                                                            <Checkbox
                                                                checked={task.completed}
                                                                onCheckedChange={c => toggleComplete({ id: task.id, completed: c as boolean })}
                                                                className={task.completed ? "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white data-[state=checked]:border-emerald-500 rounded-sm" : task.priority === 'alta' ? "border-rose-500 rounded-sm" : task.priority === 'media' ? "border-amber-500 rounded-sm" : "rounded-sm"}
                                                            />
                                                        </div>
                                                        <div className="truncate flex items-center gap-2">
                                                            {task.priority === 'alta' && !task.completed && <Badge className="text-[9px] px-1 h-4 bg-rose-500 hover:bg-rose-600 shrink-0 border-transparent text-white font-normal uppercase">{PRIORITY_LABELS.alta}</Badge>}
                                                            {task.priority === 'media' && !task.completed && <Badge className="text-[9px] px-1 h-4 bg-amber-500 hover:bg-amber-600 shrink-0 border-transparent text-white font-normal uppercase">{PRIORITY_LABELS.media}</Badge>}
                                                            <span className={`text-sm truncate font-medium ${task.completed ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                                                                {task.title}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {task.due_date && !task.completed && (
                                                        <span className={`text-[10px] shrink-0 ml-2 ${isOverdue(task.due_date, false) ? "text-destructive" : "text-muted-foreground"}`}>
                                                            {format(new Date(`${task.due_date}T00:00:00`), "dd MMM", { locale: ptBR })}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {personTasks.length > 10 && (
                                                <div className="text-center pt-2">
                                                    <span className="text-xs text-muted-foreground hover:underline cursor-pointer">Ver mais {personTasks.length - 10} tarefas</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // List Layout
    return (
        <div className="pb-20">
            {chartsSection}
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                {groupedByPerson.map(([person, originalTasks]) => {
                    const personTasks = hideCompleted ? originalTasks.filter(t => !t.completed) : originalTasks;
                    if (hideCompleted && personTasks.length === 0 && originalTasks.length > 0) return null;
                    const isCollapsed = collapsed[person] ?? false;
                    const completedCount = originalTasks.filter(t => t.completed).length;

                    return (
                        <div key={person} className="border rounded-xl bg-card overflow-hidden shadow-sm">
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors border-b"
                                onClick={() => toggleCollapse(person)}
                            >
                                <div className="flex items-center gap-3">
                                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground/60" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/60" />}
                                    <div onClick={e => e.stopPropagation()} className="flex items-center mr-1">
                                        <Checkbox
                                            checked={personTasks.length > 0 && personTasks.every(t => selectedTasks.includes(t.id))}
                                            onCheckedChange={(c) => {
                                                if (onSelectBatch) {
                                                    onSelectBatch(personTasks.map(t => t.id), !!c);
                                                }
                                            }}
                                            className="w-4 h-4"
                                            title="Selecionar todas desta pessoa"
                                        />
                                    </div>
                                    {person === "Sem Responsável" ? (
                                        <UserCircle className="w-6 h-6 text-muted-foreground" />
                                    ) : (
                                        (() => {
                                            const colab = colaboradores.find(c => c.nome === person);
                                            return colab?.avatar_url ? (
                                                <img src={colab.avatar_url} alt={person} className="w-8 h-8 rounded-full object-cover border shadow-sm" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-slate-50 dark:text-slate-900 flex items-center justify-center font-bold shadow-sm">
                                                    {person.charAt(0).toUpperCase()}
                                                </div>
                                            );
                                        })()
                                    )}
                                    <h3 className="font-semibold text-[15px]">{person}</h3>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-6 h-6 rounded-full bg-amber-500 text-white hover:bg-amber-600 ml-1 shadow-sm shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setInlineCreatePerson(inlineCreatePerson === person ? null : person);
                                            setInlineTaskTitle("");
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{personTasks.length} tarefas</span>
                                    <span className="flex items-center gap-1 opacity-70"><CheckCircle2Icon className="w-3 h-3 text-emerald-500" /> {completedCount}</span>
                                </div>
                            </div>

                            {inlineCreatePerson === person && (
                                <div className="p-3 bg-muted/40 border-b flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 mx-4 mt-2 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            autoFocus
                                            placeholder={`Nova tarefa para ${person}...`}
                                            value={inlineTaskTitle}
                                            onChange={(e) => setInlineTaskTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleInlineCreate(person)}
                                            className="h-8 text-sm bg-background"
                                        />
                                        <Button size="sm" onClick={() => handleInlineCreate(person)} disabled={!inlineTaskTitle.trim()} className="h-8 px-3 shrink-0">
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!isCollapsed && (
                                <>
                                    {personTasks.length === 0 ? (
                                        <div className="p-4 text-sm text-muted-foreground italic text-center">
                                            Nenhuma tarefa atribuída
                                        </div>
                                    ) : (
                                        <div className="bg-background">
                                            <div className="grid grid-cols-12 gap-4 p-3 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                <div className="col-span-12 sm:col-span-6 flex items-center gap-1 select-none">Tarefa <span className="opacity-50">↑↓</span></div>
                                                <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-1 select-none">Prioridade <span className="opacity-50">↑↓</span></div>
                                                <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-1 select-none">Prazo <span className="opacity-50">↑</span></div>
                                                <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-center items-center gap-1 select-none">Status <span className="opacity-50">↑↓</span></div>
                                            </div>
                                            <div className="divide-y">
                                                {personTasks.map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={`group grid grid-cols-12 gap-4 p-3 transition-colors items-center cursor-pointer ${task.completed ? "bg-emerald-50/50 dark:bg-emerald-950/20 relative before:absolute before:inset-0 before:border-b before:border-emerald-500/20 before:pointer-events-none" : "hover:bg-muted/50 border-b border-transparent"}`}
                                                        onClick={() => onTaskClick(task.id)}
                                                    >
                                                        <div className="col-span-12 sm:col-span-6 flex items-center gap-3 min-w-0">
                                                            <div onClick={e => e.stopPropagation()} className="shrink-0 pl-1 mt-0.5 sm:mt-0">
                                                                <Checkbox
                                                                    checked={selectedTasks.includes(task.id)}
                                                                    onCheckedChange={() => onToggleSelectTask(task.id)}
                                                                    className="w-4 h-4 rounded-sm border-muted-foreground/30 data-[state=checked]:border-primary"
                                                                    title="Selecionar tarefa"
                                                                />
                                                            </div>
                                                            <div onClick={e => e.stopPropagation()} className="shrink-0">
                                                                <Checkbox
                                                                    checked={task.completed}
                                                                    onCheckedChange={c => toggleComplete({ id: task.id, completed: c as boolean })}
                                                                    className={`w-5 h-5 border-2 transition-all rounded-sm ${task.completed ? "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white" : ""}`}
                                                                    title="Marcar como concluída"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col min-w-0 flex-1 ml-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`text-[13px] font-medium hover:underline truncate ${task.completed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                                                        {task.title}
                                                                    </p>
                                                                </div>
                                                                {task.list_id && (
                                                                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground truncate tracking-widest mt-0.5">
                                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: taskLists?.find(l => l.id === task.list_id)?.color || '#ccc' }} />
                                                                        <span className="uppercase">{taskLists?.find(l => l.id === task.list_id)?.name || 'Lista'}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {/* Mobile elements */}
                                                            <div className="sm:hidden flex flex-col items-end shrink-0 gap-1 text-xs">
                                                                {task.due_date && <span className={`${isOverdue(task.due_date, task.completed) ? "text-destructive" : "text-muted-foreground"}`}>{format(new Date(`${task.due_date}T00:00:00`), "dd/MM")}</span>}
                                                                {task.priority && !task.completed && <Badge variant="outline" className="text-[9px] px-1 h-4 scale-90">{PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}</Badge>}
                                                            </div>
                                                        </div>

                                                        <div className="col-span-2 hidden sm:flex justify-center">
                                                            {task.priority && !task.completed ? (
                                                                <Badge variant={task.priority === "alta" ? "destructive" : task.priority === "media" ? "secondary" : "outline"} className={`text-[10px] px-[10px] h-[22px] rounded-full shadow-sm font-medium ${task.priority === 'media' ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' : task.priority === 'alta' ? 'bg-rose-500 hover:bg-rose-600 border-transparent text-white' : ''}`}>
                                                                    {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] || task.priority}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground/30">-</span>
                                                            )}
                                                        </div>

                                                        <div className="col-span-2 hidden sm:flex justify-center">
                                                            {task.due_date ? (
                                                                <span className={`text-[13px] ${isOverdue(task.due_date, task.completed) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                                                    {format(new Date(`${task.due_date}T00:00:00`), "dd/MM/yyyy")}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground/30">-</span>
                                                            )}
                                                        </div>

                                                        <div className="col-span-2 hidden sm:flex justify-center items-center gap-3 relative">
                                                            <Badge variant="outline" className={`capitalize text-[10px] w-[76px] justify-center shadow-sm h-[22px] px-0 ${task.completed ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60" : "bg-muted/40 text-muted-foreground"}`}>
                                                                {task.completed ? "Concluída" : "Pendente"}
                                                            </Badge>
                                                            <div className="absolute right-[-10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="w-7 h-7 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                                                                            deleteTask(task.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function CheckCircle2Icon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
