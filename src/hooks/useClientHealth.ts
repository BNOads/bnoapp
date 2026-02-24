import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const clientHealthKeys = {
    all: ["clientHealth"] as const,
    client: (clienteId: string) => [...clientHealthKeys.all, clienteId] as const,
};

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface ClientHealthScore {
    cliente_id: string;
    score: number; // 0-100
    status: HealthStatus;
    lastMeetingDate: string | null;
    meetingsLast30Days: number;
    averageRating: number | null;
    riskCount: number; // 'alto' risk count
    notes: string[];
}

export function useClientHealth(clienteId?: string) {
    return useQuery({
        queryKey: clientHealthKeys.client(clienteId || "all"),
        queryFn: async () => {
            if (!clienteId) return null;

            // 1. Fetch recent meetings (last 90 days for trends, filtering manually for 30)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const { data: meetings, error } = await supabase
                .from("meetings")
                .select(`
          id, data, hora_inicio, classificacao_reuniao, nota, nivel_risco
        `)
                .eq("cliente_id", clienteId)
                .gte("data", ninetyDaysAgo.toISOString().split('T')[0])
                .order("data", { ascending: false });

            if (error) throw error;

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysIso = thirtyDaysAgo.toISOString().split('T')[0];

            // Base calcs
            let score = 100;
            let notes: string[] = [];
            const meetingsLast30Days = meetings.filter(m => m.data >= thirtyDaysIso).length;
            const lastMeetingDate = meetings.length > 0 ? meetings[0].data : null;

            const averageRating = meetings.length > 0
                ? meetings.reduce((acc, curr) => acc + (curr.nota || 0), 0) / meetings.filter(m => m.nota).length
                : null;

            const riskCount = meetings.filter(m => m.nivel_risco === 'alto').length;

            // Calculate score conceptually
            // - No meetings last 30 days = -20
            if (meetingsLast30Days === 0) {
                score -= 20;
                notes.push("Nenhuma reunião nos últimos 30 dias.");
            }

            // - 'alto' risk level meetings recently = -15 per meeting
            if (riskCount > 0) {
                score -= (15 * riskCount);
                notes.push(`${riskCount} reunião(ões) com nível de risco ALTO.`);
            }

            // - average rating
            if (averageRating !== null && !isNaN(averageRating)) {
                if (averageRating < 3) {
                    score -= 20;
                    notes.push(`A avaliação média recente é baixa (${averageRating.toFixed(1)}/5).`);
                } else if (averageRating === 5) {
                    score += 10;
                }
            }

            // Check last classification
            if (meetings.length > 0) {
                const lastClass = meetings[0].classificacao_reuniao;
                if (lastClass === 'deu_ruim') {
                    score -= 30;
                    notes.push("A última reunião foi classificada como 'Deu Ruim'.");
                } else if (lastClass === 'inconclusivo') {
                    score -= 10;
                }
            }

            // Clamp score
            score = Math.max(0, Math.min(100, score));

            let status: HealthStatus = 'green';
            if (score < 50) status = 'red';
            else if (score < 80) status = 'yellow';

            const healthData: ClientHealthScore = {
                cliente_id: clienteId,
                score,
                status,
                lastMeetingDate,
                meetingsLast30Days,
                averageRating: isNaN(averageRating || NaN) ? null : averageRating,
                riskCount,
                notes
            };

            return healthData;
        },
        enabled: !!clienteId,
        staleTime: 15 * 60 * 1000, // 15 mins
    });
}
