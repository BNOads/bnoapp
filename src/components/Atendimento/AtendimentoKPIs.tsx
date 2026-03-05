import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfDay, endOfDay, parseISO, isValid } from "date-fns";
import { CalendarCheck2, CalendarClock, UserCheck } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { supabase } from "@/integrations/supabase/client";

function useCurrentUserId() {
    return useQuery({
        queryKey: ["current-user-id"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user?.id ?? null;
        },
        staleTime: 60 * 60 * 1000,
    });
}

function useUserEscaladoEventIds(userId: string | null | undefined) {
    return useQuery({
        queryKey: ["user-escalado-events", userId],
        enabled: !!userId,
        queryFn: async () => {
            // First find the colaborador_id for this user_id
            const { data: colaborador } = await supabase
                .from("colaboradores")
                .select("id")
                .eq("user_id", userId!)
                .single();

            if (!colaborador) return new Set();

            const { data } = await supabase
                .from("google_event_participants")
                .select("google_event_id")
                .eq("colaborador_id", colaborador.id);
            return new Set((data ?? []).map((r: any) => r.google_event_id));
        },
        staleTime: 5 * 60 * 1000,
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

export function AtendimentoKPIs() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const { data: events = [], isLoading: loadingCalendar } = useGoogleCalendar(30);
    const { data: userId } = useCurrentUserId();
    const { data: escaladoIds = new Set() } = useUserEscaladoEventIds(userId);
    const { data: activeClients = [], isLoading: loadingClients } = useActiveClients();

    const { totalHoje, jaFeitas, escalado } = useMemo(() => {
        // Create a Set of all active client names and aliases for fast lookup
        const activeNameSet = new Set<string>();
        activeClients.forEach(c => {
            activeNameSet.add(c.nome.toLowerCase());
            if (c.aliases) {
                c.aliases.forEach((a: string) => activeNameSet.add(a.toLowerCase()));
            }
        });

        const todayEvents = events.filter(ev => {
            // 1. Time filter
            const startRaw = ev.start?.dateTime ?? ev.start?.date;
            if (!startRaw) return false;
            let isToday = false;
            try {
                const start = parseISO(startRaw);
                isToday = isValid(start) && start >= todayStart && start <= todayEnd;
            } catch { return false; }
            if (!isToday) return false;

            return true;
        });

        const done = todayEvents.filter(ev => {
            const endRaw = ev.end?.dateTime ?? ev.end?.date;
            if (!endRaw) return false;
            try { return parseISO(endRaw) < now; } catch { return false; }
        });

        const esc = todayEvents.filter(ev => escaladoIds.has(ev.id));

        return { totalHoje: todayEvents.length, jaFeitas: done.length, escalado: esc.length };
    }, [events, escaladoIds, todayStart, todayEnd, activeClients]);

    if (loadingCalendar || loadingClients) return null;

    const kpis = [
        {
            icon: CalendarClock,
            label: "Reuniões hoje",
            value: totalHoje,
            color: "text-slate-700 dark:text-slate-300",
            bg: "bg-slate-50 dark:bg-slate-900/50",
            border: "border-slate-200 dark:border-slate-800",
        },
        {
            icon: CalendarCheck2,
            label: "Já realizadas",
            value: jaFeitas,
            color: "text-slate-700 dark:text-slate-300",
            bg: "bg-slate-50 dark:bg-slate-900/50",
            border: "border-slate-200 dark:border-slate-800",
        },
        {
            icon: UserCheck,
            label: "Você está escalado",
            value: escalado,
            color: "text-slate-700 dark:text-slate-300",
            bg: "bg-slate-50 dark:bg-slate-900/50",
            border: "border-slate-200 dark:border-slate-800",
        },
    ];

    return (
        <div className="grid grid-cols-3 gap-3">
            {kpis.map(({ icon: Icon, label, value, color, bg, border }) => (
                <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${bg} ${border}`}
                >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
                    <div className="min-w-0">
                        <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
