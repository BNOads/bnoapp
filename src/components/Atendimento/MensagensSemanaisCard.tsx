import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, ExternalLink, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function MensagensSemanaisCard() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [mensagens, setMensagens] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [semanaReferencia] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch active clients
                const { data: clientesData } = await supabase
                    .from("clientes")
                    .select("id, nome")
                    .eq("ativo", true)
                    .order("nome");

                // Fetch messages for current week
                const { data: mensagensData } = await supabase
                    .from("mensagens_semanais")
                    .select("cliente_id, mensagem, historico_envios")
                    .eq("semana_referencia", semanaReferencia);

                if (clientesData) setClientes(clientesData);
                if (mensagensData) setMensagens(mensagensData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [semanaReferencia]);

    const stats = useMemo(() => {
        const sentIds = new Set(mensagens.map(m => m.cliente_id));
        const missing = clientes.filter(c => !sentIds.has(c.id));
        return {
            sentCount: mensagens.length,
            totalCount: clientes.length,
            missingCount: missing.length,
            missingList: missing
        };
    }, [clientes, mensagens]);

    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Summary Alert */}
            {!loading && stats.missingCount > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                            {stats.missingCount} mensagens pendentes
                        </p>
                        <p className="text-xs text-red-700/80 dark:text-red-300/60 mt-0.5">
                            Faltam: {stats.missingList.slice(0, 3).map(c => c.nome).join(", ")}
                            {stats.missingCount > 3 ? ` e mais ${stats.missingCount - 3}` : ""}
                        </p>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar cliente..."
                        className="pl-8 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Badge variant="secondary" className="h-9 px-3">
                    {stats.sentCount}/{stats.totalCount}
                </Badge>
            </div>

            {/* List */}
            <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
                {loading ? (
                    <div className="h-20 animate-pulse bg-muted rounded-lg" />
                ) : (
                    filteredClientes.map(cliente => {
                        const isSent = mensagens.some(m => m.cliente_id === cliente.id);
                        return (
                            <div key={cliente.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSent ? "bg-green-100 dark:bg-green-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                                        }`}>
                                        {isSent ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <MessageSquare className="h-4 w-4 text-blue-600" />
                                        )}
                                    </div>
                                    <span className={`text-sm font-medium truncate ${isSent ? "text-muted-foreground" : ""}`}>
                                        {cliente.nome}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => window.location.href = `/clientes/${cliente.id}`}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
                {!loading && filteredClientes.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        Nenhum cliente encontrado
                    </div>
                )}
            </div>
        </div>
    );
}

function parseISO_Custom(str: string) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
}
