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
    BookOpen, Loader2, CheckCircle2, Download
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
    attachments?: { fileId?: string; fileUrl?: string; title?: string; mimeType?: string; iconLink?: string }[];
}

interface Props {
    event: MeetingDetailEvent | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/** Extract client name prefix from event title like "RAQUELPERONDI | Reunião de Briefing" */
function parseClientFromTitle(title: string): string | null {
    const match = title.match(/^([^|–\-]+)\s*[|–\-]/);
    return match ? match[1].trim() : null;
}

/** Find cliente by name (case-insensitive partial match) */
function useClienteByName(clienteName: string | null) {
    return useQuery({
        queryKey: ["cliente-by-name", clienteName],
        enabled: !!clienteName,
        queryFn: async () => {
            const { data } = await supabase
                .from("clientes")
                .select("id, nome, pasta_drive_url")
                .ilike("nome", `%${clienteName}%`)
                .eq("is_active", true)
                .limit(1);
            return data?.[0] ?? null;
        },
        staleTime: 10 * 60 * 1000,
    });
}

/** Find recordings in gravacoes by cliente_id + event date, with fallback to title */
function useRecordingsByDateAndClient(
    eventStart: string | undefined,
    clienteId: string | null | undefined,
    eventTitle: string | undefined,
    enabled: boolean
) {
    return useQuery({
        queryKey: ["gravacoes-by-date-client", eventStart, clienteId, eventTitle],
        enabled: enabled && (!!clienteId || !!eventTitle),
        queryFn: async () => {
            // Primary: filter by cliente_id + date in title (e.g. "2026/02/26")
            if (clienteId && eventStart) {
                const datePart = format(parseISO(eventStart), 'yyyy/MM/dd');
                const { data } = await supabase
                    .from("gravacoes")
                    .select("id, titulo, url_gravacao, transcricao, created_at")
                    .eq("cliente_id", clienteId)
                    .ilike("titulo", `%${datePart}%`)
                    .order("created_at", { ascending: false })
                    .limit(10);
                if (data?.length) return data;
            }
            // Fallback: title prefix (broader search)
            if (eventTitle) {
                const snippet = eventTitle.substring(0, 40);
                const { data } = await supabase
                    .from("gravacoes")
                    .select("id, titulo, url_gravacao, transcricao, created_at")
                    .ilike("titulo", `%${snippet}%`)
                    .order("created_at", { ascending: false })
                    .limit(5);
                return data ?? [];
            }
            return [];
        },
        staleTime: 2 * 60 * 1000,
    });
}

function useMeetingComments(googleEventId: string | null) {
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
            gravacao_url?: string; transcricao?: string; comentarios?: string;
            titulo?: string; dataEvento?: string;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from("google_event_ratings" as any)
                .upsert({
                    google_event_id: googleEventId!,
                    avaliado_por: user?.id ?? null,
                    updated_at: new Date().toISOString(),
                    ...payload,
                } as any, { onConflict: "google_event_id" });
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

    const startRaw = event?.start.dateTime ?? event?.start.date;
    const anoReuniao = startRaw ? parseISO(startRaw).getFullYear() : new Date().getFullYear();
    const dateLabel = startRaw
        ? format(parseISO(startRaw), "EEEE, d 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })
            .replace(/^\w/, c => c.toUpperCase())
        : "";

    // Client detection from event title
    const clienteNameFromTitle = event?.summary ? parseClientFromTitle(event.summary) : null;
    const { data: cliente } = useClienteByName(clienteNameFromTitle);

    // Recordings: primary by cliente_id + date, fallback by title
    const { data: matchedRecordings = [] } = useRecordingsByDateAndClient(
        event?.start.dateTime ?? event?.start.date,
        cliente?.id,
        event?.summary,
        open
    );

    // Manual overrides stored in google_event_ratings
    const { data: stored } = useMeetingComments(event?.id ?? null);
    const saveDetails = useSaveDetails(event?.id ?? null);

    const [gravacaoUrl, setGravacaoUrl] = useState("");
    const [transcricao, setTranscricao] = useState("");
    const [comentarios, setComentarios] = useState("");
    const [loadingGemini, setLoadingGemini] = useState(false);

    useEffect(() => {
        setGravacaoUrl(stored?.gravacao_url ?? "");
        setTranscricao(stored?.transcricao ?? "");
        setComentarios(stored?.comentarios ?? "");
    }, [stored, event?.id]);

    const handleLoadGeminiContent = async () => {
        const fileUrl = event?.attachments?.find(
            a => a.mimeType === 'application/vnd.google-apps.document' &&
                (a.title?.toLowerCase().includes('anota') || a.title?.toLowerCase().includes('gemini'))
        )?.fileUrl;
        if (!fileUrl) return;
        setLoadingGemini(true);
        try {
            const { data, error } = await supabase.functions.invoke("fetch-doc-content", {
                body: { docUrl: fileUrl }
            });
            if (error) throw error;
            if (data?.content) {
                setTranscricao(data.content);
                toast({ title: "✅ Conteúdo carregado", description: "Anotações do Gemini importadas." });
            }
        } catch (err: any) {
            toast({ title: "Erro ao carregar", description: err.message, variant: "destructive" });
        } finally {
            setLoadingGemini(false);
        }
    };

    if (!event) return null;


    // Drive search URL — searches Google Drive for the event title
    const driveSearchQuery = encodeURIComponent(
        (event.summary ?? "").replace(/\s*\|\s*/, ' ')
    );
    const driveSearchUrl = `https://drive.google.com/drive/search?q=${driveSearchQuery}`;

    // Calendar attachments (recording + Gemini notes attached to the event)
    const calendarAttachments = event.attachments ?? [];
    const calendarRecording = calendarAttachments.find(a =>
        a.mimeType?.startsWith('video/') ||
        a.title?.toLowerCase().includes('recording') ||
        a.fileUrl?.includes('.mp4')
    );
    const calendarTranscript = calendarAttachments.find(a =>
        a.mimeType === 'application/vnd.google-apps.document' &&
        (a.title?.toLowerCase().includes('anota') || a.title?.toLowerCase().includes('gemini'))
    );

    const autoRecording = matchedRecordings.find(r =>
        r.url_gravacao &&
        (r.titulo?.toLowerCase().includes("recording") ||
            r.titulo?.toLowerCase().includes("gravação") ||
            r.titulo?.toLowerCase().includes("record"))
    );
    const autoTranscript = matchedRecordings.find(r =>
        r.titulo?.toLowerCase().includes("anota") ||
        r.titulo?.toLowerCase().includes("gemini") ||
        r.transcricao
    );


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
                    {cliente && (
                        <p className="text-xs text-muted-foreground">
                            Cliente: <span className="font-medium text-foreground">{cliente.nome}</span>
                        </p>
                    )}
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
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            Gravação da Reunião
                            {(autoRecording || gravacaoUrl) && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            )}
                        </Label>

                        {/* Calendar attachments (direct from Google Calendar event) */}
                        {calendarRecording && (
                            <a href={calendarRecording.fileUrl!} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                                <Video className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate flex-1 text-xs">{calendarRecording.title}</span>
                                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                            </a>
                        )}

                        {/* If found in local DB from previous syncs */}
                        {!calendarRecording && autoRecording && (
                            <a href={autoRecording.url_gravacao!} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                                <Video className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate flex-1 text-xs">{autoRecording.titulo}</span>
                                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                            </a>
                        )}
                        {/* Drive search links — removed per user request */}

                        {/* Manual paste for recording when no attachment */}
                        {!calendarRecording && (
                            <>
                                <Input
                                    placeholder="Cole o link da gravação..."
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
                            </>
                        )}
                    </div>
                    {/* Transcript */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Transcrição da Reunião
                            {(calendarTranscript || autoTranscript || transcricao) && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            )}
                        </Label>

                        {/* Calendar-attached Gemini notes */}
                        {calendarTranscript?.fileUrl && (
                            <div className="flex items-center gap-2">
                                <a href={calendarTranscript.fileUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg border bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors text-xs">
                                    <FileText className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate flex-1">{calendarTranscript.title}</span>
                                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                </a>
                                <button
                                    onClick={handleLoadGeminiContent}
                                    disabled={loadingGemini}
                                    title="Carregar conteúdo do documento"
                                    className="flex items-center gap-1 px-2 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-xs disabled:opacity-50 flex-shrink-0"
                                >
                                    {loadingGemini ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        )}

                        {/* Transcription content (from Gemini load or DB) */}
                        {(transcricao || autoTranscript?.transcricao) && (() => {
                            const text = transcricao || autoTranscript?.transcricao || "";
                            return (
                                <div className="px-3 py-2 rounded-lg border bg-purple-50 dark:bg-purple-950/30 border-purple-200 text-xs text-muted-foreground max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                                    {text.substring(0, 600)}
                                    {text.length > 600 && "…"}
                                </div>
                            );
                        })()}
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
