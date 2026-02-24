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
import { ExternalLink, Save, Video, FileText, MessageSquare, BookOpen, Loader2 } from "lucide-react";
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

function useMeetingDetail(googleEventId: string | null) {
    return useQuery({
        queryKey: ["meeting-detail", googleEventId],
        enabled: !!googleEventId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("google_event_ratings")
                .select("*")
                .eq("google_event_id", googleEventId!)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

function useSaveMeetingDetail(googleEventId: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            clasificacao?: string;
            gravacao_url?: string;
            transcricao?: string;
            comentarios?: string;
            titulo?: string;
            data_evento?: string;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from("google_event_ratings")
                .upsert(
                    {
                        google_event_id: googleEventId!,
                        avaliado_por: user?.id ?? null,
                        updated_at: new Date().toISOString(),
                        ...payload,
                    },
                    { onConflict: "google_event_id" }
                );
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

    const { data: detail } = useMeetingDetail(event?.id ?? null);
    const save = useSaveMeetingDetail(event?.id ?? null);

    const [gravacaoUrl, setGravacaoUrl] = useState("");
    const [transcricao, setTranscricao] = useState("");
    const [comentarios, setComentarios] = useState("");

    // Sync fields when detail loads
    useEffect(() => {
        if (detail) {
            setGravacaoUrl(detail.gravacao_url ?? "");
            setTranscricao(detail.transcricao ?? "");
            setComentarios(detail.comentarios ?? "");
        } else {
            setGravacaoUrl("");
            setTranscricao("");
            setComentarios("");
        }
    }, [detail, event?.id]);

    if (!event) return null;

    const startRaw = event.start.dateTime ?? event.start.date;
    const dateLabel = startRaw
        ? format(parseISO(startRaw), "EEEE, d 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })
            .replace(/^\w/, c => c.toUpperCase())
        : "";

    const anoReuniao = startRaw ? parseISO(startRaw).getFullYear() : new Date().getFullYear();

    const handleSave = async () => {
        await save.mutateAsync({
            gravacao_url: gravacaoUrl || undefined,
            transcricao: transcricao || undefined,
            comentarios: comentarios || undefined,
            titulo: event.summary ?? undefined,
            data_evento: startRaw ?? undefined,
        });
        toast({ title: "✅ Salvo", description: "Detalhes da reunião salvos." });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
                {/* Header */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                    <SheetTitle className="text-lg font-bold leading-tight">
                        {event.summary || "(sem título)"}
                    </SheetTitle>
                    {dateLabel && (
                        <p className="text-sm text-muted-foreground">{dateLabel}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {event.htmlLink && (
                            <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver no Google Calendar
                            </a>
                        )}
                        {event.hangoutLink && (
                            <a
                                href={event.hangoutLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                            >
                                <Video className="h-3.5 w-3.5" />
                                Google Meet
                            </a>
                        )}
                    </div>
                </SheetHeader>

                <div className="flex flex-col gap-5 px-6 py-5 flex-1">
                    {/* Pauta no Arquivo */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Pauta no Arquivo de Reuniões</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 justify-start"
                            onClick={() => {
                                onOpenChange(false);
                                navigate(`/ferramentas/arquivo-reuniao?ano=${anoReuniao}`);
                            }}
                        >
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            Abrir Arquivo de Reuniões {anoReuniao}
                            <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                        </Button>
                    </div>

                    <Separator />

                    {/* Rating */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-semibold">Avaliação da Reunião</span>
                        </div>
                        <MeetingRatingButtons
                            googleEventId={event.id}
                            titulo={event.summary}
                            dataEvento={startRaw ?? undefined}
                        />
                    </div>

                    <Separator />

                    {/* Recording URL */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            Gravação da Reunião
                        </Label>
                        <Input
                            placeholder="Cole o link da gravação (Drive, YouTube, Loom...)"
                            value={gravacaoUrl}
                            onChange={e => setGravacaoUrl(e.target.value)}
                        />
                        {gravacaoUrl && (
                            <a
                                href={gravacaoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                Abrir gravação
                            </a>
                        )}
                    </div>

                    {/* Transcription */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Transcrição da Reunião
                        </Label>
                        <Textarea
                            placeholder="Cole ou escreva a transcrição da reunião..."
                            value={transcricao}
                            onChange={e => setTranscricao(e.target.value)}
                            rows={5}
                            className="resize-none text-sm"
                        />
                    </div>

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

                    {/* Save button */}
                    <Button onClick={handleSave} disabled={save.isPending} className="w-full gap-2">
                        {save.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Salvar Detalhes
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
