import { useMemo } from "react";
import { format, isToday, isFuture, isPast, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle, Clock, Users, TrendingUp } from "lucide-react";
import { useMeetings } from "@/hooks/useMeetings";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function DashboardAtendimento() {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: meetings = [], isLoading } = useMeetings({ data_inicio: today, data_fim: today });
    const { userData } = useCurrentUser();

    const now = new Date();

    const { meuMeetingsHoje, acontecendoAgora, proximas, totalMeetings } = useMemo(() => {
        const activeMeetings = meetings.filter((m: any) => m.clientes?.is_active !== false);

        const meus = activeMeetings.filter((m: any) =>
            m.colaboradores?.nome === userData?.nome || m.gestor_id === userData?.id
        );

        const agora = activeMeetings.filter((m: any) => {
            const start = parseISO(`${m.data}T${m.hora_inicio}`);
            const end = m.hora_fim ? parseISO(`${m.data}T${m.hora_fim}`) : null;
            return isPast(start) && (!end || isFuture(end));
        });

        const prox = activeMeetings
            .filter((m: any) => {
                const start = parseISO(`${m.data}T${m.hora_inicio}`);
                return isFuture(start);
            })
            .slice(0, 3);

        return {
            meuMeetingsHoje: meus,
            acontecendoAgora: agora,
            proximas: prox,
            totalMeetings: activeMeetings.length
        };
    }, [meetings, userData]);

    if (isLoading) {
        return <div className="text-muted-foreground text-sm py-8 text-center">Carregando...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Banner pessoal */}
            {userData && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-center gap-4">
                    <CalendarDays className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-foreground">
                            {meuMeetingsHoje.length === 0
                                ? "Você não tem reuniões hoje."
                                : `Você tem ${meuMeetingsHoje.length} reunião${meuMeetingsHoje.length > 1 ? "ões" : ""} hoje.`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Total do dia: {totalMeetings} reunião(ões) agendada(s) para o time.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-500/10 p-2.5">
                                <CalendarDays className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalMeetings}</p>
                                <p className="text-xs text-muted-foreground">Reuniões Hoje</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-green-500/10 p-2.5">
                                <Clock className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{acontecendoAgora.length}</p>
                                <p className="text-xs text-muted-foreground">Acontecendo Agora</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-orange-500/10 p-2.5">
                                <Users className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{meuMeetingsHoje.length}</p>
                                <p className="text-xs text-muted-foreground">Minhas Reuniões</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-purple-500/10 p-2.5">
                                <TrendingUp className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{proximas.length}</p>
                                <p className="text-xs text-muted-foreground">Próximas</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Acontecendo Agora */}
            {acontecendoAgora.length > 0 && (
                <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Acontecendo Agora
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {acontecendoAgora.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between text-sm">
                                <div>
                                    <span className="font-medium">{(m.clientes as any)?.nome ?? "—"}</span>
                                    <span className="text-muted-foreground ml-2">· {m.hora_inicio} – {m.hora_fim ?? "?"}</span>
                                </div>
                                <Badge variant="outline" className="text-green-600 border-green-400">Em andamento</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Próximas reuniões */}
            {proximas.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Próximas Reuniões de Hoje</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {proximas.map((m: any) => {
                            const start = parseISO(`${m.data}T${m.hora_inicio}`);
                            const diffMin = differenceInMinutes(start, now);
                            return (
                                <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                    <div>
                                        <span className="font-medium">{(m.clientes as any)?.nome ?? "—"}</span>
                                        <span className="text-muted-foreground ml-2">às {m.hora_inicio}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        em {diffMin < 60 ? `${diffMin}min` : `${Math.floor(diffMin / 60)}h`}
                                    </span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {totalMeetings === 0 && (
                <div className="rounded-xl border-2 border-dashed border-muted py-12 text-center text-sm text-muted-foreground">
                    Nenhuma reunião agendada para hoje.
                </div>
            )}
        </div>
    );
}
