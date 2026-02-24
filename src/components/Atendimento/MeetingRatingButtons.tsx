import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, ThumbsDown, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Classificacao = "bom" | "ruim" | "inconclusivo";

interface MeetingRatingButtonsProps {
    googleEventId: string;
    titulo?: string;
    dataEvento?: string;
}

function useEventRating(googleEventId: string) {
    return useQuery({
        queryKey: ["event-rating", googleEventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("google_event_ratings")
                .select("classificacao")
                .eq("google_event_id", googleEventId)
                .maybeSingle();
            if (error) throw error;
            return data?.classificacao as Classificacao | null;
        },
        staleTime: 5 * 60 * 1000,
    });
}

function useRateMeeting(googleEventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            classificacao,
            titulo,
            dataEvento,
        }: {
            classificacao: Classificacao;
            titulo?: string;
            dataEvento?: string;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from("google_event_ratings")
                .upsert(
                    {
                        google_event_id: googleEventId,
                        classificacao,
                        titulo: titulo ?? null,
                        data_evento: dataEvento ?? null,
                        avaliado_por: user?.id ?? null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "google_event_id" }
                );
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event-rating", googleEventId] });
            queryClient.invalidateQueries({ queryKey: ["event-ratings-all"] });
        },
    });
}

const BUTTONS: { value: Classificacao; label: string; icon: React.ElementType; active: string; inactive: string }[] = [
    {
        value: "bom",
        label: "Deu Bom",
        icon: ThumbsUp,
        active: "bg-green-500 text-white border-green-500 shadow-sm",
        inactive: "bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
    },
    {
        value: "ruim",
        label: "Deu Ruim",
        icon: ThumbsDown,
        active: "bg-red-500 text-white border-red-500 shadow-sm",
        inactive: "bg-red-50 text-red-700 border-red-300 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
    },
    {
        value: "inconclusivo",
        label: "Inconclusivo",
        icon: HelpCircle,
        active: "bg-orange-400 text-white border-orange-400 shadow-sm",
        inactive: "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
    },
];

export function MeetingRatingButtons({ googleEventId, titulo, dataEvento }: MeetingRatingButtonsProps) {
    const { data: current, isLoading: loadingRating } = useEventRating(googleEventId);
    const { mutate: rate, isPending } = useRateMeeting(googleEventId);

    if (loadingRating) return null;

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {BUTTONS.map(btn => {
                const isActive = current === btn.value;
                const Icon = btn.icon;
                return (
                    <button
                        key={btn.value}
                        onClick={e => {
                            e.stopPropagation();
                            rate({ classificacao: btn.value, titulo, dataEvento });
                        }}
                        disabled={isPending}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
                            isActive ? btn.active : btn.inactive
                        )}
                    >
                        {isPending && isActive ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Icon className="h-3.5 w-3.5" />
                        )}
                        {btn.label}
                    </button>
                );
            })}
        </div>
    );
}
