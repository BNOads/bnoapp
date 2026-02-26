import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import {
    format,
    isToday,
    isTomorrow,
    parseISO,
    isValid,
    startOfDay,
    endOfDay,
    addDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Clock,
    MapPin,
    Plus,
    RefreshCw,
    Video,
    ExternalLink,
    Search,
    ChevronLeft,
    ChevronRight,
    CalendarRange,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { RegistroReuniaoModal } from "@/components/Atendimento/RegistroReuniaoModal";
import { ParticipantesPopover } from "@/components/Atendimento/ParticipantesPopover";
import { MeetingRatingButtons } from "@/components/Atendimento/MeetingRatingButtons";
import { MeetingDetailDrawer } from "@/components/Atendimento/MeetingDetailDrawer";

const PAGE_SIZE = 5;

type DateFilter = "hoje" | "ontem" | "amanha" | "proximos7" | "ultimos7" | "ultimos30" | "ultimos90" | "custom";

const EVENT_COLORS = [
    { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-l-blue-500", dot: "bg-blue-500" },
    { bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-l-purple-500", dot: "bg-purple-500" },
    { bg: "bg-green-50 dark:bg-green-950/40", border: "border-l-green-500", dot: "bg-green-500" },
    { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-l-amber-500", dot: "bg-amber-500" },
    { bg: "bg-pink-50 dark:bg-pink-950/40", border: "border-l-pink-500", dot: "bg-pink-500" },
];

function getEventColor(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % EVENT_COLORS.length;
    return EVENT_COLORS[hash];
}

function getEventDate(event: GoogleCalendarEvent): Date | null {
    const raw = event.start.dateTime ?? event.start.date;
    if (!raw) return null;
    const d = parseISO(raw);
    return isValid(d) ? d : null;
}

function formatEventTime(event: GoogleCalendarEvent): string {
    const raw = event.start.dateTime;
    if (!raw) return "Dia todo";
    return format(parseISO(raw), "HH:mm");
}

function formatGroupLabel(date: Date): string {
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
        .replace(/^\w/, c => c.toUpperCase());
}

function getInitials(name?: string, email?: string): string {
    if (name) return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    if (email) return email[0].toUpperCase();
    return "?";
}

function isEventInPast(ev: GoogleCalendarEvent): boolean {
    const endRaw = ev.end?.dateTime ?? ev.end?.date;
    if (!endRaw) return false;
    const end = parseISO(endRaw);
    return isValid(end) && end < new Date();
}

interface GroupedEvents {
    label: string;
    date: Date;
    events: GoogleCalendarEvent[];
}

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
    // Extract prefix before " | " or "|"
    const sep = title.indexOf('|');
    const candidate = sep > 0 ? title.slice(0, sep).trim() : title.trim();
    if (!candidate) return null;
    const norm = normStr(candidate);
    let best: { id: string; nome: string } | null = null;
    let bestScore = 0;
    for (const c of clientes) {
        // Check nome
        if (normStr(c.nome) === norm) return { id: c.id, nome: c.nome };
        const nomeScore = normStr(c.nome).includes(norm) || norm.includes(normStr(c.nome)) ? 0.8 : 0;
        // Check aliases
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



export function EscalaReunioes() {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState<DateFilter>("hoje");
    const [userFilter, setUserFilter] = useState<string>("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [page, setPage] = useState(0);

    const daysBack = dateFilter === "ultimos90" ? 90 : dateFilter === "ultimos30" ? 30 : 7;
    const { data: events = [], isLoading: loadingCalendar, isFetching: fetchingCalendar, error, refetch } = useGoogleCalendar(30, daysBack);

    const { data: colaboradores = [], isLoading: loadingColaboradores } = useColaboradores();
    const { data: participants = [] } = useAllEventParticipants();
    const { data: clientes = [] } = useClientes();
    const queryClient = useQueryClient();

    const handleSync = async () => {
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["event-participants"] });
        queryClient.invalidateQueries({ queryKey: ["all-event-participants"] });
    };

    const isLoading = loadingCalendar || loadingColaboradores;

    // Apply date + search filters to flat events list
    const filteredEvents = useMemo(() => {
        const now = new Date();
        let from = startOfDay(now);
        let to = endOfDay(now);

        switch (dateFilter) {
            case "hoje":
                from = startOfDay(now);
                to = endOfDay(now);
                break;
            case "ontem":
                from = startOfDay(addDays(now, -1));
                to = endOfDay(addDays(now, -1));
                break;
            case "amanha":
                from = startOfDay(addDays(now, 1));
                to = endOfDay(addDays(now, 1));
                break;
            case "ultimos7":
                from = startOfDay(addDays(now, -7));
                to = endOfDay(now);
                break;
            case "ultimos30":
                from = startOfDay(addDays(now, -30));
                to = endOfDay(now);
                break;
            case "ultimos90":
                from = startOfDay(addDays(now, -90));
                to = endOfDay(now);
                break;
            case "custom":
                from = customFrom ? startOfDay(parseISO(customFrom)) : startOfDay(now);
                to = customTo ? endOfDay(parseISO(customTo)) : endOfDay(addDays(now, 30));
                break;
            case "proximos7":
            default:
                from = startOfDay(now);
                to = endOfDay(addDays(now, 7));
                break;
        }

        return events.filter(ev => {
            const d = getEventDate(ev);
            if (!d) return false;
            if (d < from || d > to) return false;

            // User filter: show events where this collaborator is a participant
            if (userFilter !== "all") {
                const isParticipant = (participants || []).some(
                    (p: any) => p.google_event_id === ev.id && p.colaborador_id === userFilter
                );
                if (!isParticipant) return false;
            }

            if (search) {
                const q = search.toLowerCase();
                return (
                    (ev.summary ?? "").toLowerCase().includes(q) ||
                    (ev.location ?? "").toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [events, dateFilter, customFrom, customTo, search, userFilter, participants]);

    // Group filtered events by date
    const grouped: GroupedEvents[] = useMemo(() => {
        const map = new Map<string, GroupedEvents>();
        filteredEvents.forEach(ev => {
            const date = getEventDate(ev);
            if (!date) return;
            const key = format(date, "yyyy-MM-dd");
            if (!map.has(key)) {
                map.set(key, { label: formatGroupLabel(date), date, events: [] });
            }
            map.get(key)!.events.push(ev);
        });
        return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [filteredEvents]);

    // Flat list of events for pagination
    const flatEvents = filteredEvents;
    const totalPages = Math.ceil(flatEvents.length / PAGE_SIZE);
    const pagedEvents = flatEvents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Re-group paged events
    const pagedGrouped: GroupedEvents[] = useMemo(() => {
        const map = new Map<string, GroupedEvents>();
        pagedEvents.forEach(ev => {
            const date = getEventDate(ev);
            if (!date) return;
            const key = format(date, "yyyy-MM-dd");
            if (!map.has(key)) {
                map.set(key, { label: formatGroupLabel(date), date, events: [] });
            }
            map.get(key)!.events.push(ev);
        });
        return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [pagedEvents]);

    const handleFilterChange = (val: DateFilter) => {
        setDateFilter(val);
        setPage(0);
    };

    return (
        <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-8 h-9 w-48 text-sm"
                            placeholder="Buscar reunião..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0); }}
                        />
                    </div>

                    {/* Date filter */}
                    <Select value={dateFilter} onValueChange={v => handleFilterChange(v as DateFilter)}>
                        <SelectTrigger className="w-[160px] h-9">
                            <CalendarRange className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hoje">Hoje</SelectItem>
                            <SelectItem value="ontem">Ontem</SelectItem>
                            <SelectItem value="amanha">Amanhã</SelectItem>
                            <SelectItem value="proximos7">Próximos 7 dias</SelectItem>
                            <SelectItem value="ultimos7">Últimos 7 dias</SelectItem>
                            <SelectItem value="ultimos30">Últimos 30 dias</SelectItem>
                            <SelectItem value="ultimos90">Últimos 90 dias</SelectItem>
                            <SelectItem value="custom">Personalizar</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* User filter */}
                    <Select value={userFilter} onValueChange={v => { setUserFilter(v); setPage(0); }}>
                        <SelectTrigger className="w-[180px] h-9">
                            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Filtrar por usuário" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os usuários</SelectItem>
                            {colaboradores.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.nome}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Custom date range inputs */}
                    {dateFilter === "custom" && (
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="date"
                                className="h-9 text-sm w-36"
                                value={customFrom}
                                onChange={e => { setCustomFrom(e.target.value); setPage(0); }}
                            />
                            <span className="text-muted-foreground text-xs">até</span>
                            <Input
                                type="date"
                                className="h-9 text-sm w-36"
                                value={customTo}
                                onChange={e => { setCustomTo(e.target.value); setPage(0); }}
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Event count badge */}
                    {flatEvents.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {flatEvents.length} evento{flatEvents.length !== 1 ? "s" : ""}
                        </span>
                    )}

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleSync} disabled={fetchingCalendar}>
                                    <RefreshCw className={`h-4 w-4 ${fetchingCalendar ? "animate-spin" : ""}`} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Atualizar</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Button size="sm" className="h-9 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0" onClick={() => setModalOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Novo
                    </Button>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
                </div>
            )}

            {/* Error */}
            {error && !isLoading && (
                <p className="text-xs text-destructive text-center">{(error as Error).message ?? String(error)}</p>
            )}

            {/* Events */}
            {!isLoading && !error && (
                <div className="space-y-5">
                    {pagedGrouped.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-muted py-12 text-center text-sm text-muted-foreground">
                            Nenhum evento encontrado para o período selecionado.
                        </div>
                    ) : (
                        pagedGrouped.map(group => (
                            <div key={group.label} className="space-y-2">
                                <p className="text-sm font-semibold text-muted-foreground tracking-wide">
                                    {group.label}
                                </p>

                                {group.events.map(ev => {
                                    const color = getEventColor(ev.id);
                                    const time = formatEventTime(ev);
                                    const attendees = (ev.attendees ?? []).filter(a => !a.self);
                                    const location = ev.location;

                                    return (
                                        <div
                                            key={ev.id}
                                            className={`rounded-xl border border-l-4 ${color.border} ${color.bg} px-4 py-3.5 transition-all hover:shadow-sm`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <span className={`mt-2 h-2.5 w-2.5 rounded-full flex-shrink-0 ${color.dot}`} />

                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        {/* Title + badge */}
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                className="font-semibold truncate max-w-[350px] hover:underline text-left cursor-pointer"
                                                                onClick={e => { e.stopPropagation(); setSelectedEvent(ev); setDrawerOpen(true); }}
                                                            >
                                                                {ev.summary || "(sem título)"}
                                                            </button>
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                                Reunião
                                                            </Badge>
                                                            {(() => {
                                                                const matched = matchClientFromTitle(ev.summary ?? "", clientes);
                                                                if (!matched) return null;
                                                                return (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                                                                        {matched.nome}
                                                                    </Badge>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Time + location + meet */}
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1 font-medium">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {time}
                                                            </span>
                                                            {location && (
                                                                <span className="flex items-center gap-1 truncate max-w-[200px]">
                                                                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                                                    {location}
                                                                </span>
                                                            )}
                                                            {ev.hangoutLink && (
                                                                <a
                                                                    href={ev.hangoutLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 text-blue-600 hover:underline"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <Video className="h-3.5 w-3.5" />
                                                                    Google Meet
                                                                </a>
                                                            )}
                                                        </div>

                                                        {/* Internal BNOapp Participants only */}
                                                        <div className="flex items-center gap-3 pt-0.5">
                                                            <ParticipantesPopover googleEventId={ev.id} />
                                                        </div>

                                                        {/* Rating buttons for past events */}
                                                        {isEventInPast(ev) && (
                                                            <div className="pt-1">
                                                                <MeetingRatingButtons
                                                                    googleEventId={ev.id}
                                                                    titulo={ev.summary}
                                                                    dataEvento={ev.start.dateTime ?? ev.start.date ?? undefined}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {ev.htmlLink && (
                                                    <a
                                                        href={ev.htmlLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-xs text-muted-foreground">
                                Página {page + 1} de {totalPages} · {flatEvents.length} evento{flatEvents.length !== 1 ? "s" : ""}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <RegistroReuniaoModal open={modalOpen} onOpenChange={setModalOpen} />
            <MeetingDetailDrawer
                event={selectedEvent}
                open={drawerOpen}
                onOpenChange={open => { setDrawerOpen(open); if (!open) setSelectedEvent(null); }}
            />
        </div>
    );
}
