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
            const { data } = await supabase
                .from("google_event_participants")
                .select("google_event_id")
                .eq("user_id", userId!);
            return new Set((data ?? []).map((r: any) => r.google_event_id));
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function AtendimentoKPIs() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const { data: events = [], isLoading } = useGoogleCalendar(30);
    const { data: userId } = useCurrentUserId();
    const { data: escaladoIds = new Set() } = useUserEscaladoEventIds(userId);

    const { totalHoje, jaFeitas, escalado } = useMemo(() => {
        const todayEvents = events.filter(ev => {
            const startRaw = ev.start?.dateTime ?? ev.start?.date;
            if (!startRaw) return false;
            try {
                const start = parseISO(startRaw);
                return isValid(start) && start >= todayStart && start <= todayEnd;
            } catch { return false; }
        });

        const done = todayEvents.filter(ev => {
            const endRaw = ev.end?.dateTime ?? ev.end?.date;
            if (!endRaw) return false;
            try { return parseISO(endRaw) < now; } catch { return false; }
        });

        const esc = todayEvents.filter(ev => escaladoIds.has(ev.id));

        return { totalHoje: todayEvents.length, jaFeitas: done.length, escalado: esc.length };
    }, [events, escaladoIds, todayStart, todayEnd]);

    if (isLoading) return null;

    const kpis = [
        {
            icon: CalendarClock,
            label: "Reuniões hoje",
            value: totalHoje,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/30",
            border: "border-blue-200 dark:border-blue-800",
        },
        {
            icon: CalendarCheck2,
            label: "Já realizadas",
            value: jaFeitas,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-950/30",
            border: "border-green-200 dark:border-green-800",
        },
        {
            icon: UserCheck,
            label: "Você está escalado",
            value: escalado,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-950/30",
            border: "border-purple-200 dark:border-purple-800",
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
