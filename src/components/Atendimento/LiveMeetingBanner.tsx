import { useMemo, useEffect, useState } from "react";
import { parseISO, isValid } from "date-fns";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Video } from "lucide-react";

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

export function LiveMeetingBanner() {
    const { data: events = [] } = useGoogleCalendar(1); // just today
    const [now, setNow] = useState(() => new Date());

    // Refresh the "now" every 30 seconds to keep the live check current
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(id);
    }, []);

    const liveEvents = useMemo(
        () => events.filter(ev => isHappeningNow(ev, now)),
        [events, now]
    );

    const { data: participants = [] } = useInternalParticipants(liveEvents.map(e => e.id));

    if (liveEvents.length === 0) return null;

    return (
        <div className="flex flex-col gap-3">
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
                        className="rounded-xl border border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 px-5 py-4 flex items-center justify-between gap-4 shadow-sm"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            {/* Live indicator */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                                </span>
                                <span className="text-xs font-bold tracking-widest text-red-600 dark:text-red-400 uppercase">
                                    Ao Vivo
                                </span>
                            </div>

                            <div className="h-5 w-px bg-red-200 dark:bg-red-800 shrink-0" />

                            {/* Event name */}
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate max-w-[300px]">
                                    {ev.summary || "(sem título)"}
                                </p>
                                {allParticipants.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {allParticipants.map(p => p.name).slice(0, 3).join(", ")}
                                        {allParticipants.length > 3 && ` +${allParticipants.length - 3}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Right side: avatars + meet link */}
                        <div className="flex items-center gap-3 shrink-0">
                            {allParticipants.length > 0 && (
                                <div className="flex -space-x-2">
                                    {allParticipants.slice(0, 5).map((p, i) => (
                                        <TooltipProvider key={i}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Avatar className="h-9 w-9 border-2 border-background ring-1 ring-red-200 dark:ring-red-900">
                                                        <AvatarImage src={p.avatar ?? undefined} />
                                                        <AvatarFallback className="text-[11px] bg-red-100 text-red-700 font-semibold dark:bg-red-900/60 dark:text-red-300">
                                                            {getInitials(p.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </TooltipTrigger>
                                                <TooltipContent>{p.name}</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                    {allParticipants.length > 5 && (
                                        <Avatar className="h-9 w-9 border-2 border-background">
                                            <AvatarFallback className="text-[11px] bg-muted font-semibold">
                                                +{allParticipants.length - 5}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            )}

                            {ev.hangoutLink && (
                                <a
                                    href={ev.hangoutLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800"
                                >
                                    <Video className="h-3.5 w-3.5" />
                                    Entrar
                                </a>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
