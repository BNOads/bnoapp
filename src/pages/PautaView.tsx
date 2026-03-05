import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileText, Bot, Edit2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { NativeMeetingEditor } from "@/components/Atendimento/NativeMeetingEditor";
import { useRef, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ptBR } from "date-fns/locale";

/** Convert a URL slug like "carolvelten-alinhamento" back to a readable title */
function slugToTitle(slug: string): string {
    try {
        return decodeURIComponent(slug);
    } catch {
        return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
}

export default function PautaView() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const slugTitle = searchParams.get("n") ? slugToTitle(searchParams.get("n")!) : "";

    const { data: eventData, isLoading } = useQuery({
        queryKey: ["pauta-publica", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("google_event_ratings")
                .select("pauta_html, titulo, data_evento, transcricao, comentarios")
                .eq("google_event_id", id!)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    const { toast } = useToast();
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [localTitle, setLocalTitle] = useState(eventData?.titulo || slugTitle || "");

    useEffect(() => {
        if (eventData?.titulo) {
            setLocalTitle(eventData.titulo);
        } else if (slugTitle && !localTitle) {
            setLocalTitle(slugTitle);
        }
    }, [eventData?.titulo, slugTitle]);

    useEffect(() => {
        if (localTitle) {
            document.title = `${localTitle} | BNOads`;
        } else {
            document.title = "Pauta | BNOads";
        }
    }, [localTitle]);

    const saveMutation = useMutation({
        mutationFn: async (updates: { pauta_html?: string, titulo?: string }) => {
            const { error } = await supabase
                .from("google_event_ratings")
                .upsert({
                    google_event_id: id!,
                    ...updates
                }, { onConflict: "google_event_id" });

            if (error) throw error;
        },
        onSuccess: () => {
            // Silently succeed for autosave
        },
        onError: () => {
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar as alterações. Verifique sua conexão.",
                variant: "destructive",
            });
        }
    });

    const handleContentChange = (html: string) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveMutation.mutate({ pauta_html: html });
        }, 1500);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTitle(e.target.value);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveMutation.mutate({ titulo: e.target.value });
        }, 1500);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/20 flex flex-col items-center p-8">
                <div className="w-full max-w-4xl space-y-4">
                    <Skeleton className="h-12 w-2/3" />
                    <Skeleton className="h-4 w-1/4" />
                    <div className="mt-8 space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                </div>
            </div>
        );
    }

    if (!eventData) {
        return (
            <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                    <h1 className="text-2xl font-bold">Pauta não encontrada</h1>
                    <p className="text-muted-foreground">Esta reunião não possui uma pauta registrada ou o link é inválido.</p>
                </div>
            </div>
        );
    }

    const dateLabel = eventData.data_evento
        ? format(parseISO(eventData.data_evento), "EEEE, d 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })
            .replace(/^\w/, c => c.toUpperCase())
        : null;

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-background pb-20">
            <div className="w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <header className="mb-8 border-b pb-6">
                    <div className="flex items-center gap-3 mb-4 group relative">
                        <input
                            type="text"
                            value={localTitle || "Pauta da Reunião"}
                            onChange={handleTitleChange}
                            className="text-3xl font-bold tracking-tight text-foreground bg-transparent border-none outline-none focus:ring-0 w-full placeholder:text-muted-foreground/50 hover:bg-muted/30 focus:bg-muted/30 rounded-md px-2 py-1 -ml-2 transition-colors"
                            placeholder="Digite o título da reunião..."
                        />
                        <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 pointer-events-none" />
                    </div>
                    {dateLabel && (
                        <div className="flex items-center text-sm text-muted-foreground bg-muted/50 w-fit px-3 py-1.5 rounded-full ml-1">
                            <Calendar className="h-4 w-4 mr-2" />
                            {dateLabel}
                        </div>
                    )}
                </header>

                <article className="mb-8">
                    <NativeMeetingEditor
                        googleEventId={id!}
                        initialContent={eventData.pauta_html || ""}
                        onContentChange={handleContentChange}
                        isSaving={saveMutation.isPending}
                        className="min-h-[500px] shadow-sm border-muted-foreground/20"
                    />
                </article>

                {(eventData.transcricao || eventData.comentarios) && (
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 border-b pb-2">
                            <Bot className="h-5 w-5 text-indigo-500" />
                            Conteúdo Auxiliar (IA & Transcrição)
                        </h2>

                        {eventData.comentarios && (
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-6">
                                <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-400 mb-3 uppercase tracking-wider">Resumo Gerado por IA</h3>
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                                    dangerouslySetInnerHTML={{ __html: eventData.comentarios.replace(/\ng/i, '<br/>') }}
                                />
                            </div>
                        )}

                        {eventData.transcricao && (
                            <details className="group bg-card border shadow-sm rounded-lg overflow-hidden">
                                <summary className="cursor-pointer font-medium p-4 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between">
                                    Ver Transcrição Completa da Reunião
                                    <span className="text-xs text-muted-foreground ml-4 group-open:hidden">Clique para expandir</span>
                                </summary>
                                <div className="p-4 border-t text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed h-[500px] overflow-y-auto">
                                    {eventData.transcricao}
                                </div>
                            </details>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
