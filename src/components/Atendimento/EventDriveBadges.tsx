import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDriveSync } from "@/hooks/useDriveSync";
import { Video, FileText, RefreshCw, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EventDriveBadgesProps {
    googleEventId: string;
    eventTitle?: string;
    dataEvento?: string;
}

function useEventMeta(googleEventId: string) {
    return useQuery({
        queryKey: ["event-meeting-meta", googleEventId],
        queryFn: async () => {
            const { data } = await supabase
                .from("google_event_ratings")
                .select("gravacao_url, transcricao, classificacao")
                .eq("google_event_id", googleEventId)
                .maybeSingle();
            return data ?? null;
        },
        staleTime: 5 * 60 * 1000,
    });
}

const RATING_STYLES: Record<string, string> = {
    bom: "bg-green-100 text-green-700 border-green-300",
    ruim: "bg-red-100 text-red-700 border-red-300",
    inconclusivo: "bg-orange-100 text-orange-700 border-orange-300",
};
const RATING_LABELS: Record<string, string> = {
    bom: "✓ Deu Bom",
    ruim: "✗ Deu Ruim",
    inconclusivo: "? Inconclusivo",
};

export function EventDriveBadges({ googleEventId, eventTitle, dataEvento }: EventDriveBadgesProps) {
    const { data: meta } = useEventMeta(googleEventId);
    const sync = useDriveSync({ googleEventId, eventTitle, dataEvento });

    const hasRecording = !!(meta?.gravacao_url);
    const hasTranscript = !!(meta?.transcricao);
    const rating = meta?.classificacao;

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {/* Rating chip */}
            {rating && (
                <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                    RATING_STYLES[rating] ?? "bg-muted text-muted-foreground border-border"
                )}>
                    {RATING_LABELS[rating] ?? rating}
                </span>
            )}

            {/* Recording badge */}
            {hasRecording ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                href={meta!.gravacao_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 text-[10px] font-semibold hover:bg-blue-100 transition-colors"
                            >
                                <Video className="h-3 w-3" />
                                Gravação
                            </a>
                        </TooltipTrigger>
                        <TooltipContent>Abrir gravação da reunião</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : null}

            {/* Transcript badge */}
            {hasTranscript ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800 text-[10px] font-semibold">
                                <FileText className="h-3 w-3" />
                                Transcrição
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>Transcrição disponível</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : null}

            {/* Sync button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={e => { e.stopPropagation(); sync.mutate(); }}
                            disabled={sync.isPending}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-muted text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={cn("h-3 w-3", sync.isPending && "animate-spin")} />
                            {sync.isPending ? "Sincronizando..." : "Sync Drive"}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {sync.isError
                            ? `Erro: ${(sync.error as Error).message}`
                            : "Buscar gravação e transcrição no Google Drive"}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Error icon */}
            {sync.isError && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>{(sync.error as Error).message}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}
