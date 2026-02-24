import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MeetingRatingButtons } from "./MeetingRatingButtons";
import {
    ExternalLink, Save, Video, FileText, MessageSquare,
    BookOpen, Loader2, RefreshCw, AlertCircle, CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export interface MeetingDetailEvent {
    id: string;
    summary?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    htmlLink?: string;
    hangoutLink?: string;
}

interface Props {
    event: MeetingDetailEvent | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// fetch auto-matched recordings from gravacoes table
function useMatchingRecording(eventTitle: string | undefined, enabled: boolean) {
    return useQuery({
        queryKey: ["gravacao-by-title", eventTitle],
        enabled: !!eventTitle && enabled,
        queryFn: async () => {
            if (!eventTitle) return [];
            const snippet = eventTitle.substring(0, 30);
            const { data } = await supabase
                .from("gravacoes")
                .select("id, titulo, url_gravacao, transcricao, created_at")
                .ilike("titulo", `%${snippet}%`)
                .order("created_at", { ascending: false })
                .limit(3);
            return data ?? [];
        },
        staleTime: 2 * 60 * 1000,
    });
}

// fetch manual data stored in google_event_ratings
function useMeetingRatingDetail(googleEventId: string | null) {
    return useQuery({
        queryKey: ["meeting-detail", googleEventId],
        enabled: !!googleEventId,
        queryFn: async () => {
            const { data } = await supabase
                .from("google_event_ratings")
                .select("gravacao_url, transcricao, comentarios")
                .eq("google_event_id", googleEventId!)
                .maybeSingle();
            return data ?? null;
        },
        staleTime: 2 * 60 * 1000,
    });
}

function useSaveDetails(googleEventId: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            gravacao_url?: string;
            transcricao?: string;
            comentarios?: string;
            titulo?: string;
            dataEvento?: string;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from("google_event_ratings")
                .upsert({
                    google_event_id: googleEventId!,
                    avaliado_por: user?.id ?? null,
                    updated_at: new Date().toISOString(),
                    ...payload,
                }, { onConflict: "google_event_id" });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["meeting-detail", googleEventId] });
            queryClient.invalidateQueries({ queryKey: ["event-rating", googleEventId] });
            queryClient.invalidateQueries({ queryKey: ["event-ratings-all"] });
        },
    });
}

export function MeetingDetailDrawer({ event, open, onOpenChange }: Props) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const startRaw = event?.start.dateTime ?? event?.start.date;
    const anoReuniao = startRaw ? parseISO(startRaw).getFullYear() : new Date().getFullYear();
    const dateLabel = startRaw
        ? format(parseISO(startRaw), "EEEE, d 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })
            .replace(/^\w/, c => c.toUpperCase())
        : "";

    const { data: matched = [] } = useMatchingRecording(event?.summary, open);
    const { data: stored } = useMeetingRatingDetail(event?.id ?? null);
    const saveDetails = useSaveDetails(event?.id ?? null);

    // local form state — loaded from stored data
    const [gravacaoUrl, setGravacaoUrl] = useState("");
    const [transcricao, setTranscricao] = useState("");
    const [comentarios, setComentarios] = useState("");
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        setGravacaoUrl(stored?.gravacao_url ?? "");
        setTranscricao(stored?.transcricao ?? "");
        setComentarios(stored?.comentarios ?? "");
        setSyncError(null);
    }, [stored, event?.id]);

    if (!event) return null;

    // Auto-matched from gravacoes table (highest priority visual display)
    const autoRecording = matched.find(r => r.url_gravacao);
    const autoTranscript = matched.find(r => r.transcricao);

    const handleSync = async () => {
        setSyncing(true);
        setSyncError(null);
        try {
            const { data, error } = await supabase.functions.invoke("google-drive-search", {
                body: { eventTitle: event.summary ?? "" },
            });
            if (error) throw new Error(error.message ?? "Erro desconhecido");
            if (data?.error) throw new Error(data.error);

            // Auto-fill if results found
            if (data?.recording?.url) setGravacaoUrl(data.recording.url);
            if (data?.transcript?.url) setTranscricao(`[Transcrição automática]\n${data.transcript.url}`);

            queryClient.invalidateQueries({ queryKey: ["gravacao-by-title", event.summary] });
            toast({ title: "✅ Sincronizado com o Drive" });
        } catch (err: any) {
            setSyncError(err.message ?? "Erro ao sincronizar");
        } finally {
            setSyncing(false);
        }
    };

    const handleSave = async () => {
        await saveDetails.mutateAsync({
            gravacao_url: gravacaoUrl || undefined,
            transcricao: transcricao || undefined,
            comentarios: comentarios || undefined,
            titulo: event.summary ?? undefined,
            dataEvento: startRaw ?? undefined,
        });
        toast({ title: "✅ Salvo com sucesso" });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
                {/* Header */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                    <SheetTitle className="text-lg font-bold leading-tight">
                        {event.summary || "(sem título)"}
                    </SheetTitle>
                    {dateLabel && <p className="text-sm text-muted-foreground">{dateLabel}</p>}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                        {event.htmlLink && (
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" /> Ver no Google Calendar
                            </a>
                        )}
                        {event.hangoutLink && (
                            <a href={event.hangoutLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                                <Video className="h-3.5 w-3.5" /> Google Meet
                            </a>
                        )}
                    </div>
                </SheetHeader>

                <div className="flex flex-col gap-5 px-6 py-5 flex-1">

                    {/* Pauta */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Pauta no Arquivo de Reuniões</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full gap-2 justify-start"
                            onClick={() => { onOpenChange(false); navigate(`/ferramentas/arquivo-reuniao?ano=${anoReuniao}`); }}>
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            Abrir Arquivo de Reuniões {anoReuniao}
                            <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                        </Button>
                    </div>

                    <Separator />

                    {/* Rating */}
                    <div>
                        <p className="text-sm font-semibold mb-3">Avaliação da Reunião</p>
                        <MeetingRatingButtons
                            googleEventId={event.id}
                            titulo={event.summary}
                            dataEvento={startRaw ?? undefined}
                        />
                    </div>

                    <Separator />

                    {/* Recording */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-sm font-semibold">
                                <Video className="h-4 w-4 text-muted-foreground" />
                                Gravação da Reunião
                                {(autoRecording || gravacaoUrl) && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                )}
                            </Label>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                                {syncing ? "Buscando..." : "Sincronizar Drive"}
                            </button>
                        </div>

                        {/* Auto-matched from gravacoes */}
                        {autoRecording && (
                            <a href={autoRecording.url_gravacao} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                                <Video className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate flex-1 text-xs">{autoRecording.titulo}</span>
                                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                            </a>
                        )}

                        {/* Manual input */}
                        <Input
                            placeholder="Cole o link da gravação manualmente (Drive, Loom, YouTube...)"
                            value={gravacaoUrl}
                            onChange={e => setGravacaoUrl(e.target.value)}
                            className="text-sm"
                        />
                        {gravacaoUrl && (
                            <a href={gravacaoUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <ExternalLink className="h-3 w-3" /> Abrir gravação
                            </a>
                        )}

                        {/* Sync error inline */}
                        {syncError && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                <span>{syncError}</span>
                            </div>
                        )}
                    </div>

                    {/* Transcript */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Transcrição da Reunião
                            {(autoTranscript || transcricao) && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            )}
                        </Label>

                        {/* Auto-matched transcript link */}
                        {autoTranscript && autoTranscript.transcricao && (
                            <div className="px-3 py-2 rounded-lg border bg-purple-50 dark:bg-purple-950/30 border-purple-200 text-xs text-muted-foreground max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                                {autoTranscript.transcricao.substring(0, 400)}
                                {autoTranscript.transcricao.length > 400 && "…"}
                            </div>
                        )}

                        <Textarea
                            placeholder="Cole ou escreva a transcrição manualmente, ou link para transcrição Gemini..."
                            value={transcricao}
                            onChange={e => setTranscricao(e.target.value)}
                            rows={4}
                            className="resize-none text-sm"
                        />
                    </div>

                    <Separator />

                    {/* Comments */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            Comentários Extras
                        </Label>
                        <Textarea
                            placeholder="Observações, pontos de atenção, próximos passos..."
                            value={comentarios}
                            onChange={e => setComentarios(e.target.value)}
                            rows={3}
                            className="resize-none text-sm"
                        />
                    </div>

                    <Button onClick={handleSave} disabled={saveDetails.isPending} className="w-full gap-2">
                        {saveDetails.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Save className="h-4 w-4" />}
                        Salvar Detalhes
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
