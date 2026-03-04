import { useMemo, useState } from "react";
import { formatDistanceToNow, differenceInDays, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users } from "lucide-react";

function useColaboradores() {
    return useQuery({
        queryKey: ["colaboradores-ativos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("colaboradores")
                .select("id, nome, avatar_url")
                .eq("ativo", true)
                .order("nome", { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });
}

function useAllEventParticipants() {
    return useQuery({
        queryKey: ["all-event-participants"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("google_event_participants")
                .select("google_event_id, colaborador_id");
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

function useClientes() {
    return useQuery({
        queryKey: ["clientes-for-calendar"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome, aliases, slug")
                .eq("is_active", true)
                .order("nome", { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 15 * 60 * 1000,
    });
}

function normStr(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function matchClientFromTitle(title: string, clientes: { id: string; nome: string; aliases: string[] | null }[]): { id: string; nome: string } | null {
    const sep = title.indexOf('|');
    const candidate = sep > 0 ? title.slice(0, sep).trim() : title.trim();
    if (!candidate) return null;
    const norm = normStr(candidate);
    let best: { id: string; nome: string } | null = null;
    let bestScore = 0;
    for (const c of clientes) {
        if (normStr(c.nome) === norm) return { id: c.id, nome: c.nome };
        const nomeScore = normStr(c.nome).includes(norm) || norm.includes(normStr(c.nome)) ? 0.8 : 0;
        let aliasScore = 0;
        for (const a of (c.aliases ?? [])) {
            if (normStr(a) === norm) return { id: c.id, nome: c.nome };
            if (normStr(a).includes(norm) || norm.includes(normStr(a))) aliasScore = 0.8;
        }
        const score = Math.max(nomeScore, aliasScore);
        if (score > bestScore) { bestScore = score; best = { id: c.id, nome: c.nome }; }
    }
    return bestScore >= 0.8 ? best : null;
}

function getEventDate(event: GoogleCalendarEvent): Date | null {
    const raw = event.start.dateTime ?? event.start.date;
    if (!raw) return null;
    const d = parseISO(raw);
    return isValid(d) ? d : null;
}

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

export function MatrizPresencaReunioes() {
    // Buscar reuniões dos últimos 90 dias
    const { data: events = [], isLoading: loadingEvents } = useGoogleCalendar(0, 90);
    const { data: colaboradores = [], isLoading: loadingColabs } = useColaboradores();
    const { data: participants = [], isLoading: loadingParts } = useAllEventParticipants();
    const { data: clientes = [], isLoading: loadingClientes } = useClientes();

    const [search, setSearch] = useState("");
    const [colabFilter, setColabFilter] = useState("all");

    const isLoading = loadingEvents || loadingColabs || loadingParts || loadingClientes;

    const matrixData = useMemo(() => {
        if (!events.length || !colaboradores.length || !clientes.length) return null;

        const now = new Date();
        const clientPresence = new Map<string, Map<string, Date>>();
        const activeColabs = new Set<string>();
        const activeClients = new Set<string>();

        events.forEach(ev => {
            const date = getEventDate(ev);
            if (!date || date > now) return; // Apenas eventos que já aconteceram

            const matchedClient = matchClientFromTitle(ev.summary ?? "", clientes);
            if (!matchedClient) return;

            const evParts = participants.filter((p: any) => p.google_event_id === ev.id);
            if (evParts.length === 0) return;

            activeClients.add(matchedClient.id);
            if (!clientPresence.has(matchedClient.id)) {
                clientPresence.set(matchedClient.id, new Map());
            }

            const colabMap = clientPresence.get(matchedClient.id)!;

            evParts.forEach((p: any) => {
                activeColabs.add(p.colaborador_id);
                const existingDate = colabMap.get(p.colaborador_id);
                if (!existingDate || date > existingDate) {
                    colabMap.set(p.colaborador_id, date);
                }
            });
        });

        // Montar linhas (clientes)
        const rows = Array.from(activeClients).map(clientId => {
            const client = clientes.find((c: any) => c.id === clientId)!;
            const presence = clientPresence.get(clientId)!;
            return {
                client,
                presence
            };
        }).sort((a, b) => a.client.nome.localeCompare(b.client.nome));

        // Montar colunas (colaboradores que participaram de alguma reunião)
        const cols = Array.from(activeColabs).map(colabId => {
            return colaboradores.find((c: any) => c.id === colabId)!;
        }).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome));

        return { rows, cols, activeColabsList: cols };
    }, [events, colaboradores, participants, clientes]);

    const filteredMatrixData = useMemo(() => {
        if (!matrixData) return null;

        let filteredRows = matrixData.rows;
        let filteredCols = matrixData.cols;

        if (search.trim()) {
            const q = search.toLowerCase();
            filteredRows = filteredRows.filter(r => r.client.nome.toLowerCase().includes(q));
        }

        if (colabFilter !== "all") {
            filteredCols = filteredCols.filter(c => c.id === colabFilter);
            // Optional: hide rows that don't have attendance for the selected collaborator
            // filteredRows = filteredRows.filter(r => r.presence.has(colabFilter));
        }

        return { rows: filteredRows, cols: filteredCols, allCols: matrixData.activeColabsList };
    }, [matrixData, search, colabFilter]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Tabela de Presença</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                        Calculando tabela de presença...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!matrixData || matrixData.rows.length === 0) {
        return null;
    }

    const hasData = filteredMatrixData && filteredMatrixData.rows.length > 0;

    return (
        <Card className="overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Presença em Reuniões</CardTitle>
                        <CardDescription>Dias decorridos desde a última participação de cada pessoa nas reuniões do cliente (últimos 90 dias)</CardDescription>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-8 h-9 w-[200px] text-sm"
                                placeholder="Buscar cliente..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={colabFilter} onValueChange={setColabFilter}>
                            <SelectTrigger className="w-[180px] h-9">
                                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Filtrar equipe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toda a equipe</SelectItem>
                                {filteredMatrixData?.allCols.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {!hasData ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum resultado encontrado para os filtros atuais.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/10 hover:bg-muted/10 border-b">
                                    <TableHead className="w-[250px] font-semibold sticky left-0 bg-card z-20 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] align-bottom pb-4">
                                        Cliente
                                    </TableHead>
                                    {filteredMatrixData.cols.map(colab => (
                                        <TableHead key={colab.id} className="text-center min-w-[90px] px-2 py-3 bg-card">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex flex-col items-center gap-1.5 cursor-pointer">
                                                            <Avatar className="h-8 w-8 ring-2 ring-background">
                                                                <AvatarImage src={colab.avatar_url ?? undefined} />
                                                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                                    {getInitials(colab.nome)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-[10px] font-medium truncate w-[80px] text-center leading-tight">
                                                                {colab.nome}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{colab.nome}</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMatrixData.rows.map(row => (
                                    <TableRow key={row.client.id} className="hover:bg-muted/30 transition-colors group">
                                        <TableCell className="font-medium sticky left-0 bg-background group-hover:bg-muted/30 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] py-3">
                                            <div className="truncate w-[230px]" title={row.client.nome}>
                                                {row.client.nome}
                                            </div>
                                        </TableCell>
                                        {filteredMatrixData.cols.map(colab => {
                                            const date = row.presence.get(colab.id);
                                            if (!date) {
                                                return (
                                                    <TableCell key={colab.id} className="text-center p-2">
                                                        <span className="text-muted-foreground/30 text-xs">-</span>
                                                    </TableCell>
                                                );
                                            }

                                            const days = differenceInDays(new Date(), date);
                                            const isRecent = days <= 15;
                                            const isWarning = days > 15 && days <= 30;
                                            const isDanger = days > 30;

                                            let badgeClass = "bg-muted text-muted-foreground border-transparent";
                                            if (isRecent) badgeClass = "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900";
                                            else if (isWarning) badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-900";
                                            else if (isDanger) badgeClass = "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900";

                                            return (
                                                <TableCell key={colab.id} className="text-center p-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex justify-center">
                                                                    <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0.5 ${badgeClass} cursor-help`}>
                                                                        {days === 0 ? "Hoje" : `${days} d`}
                                                                    </Badge>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Última vez: {formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}
                                                                <br />
                                                                ({date.toLocaleDateString('pt-BR')})
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
