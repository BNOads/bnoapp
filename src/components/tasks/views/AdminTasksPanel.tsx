import React, { useMemo } from "react";
import { Task, PRIORITY_LABELS } from "@/types/tasks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { isOverdue } from "@/lib/dateUtils";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface AdminTasksPanelProps {
    tasks: Task[];
}

export function AdminTasksPanel({ tasks }: AdminTasksPanelProps) {
    // 1. Prioridade (Aberto vs Concluído tb)
    const priorityData = useMemo(() => {
        const counts = { alta: 0, media: 0, baixa: 0 };
        tasks.forEach(t => {
            if (!t.completed && t.priority) {
                counts[t.priority as keyof typeof counts]++;
            }
        });
        return [
            { name: PRIORITY_LABELS.alta, value: counts.alta, color: "#ef4444" },
            { name: PRIORITY_LABELS.media, value: counts.media, color: "#eab308" },
            { name: PRIORITY_LABELS.baixa, value: counts.baixa, color: "#3b82f6" },
        ].filter(d => d.value > 0);
    }, [tasks]);

    // 2. Tarefas por Colaborador
    const assigneeData = useMemo(() => {
        const assignees: Record<string, { total: number, completed: number, overdue: number }> = {};
        tasks.forEach(t => {
            const name = t.assignee || "Sem Responsável";
            if (!assignees[name]) assignees[name] = { total: 0, completed: 0, overdue: 0 };

            assignees[name].total++;
            if (t.completed) {
                assignees[name].completed++;
            } else if (isOverdue(t.due_date, false)) {
                assignees[name].overdue++;
            }
        });

        return Object.entries(assignees).map(([name, data]) => ({
            name,
            ...data,
            pending: data.total - data.completed
        })).sort((a, b) => b.total - a.total);
    }, [tasks]);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const overdueTasks = tasks.filter(t => !t.completed && isOverdue(t.due_date, false)).length;

    return (
        <div className="space-y-6 pb-20 overflow-y-auto h-full pr-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Total de Tarefas</p>
                            <h3 className="text-2xl font-bold">{totalTasks}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Clock className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-green-500/5 border-green-500/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Concluídas</p>
                            <h3 className="text-2xl font-bold text-green-600">{completedTasks}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-500/5 border-red-500/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Atrasadas</p>
                            <h3 className="text-2xl font-bold text-red-600">{overdueTasks}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-600">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Distribuição de Prioridades (Pendentes)</CardTitle>
                        <CardDescription>Visualização de todas as tarefas em aberto</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {priorityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={priorityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {priorityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`${value} tarefas`, 'Quantidade']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                Nenhuma tarefa pendente com prioridade definida.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Tarefas por Colaborador</CardTitle>
                        <CardDescription>Relação de status das tarefas atribuídas</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {assigneeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={assigneeData.slice(0, 10)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} width={80} />
                                    <YAxis />
                                    <Tooltip wrapperClassName="rounded-md shadow-lg" />
                                    <Legend />
                                    <Bar dataKey="completed" name="Concluídas" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="pending" name="No Prazo" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="overdue" name="Atrasadas" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                Nenhuma tarefa atribuída.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Resumo da Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {assigneeData.map(person => (
                            <div key={person.name} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                                <h4 className="font-semibold mb-3 truncate" title={person.name}>{person.name}</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total:</span>
                                        <span className="font-medium">{person.total}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600">
                                        <span>Concluídas:</span>
                                        <span className="font-medium">{person.completed}</span>
                                    </div>
                                    <div className="flex justify-between text-blue-600">
                                        <span>No Prazo:</span>
                                        <span className="font-medium">{person.pending - person.overdue}</span>
                                    </div>
                                    <div className="flex justify-between text-red-600">
                                        <span>Atrasadas:</span>
                                        <span className="font-medium">{person.overdue}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
