import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMeetings } from "@/hooks/useMeetings";
import { VALIDACAO_LABELS } from "@/types/laboratorio-testes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, ThumbsDown, HelpCircle } from "lucide-react";

const CLASSIFICACAO_COLORS: Record<string, string> = {
    em_teste: "#EAB308",
    deu_bom: "#22C55E",
    deu_ruim: "#EF4444",
    inconclusivo: "#94A3B8",
};

// Rating colors for google_event_ratings
const RATING_COLORS: Record<string, string> = {
    bom: "#22C55E",
    ruim: "#EF4444",
    inconclusivo: "#94A3B8",
};

/** Recursively extract text from a Lexical JSON node tree */
function extractLexicalTexts(node: any, level = 0): { text: string; tag?: string; level: number }[] {
    const results: { text: string; tag?: string; level: number }[] = [];
    if (node.type === "heading") {
        const tag = node.tag ?? "h2";
        const text = (node.children ?? [])
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text ?? "")
            .join("");
        if (text.trim()) results.push({ text: text.trim(), tag, level });
    }
    if (node.children) {
        for (const child of node.children) {
            results.push(...extractLexicalTexts(child, level + 1));
        }
    }
    return results;
}

/** Parse "DD/MM/YYYY | CLIENTENAME" or "DD/MM/YYYY — CLIENTENAME" heading */
function parseH2Heading(text: string): string | null {
    // Matches separators: |, —, -, –
    const match = text.match(/^[\d\/]+\s*[\|\-—–]\s*(.+)$/);
    return match ? match[1].trim().toUpperCase() : null;
}

function useArquivoClientCounts() {
    return useQuery({
        queryKey: ["arquivo-reuniao-client-counts"],
        queryFn: async () => {
            // Fetch all arquivo_reuniao rows with conteudo
            const { data, error } = await supabase
                .from("arquivo_reuniao")
                .select("ano, conteudo");
            if (error) throw error;

            // Also fetch all active clients to cross-reference
            const { data: clientes, error: clientesError } = await supabase
                .from("clientes")
                .select("id, nome")
                .eq("is_active", true);
            if (clientesError) throw clientesError;

            // Build a map of UPPERCASE_NAME → cliente
            const clienteMap = new Map<string, { id: string; nome: string }>();
            (clientes ?? []).forEach((c: any) => {
                clienteMap.set((c.nome as string).toUpperCase().replace(/\s+/g, ""), c);
                clienteMap.set((c.nome as string).toUpperCase(), c);
            });

            // Count meeting appearances per client
            const counts = new Map<string, { id: string; nome: string; count: number }>();

            (data ?? []).forEach((row: any) => {
                if (!row.conteudo) return;
                const nodes = extractLexicalTexts(row.conteudo?.root ?? row.conteudo);
                nodes.forEach(({ text, tag }) => {
                    if (tag !== "h2") return;
                    const clienteKey = parseH2Heading(text);
                    if (!clienteKey) return;

                    // Try direct match, then stripped match
                    const stripped = clienteKey.replace(/\s+/g, "");
                    const matched = clienteMap.get(clienteKey) ?? clienteMap.get(stripped);

                    if (matched) {
                        const entry = counts.get(matched.id) ?? { id: matched.id, nome: matched.nome, count: 0 };
                        entry.count++;
                        counts.set(matched.id, entry);
                    } else {
                        // Fuzzy: check if any client name is a substring of the heading text
                        for (const [key, cliente] of clienteMap.entries()) {
                            if (key.length > 3 && clienteKey.includes(key)) {
                                const entry = counts.get(cliente.id) ?? { id: cliente.id, nome: cliente.nome, count: 0 };
                                entry.count++;
                                counts.set(cliente.id, entry);
                                break;
                            }
                        }
                    }
                });
            });

            return Array.from(counts.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        },
        staleTime: 10 * 60 * 1000,
    });
}

function useEventRatingStats() {
    return useQuery({
        queryKey: ["event-ratings-all"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("google_event_ratings")
                .select("classificacao");
            if (error) throw error;
            const counts = { bom: 0, ruim: 0, inconclusivo: 0 };
            (data ?? []).forEach((r: any) => {
                if (r.classificacao in counts) counts[r.classificacao as keyof typeof counts]++;
            });
            return counts;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function AnaliseReunioes() {
    const dataInicio = format(subDays(new Date(), 90), "yyyy-MM-dd");
    const { data: meetings = [], isLoading } = useMeetings({ data_inicio: dataInicio });
    const { data: arquivoClients = [], isLoading: loadingArquivo } = useArquivoClientCounts();
    const { data: ratingStats } = useEventRatingStats();

    const classStats = useMemo(() => {
        const counts: Record<string, number> = {
            em_teste: 0,
            deu_bom: 0,
            deu_ruim: 0,
            inconclusivo: 0,
        };
        meetings.forEach((m: any) => {
            if (m.classificacao_reuniao && counts[m.classificacao_reuniao] !== undefined) {
                counts[m.classificacao_reuniao]++;
            }
        });
        return Object.entries(counts).map(([k, v]) => ({
            name: VALIDACAO_LABELS[k as keyof typeof VALIDACAO_LABELS] || k,
            value: v,
            key: k,
        }));
    }, [meetings]);

    const totalRatings = ratingStats
        ? ratingStats.bom + ratingStats.ruim + ratingStats.inconclusivo
        : 0;

    if (isLoading) return <div className="text-muted-foreground text-sm py-8 text-center">Carregando análise...</div>;

    return (
        <div className="space-y-6">
            {/* Google Calendar Ratings Summary */}
            {totalRatings > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Avaliações de Reuniões (Google Calendar)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <ThumbsUp className="h-5 w-5 text-green-500" />
                                <span className="text-2xl font-bold text-green-600">{ratingStats?.bom ?? 0}</span>
                                <span className="text-xs text-muted-foreground">Bom 🤩</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ThumbsDown className="h-5 w-5 text-red-500" />
                                <span className="text-2xl font-bold text-red-600">{ratingStats?.ruim ?? 0}</span>
                                <span className="text-xs text-muted-foreground">Ruim 😭</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-orange-400" />
                                <span className="text-2xl font-bold text-orange-500">{ratingStats?.inconclusivo ?? 0}</span>
                                <span className="text-xs text-muted-foreground">Ok</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <p className="text-3xl font-bold">{meetings.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Reuniões registradas (90 dias)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <p className="text-3xl font-bold">{totalRatings}</p>
                        <p className="text-xs text-muted-foreground mt-1">Avaliações no Calendar</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-5">
                        <p className="text-3xl font-bold">
                            {classStats.find(c => c.key === "deu_ruim")?.value ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Reuniões "Ruim 😭"</p>
                    </CardContent>
                </Card>
            </div>

            {/* Classificação Chart */}
            {meetings.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Distribuição por Classificação</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={classStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {classStats.map((entry) => (
                                        <Cell key={entry.key} fill={CLASSIFICACAO_COLORS[entry.key] || "#94A3B8"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Reuniões por Cliente from Arquivo de Reuniões */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        Reuniões por Cliente (Top 10)
                        <Badge variant="secondary" className="text-[10px]">Arquivo de Reuniões</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingArquivo ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-6 bg-muted animate-pulse rounded" />)}
                        </div>
                    ) : arquivoClients.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum cliente associado encontrado no Arquivo de Reuniões.
                        </p>
                    ) : (
                        <div className="space-y-2.5">
                            {arquivoClients.map((c, i) => {
                                const max = arquivoClients[0]?.count ?? 1;
                                const pct = Math.round((c.count / max) * 100);
                                return (
                                    <div key={c.id} className="flex items-center gap-3">
                                        <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-sm font-medium truncate max-w-[200px]">{c.nome}</span>
                                                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                                    {c.count} {c.count === 1 ? "reunião" : "reuniões"}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
