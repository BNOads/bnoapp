import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    attendees?: { displayName?: string; email?: string; self?: boolean }[];
    attachments?: { fileId?: string; fileUrl?: string; title?: string; mimeType?: string; iconLink?: string }[];
    colorId?: string;
    hangoutLink?: string;
    htmlLink?: string;
}

const CALENDAR_ID = "contato@bnoads.com.br";

async function fetchCalendarEvents(timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]> {
    const { data, error } = await supabase.functions.invoke("google-calendar", {
        body: {
            calendarId: CALENDAR_ID,
            timeMin,
            timeMax,
        },
    });

    if (error) throw new Error(error.message ?? "Erro ao chamar a função google-calendar");
    if (data?.error) throw new Error(data.error);

    return data?.items ?? [];
}

export function useGoogleCalendar(daysAhead = 30, daysBack = 7) {
    const now = new Date();
    const timeMin = addDays(now, -daysBack).toISOString();
    const timeMax = addDays(now, daysAhead).toISOString();

    return useQuery({
        queryKey: ["google-calendar-events", format(now, "yyyy-MM-dd"), daysBack, daysAhead],
        queryFn: () => fetchCalendarEvents(timeMin, timeMax),
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
    });
}
