import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarClock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/Auth/AuthContext";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { useQuery } from "@tanstack/react-query";
import { parseISO, isValid, isToday, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── helpers ────────────────────────────────────────────────────────────────────

function parseClientFromTitle(title: string): string | null {
    if (!title) return null;
    const match = title.match(/^([^|–\-]+)\s*[|–\-]/);
    return match ? match[1].trim() : null;
}

function isEventToday(ev: GoogleCalendarEvent): boolean {
    const raw = ev.start.dateTime || ev.start.date;
    if (!raw) return false;
    const d = parseISO(raw);
    return isValid(d) && isToday(d);
}

function formatHour(dateTimeStr: string | undefined): string {
    if (!dateTimeStr) return "";
    const d = parseISO(dateTimeStr);
    return isValid(d) ? format(d, "HH:mm", { locale: ptBR }) : "";
}

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

// ── data hooks ─────────────────────────────────────────────────────────────────

/** Returns { colaboradorId, nivelAcesso } for the logged-in user */
function useUserProfile(userId: string | undefined) {
    return useQuery({
        queryKey: ["user-profile-reuniao", userId],
        enabled: !!userId,
        queryFn: async () => {
            const [{ data: colab }, { data: profile }] = await Promise.all([
                supabase.from("colaboradores").select("id").eq("user_id", userId!).maybeSingle(),
                supabase.from("profiles").select("nivel_acesso").eq("user_id", userId!).maybeSingle(),
            ]);
            return {
                colaboradorId: colab?.id ?? null,
                nivelAcesso: profile?.nivel_acesso ?? null,
            };
        },
        staleTime: 30 * 60 * 1000,
    });
}

/** IDs of Google Calendar events the user is registered as participant */
function useMyEventIds(colaboradorId: string | null) {
    return useQuery({
        queryKey: ["my-google-event-ids", colaboradorId],
        enabled: !!colaboradorId,
        queryFn: async () => {
            const { data } = await supabase
                .from("google_event_participants")
                .select("google_event_id")
                .eq("colaborador_id", colaboradorId!);
            return new Set((data ?? []).map((r) => r.google_event_id as string));
        },
        staleTime: 5 * 60 * 1000,
    });
}

/** Active clients whose primary gestor is this user */
function useGestorClients(userId: string | undefined, enabled: boolean) {
    return useQuery({
        queryKey: ["gestor-clients", userId],
        enabled: enabled && !!userId,
        queryFn: async () => {
            const { data } = await supabase
                .from("clientes")
                .select("id, nome, aliases")
                .eq("primary_gestor_user_id", userId!)
                .eq("is_active", true);
            return data ?? [];
        },
        staleTime: 10 * 60 * 1000,
    });
}

/** All active clients (for admin mode) */
function useAllActiveClients(enabled: boolean) {
    return useQuery({
        queryKey: ["active-clients-minimal-reuniao"],
        enabled,
        queryFn: async () => {
            const { data } = await supabase
                .from("clientes")
                .select("id, nome, aliases")
                .eq("is_active", true);
            return data ?? [];
        },
        staleTime: 30 * 60 * 1000,
    });
}

/** Participants (colaboradores) for a set of event IDs */
function useEventParticipants(eventIds: string[]) {
    return useQuery({
        queryKey: ["event-participants-batch-dashboard", ...eventIds],
        enabled: eventIds.length > 0,
        queryFn: async () => {
            const { data } = await supabase
                .from("google_event_participants")
                .select("google_event_id, colaboradores:colaborador_id(id, nome, avatar_url)")
                .in("google_event_id", eventIds);
            return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

// ── component ──────────────────────────────────────────────────────────────────

interface ReuniaoItem {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    clienteId: string | null;
    clienteNome: string | null;
}

export function ReuniaoHojeCard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: userProfile, isLoading: loadingProfile } = useUserProfile(user?.id);
    const isGestorTrafego = userProfile?.nivelAcesso === "gestor_trafego";
    const isAdmin = ["admin", "dono"].includes(userProfile?.nivelAcesso ?? "");

    const { data: events = [], isLoading: loadingEvents } = useGoogleCalendar(1, 0);

    // Admin mode: filter by participation
    const { data: myEventIds, isLoading: loadingEventIds } = useMyEventIds(
        !isGestorTrafego ? (userProfile?.colaboradorId ?? null) : null
    );

    // Gestor mode: clients of this gestor
    const { data: gestorClients = [], isLoading: loadingGestorClients } = useGestorClients(
        user?.id,
        isGestorTrafego
    );

    // Admin mode: all active clients (to resolve client from event title)
    const { data: allClients = [], isLoading: loadingAllClients } = useAllActiveClients(!isGestorTrafego);

    const clientsToUse = isGestorTrafego ? gestorClients : allClients;
    const loadingClients = isGestorTrafego ? loadingGestorClients : loadingAllClients;

    const loading = loadingProfile || loadingEvents || loadingEventIds || loadingClients;

    // Build lookup: normalized name → { id, nome }
    const clientMap = useMemo(() => {
        const map = new Map<string, { id: string; nome: string }>();
        clientsToUse.forEach((c: any) => {
            map.set(c.nome.toLowerCase(), { id: c.id, nome: c.nome });
            if (c.aliases) {
                (c.aliases as string[]).forEach((a) => map.set(a.toLowerCase(), { id: c.id, nome: c.nome }));
            }
        });
        return map;
    }, [clientsToUse]);

    // Compute today's meetings depending on mode
    const reunioes = useMemo<ReuniaoItem[]>(() => {
        const todayEvents = events.filter(isEventToday);

        let filtered: GoogleCalendarEvent[];

        if (isGestorTrafego) {
            // Show all today's events whose title matches a client of this gestor
            filtered = todayEvents.filter((ev) => {
                const cn = parseClientFromTitle(ev.summary ?? "");
                return cn ? clientMap.has(cn.toLowerCase()) : false;
            });
        } else {
            // Admin/regular: show only events the user is registered as participant
            if (!myEventIds) return [];
            filtered = todayEvents.filter((ev) => myEventIds.has(ev.id));
        }

        return filtered
            .map((ev) => {
                const clienteName = parseClientFromTitle(ev.summary ?? "");
                const cliente = clienteName ? (clientMap.get(clienteName.toLowerCase()) ?? null) : null;
                return {
                    id: ev.id,
                    title: ev.summary || "(sem título)",
                    startTime: formatHour(ev.start.dateTime),
                    endTime: formatHour(ev.end.dateTime),
                    clienteId: cliente?.id ?? null,
                    clienteNome: cliente?.nome ?? clienteName,
                };
            })
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [events, isGestorTrafego, myEventIds, clientMap]);

    // Participants for each meeting
    const { data: participantsRaw = [] } = useEventParticipants(reunioes.map((r) => r.id));

    const participantsByEvent = useMemo(() => {
        const map = new Map<string, { id: string; nome: string; avatar_url: string | null }[]>();
        (participantsRaw as any[]).forEach((row) => {
            const colab = row.colaboradores;
            if (!colab) return;
            const list = map.get(row.google_event_id) ?? [];
            list.push(colab);
            map.set(row.google_event_id, list);
        });
        return map;
    }, [participantsRaw]);

    if (loading) {
        return (
            <Card className="border-2 border-cyan-100 bg-gradient-to-br from-cyan-50/60 to-background shadow-sm overflow-hidden animate-pulse">
                <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-cyan-100" />
                        <div className="h-4 w-40 bg-muted rounded" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 p-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <div className="h-8 w-8 rounded-md bg-muted/50" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-24 bg-muted rounded" />
                                <div className="h-2 w-16 bg-muted rounded" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (reunioes.length === 0) return null;

    const cardTitle = isGestorTrafego ? "Reuniões dos Clientes Hoje" : "Suas Reuniões de Hoje";

    return (
        <>
            <Card className="border-2 border-cyan-200 dark:border-cyan-900/40 bg-gradient-to-br from-cyan-50/70 to-background dark:bg-none dark:bg-card shadow-md overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 shrink-0">
                            <CalendarClock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <CardTitle className="text-base text-cyan-800 dark:text-cyan-300 font-bold flex-1">
                            {cardTitle}
                        </CardTitle>
                        <Badge className="bg-cyan-600 text-white text-[10px] px-1.5 py-0 h-5 min-w-[20px] justify-center mr-1">
                            {reunioes.length}
                        </Badge>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 shrink-0"
                            onClick={() => navigate("/atendimento")}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-1.5 p-2">
                    {reunioes.map((reuniao) => {
                        const participants = participantsByEvent.get(reuniao.id) ?? [];

                        return (
                            <div
                                key={reuniao.id}
                                className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-cyan-100 dark:border-cyan-900/30 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all"
                            >
                                {/* Row 1: Time + Client */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {reuniao.startTime && (
                                        <Badge
                                            variant="outline"
                                            className="text-[11px] font-bold px-1.5 py-0 h-5 border-cyan-200 text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 shrink-0"
                                        >
                                            {reuniao.startTime}
                                            {reuniao.endTime ? ` – ${reuniao.endTime}` : ""}
                                        </Badge>
                                    )}
                                    {reuniao.clienteNome && (
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                            {reuniao.clienteNome}
                                        </span>
                                    )}
                                </div>

                                {/* Row 2: Title */}
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-tight">
                                    {reuniao.title}
                                </p>

                                {/* Row 3: Participants */}
                                {participants.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <div className="flex -space-x-1.5">
                                            {participants.slice(0, 5).map((p) => (
                                                <Avatar key={p.id} className="h-5 w-5 border border-white dark:border-slate-800">
                                                    <AvatarImage src={p.avatar_url ?? undefined} alt={p.nome} />
                                                    <AvatarFallback className="text-[7px] bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-bold">
                                                        {getInitials(p.nome)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                            {participants.length > 5 && (
                                                <Avatar className="h-5 w-5 border border-white dark:border-slate-800">
                                                    <AvatarFallback className="text-[7px] bg-slate-100 text-slate-600 font-bold">
                                                        +{participants.length - 5}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                            {participants.slice(0, 3).map((p) => p.nome.split(" ")[0]).join(", ")}
                                            {participants.length > 3 ? ` +${participants.length - 3}` : ""}
                                        </span>
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </>
    );
}
