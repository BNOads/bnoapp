import { useMemo, useEffect, useState } from "react";
import { parseISO, isValid } from "date-fns";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Video, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getInitials(name?: string, email?: string): string {
    if (name) return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    if (email) return email[0].toUpperCase();
    return "?";
}

function isHappeningNow(ev: GoogleCalendarEvent, now: Date): boolean {
    const startRaw = ev.start.dateTime;
    const endRaw = ev.end.dateTime;
    if (!startRaw || !endRaw) return false;
    const start = parseISO(startRaw);
    const end = parseISO(endRaw);
    if (!isValid(start) || !isValid(end)) return false;
    return now >= start && now <= end;
}

function useInternalParticipants(eventIds: string[]) {
    return useQuery({
        queryKey: ["event-participants-batch", ...eventIds],
        enabled: eventIds.length > 0,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("google_event_participants")
                .select("google_event_id, colaboradores:colaborador_id(id, nome, avatar_url)")
                .in("google_event_id", eventIds);
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 2 * 60 * 1000,
        refetchInterval: 60_000,
    });
}

function useActiveClients() {
    return useQuery({
        queryKey: ["active-clients-minimal"],
        queryFn: async () => {
            const { data } = await supabase
                .from("clientes")
                .select("nome, aliases")
                .eq("is_active", true);
            return data ?? [];
        },
        staleTime: 30 * 60 * 1000,
    });
}

function parseClientFromTitle(title: string): string | null {
    if (!title) return null;
    const match = title.match(/^([^|–\-]+)\s*[|–\-]/);
    return match ? match[1].trim() : null;
}

export function LiveMeetingBanner() {
    const { data: events = [] } = useGoogleCalendar(1); // just today
    const { data: activeClients = [] } = useActiveClients();
    const [now, setNow] = useState(() => new Date());

    // Refresh the "now" every 30 seconds to keep the live check current
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);

    const liveEvents = useMemo(() => {
        const activeNameSet = new Set<string>();
        activeClients.forEach(c => {
            activeNameSet.add(c.nome.toLowerCase());
            if (c.aliases) {
                c.aliases.forEach((a: string) => activeNameSet.add(a.toLowerCase()));
            }
        });

        return events.filter(ev => {
            if (!isHappeningNow(ev, now)) return false;

            // Client filter: If it looks like a client meeting, must be an active client
            const clientName = parseClientFromTitle(ev.summary ?? "");
            if (clientName) {
                return activeNameSet.has(clientName.toLowerCase());
            }

            return true;
        });
    }, [events, now, activeClients]);

    const { data: participants = [] } = useInternalParticipants(liveEvents.map(e => e.id));

    if (liveEvents.length === 0) return null;

    return (
        <Card className="border-red-100 dark:border-red-900/30 overflow-hidden">
            <CardHeader className="pb-3 px-4 pt-4 bg-red-50/30 dark:bg-red-950/10 border-b border-red-50 dark:border-red-900/20">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-red-700 dark:text-red-400">
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40">
                            <Video className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <span>Reuniões ao Vivo</span>
                    </CardTitle>
                    <Badge variant="outline" className="bg-red-50/50 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800 animate-pulse flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {liveEvents.length} Agora
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3 bg-red-50/10 dark:bg-red-950/5 pt-3">
                {liveEvents.map(ev => {
                    const externalAttendees = (ev.attendees ?? []).filter(a => !a.self);
                    const internalParticipants = (participants as any[])
                        .filter((p: any) => p.google_event_id === ev.id)
                        .map((p: any) => p.colaboradores)
                        .filter(Boolean);

                    const allParticipants = [
                        ...internalParticipants.map((c: any) => ({ name: c.nome, avatar: c.avatar_url })),
                        ...externalAttendees.map(a => ({ name: a.displayName ?? a.email ?? "?", avatar: null })),
                    ];

                    return (
                        <div
                            key={ev.id}
                            className="flex flex-col p-3 rounded-xl border-2 bg-card hover:bg-muted/50 hover:border-red-400 cursor-default transition-all gap-2 shadow-sm group"
                        >
                            {/* Row 1: Title & Button */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <span className="font-extrabold text-[15px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2" title={ev.summary}>
                                    {ev.summary || "(sem título)"}
                                </span>
                                {ev.hangoutLink && (
                                    <a
                                        href={ev.hangoutLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white hover:text-white bg-blue-600 dark:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-700 shrink-0 hover:bg-blue-700 transition-colors"
                                    >
                                        <Video className="h-4 w-4" />
                                        Entrar
                                    </a>
                                )}
                            </div>

                            {/* Row 2: Participants */}
                            {allParticipants.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="flex -space-x-2">
                                        {allParticipants.slice(0, 5).map((p, i) => (
                                            <TooltipProvider key={i}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-red-200 dark:ring-red-900">
                                                            <AvatarImage src={p.avatar ?? undefined} />
                                                            <AvatarFallback className="text-[9px] bg-red-100 text-red-700 font-semibold dark:bg-red-900/60 dark:text-red-300">
                                                                {getInitials(p.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{p.name}</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                        {allParticipants.length > 5 && (
                                            <Avatar className="h-6 w-6 border-2 border-background">
                                                <AvatarFallback className="text-[9px] bg-muted font-semibold">
                                                    +{allParticipants.length - 5}
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground ml-1">
                                        Participando
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
