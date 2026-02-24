import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DriveSyncResult {
    recording: { url: string; name: string } | null;
    transcript: { url: string; name: string } | null;
}

/** Call the google-drive-search edge function for one event */
async function searchDriveForEvent(
    eventTitle: string
): Promise<DriveSyncResult> {
    const { data, error } = await supabase.functions.invoke("google-drive-search", {
        body: { eventTitle },
    });
    if (error) throw new Error(error.message ?? "Erro ao buscar no Drive");
    if (data?.error) throw new Error(data.error);
    return {
        recording: data?.recording ?? null,
        transcript: data?.transcript ?? null,
    };
}

/** Upsert the Drive URLs into google_event_ratings */
async function saveDriveUrls(
    googleEventId: string,
    titulo: string | undefined,
    dataEvento: string | undefined,
    recording: DriveSyncResult["recording"],
    transcript: DriveSyncResult["transcript"]
) {
    const { data: { user } } = await supabase.auth.getUser();
    const payload: Record<string, any> = {
        google_event_id: googleEventId,
        titulo: titulo ?? null,
        data_evento: dataEvento ?? null,
        avaliado_por: user?.id ?? null,
        updated_at: new Date().toISOString(),
    };
    if (recording?.url) payload.gravacao_url = recording.url;
    if (transcript?.url) payload.transcricao = `[Transcrição automática via Gemini]\n${transcript.url}`;

    const { error } = await supabase
        .from("google_event_ratings")
        .upsert(payload, { onConflict: "google_event_id" });
    if (error) throw error;
}

export interface UseDriveSyncOptions {
    googleEventId: string;
    eventTitle?: string;
    dataEvento?: string;
}

export function useDriveSync({ googleEventId, eventTitle, dataEvento }: UseDriveSyncOptions) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const result = await searchDriveForEvent(eventTitle ?? "");
            await saveDriveUrls(googleEventId, eventTitle, dataEvento, result.recording, result.transcript);
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["meeting-detail", googleEventId] });
            queryClient.invalidateQueries({ queryKey: ["event-rating", googleEventId] });
            queryClient.invalidateQueries({ queryKey: ["event-meeting-meta", googleEventId] });
        },
    });
}

/** Fetch stored Drive metadata for an event (recording / transcript presence) */
export async function fetchEventMeta(googleEventId: string) {
    const { data } = await supabase
        .from("google_event_ratings")
        .select("gravacao_url, transcricao, classificacao")
        .eq("google_event_id", googleEventId)
        .maybeSingle();
    return data ?? null;
}
