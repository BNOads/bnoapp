import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

function useClientesEmAlerta() {
    return useQuery({
        queryKey: ["clientes-em-alerta"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome, situacao_cliente")
                .eq("situacao_cliente", "alerta")
                .eq("is_active", true)
                .order("nome", { ascending: true });
            if (error) throw new Error(error.message);
            return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function ClientesEmAlerta() {
    const { data: clientes = [], isLoading, error } = useClientesEmAlerta();
    const navigate = useNavigate();

    // Don't render anything if loading or no alerts
    if (isLoading || (!error && clientes.length === 0)) return null;

    return (
        <Card className="border-red-100 dark:border-red-900/30 overflow-hidden">
            <CardHeader className="pb-3 px-4 pt-4 bg-red-50/30 dark:bg-red-950/10 border-b border-red-50 dark:border-red-900/20">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-red-700 dark:text-red-400">
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <span>Clientes em Alerta</span>
                    </CardTitle>
                    <Badge variant="outline" className="bg-red-50/50 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800">
                        {clientes.length}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3 bg-red-50/10 dark:bg-red-950/5 pt-3">
                {error ? (
                    <div className="text-sm text-destructive px-2 pb-2">{(error as Error).message}</div>
                ) : (
                    clientes.map((c: any) => (
                        <div
                            key={c.id}
                            onClick={() => navigate(`/clientes?id=${c.id}`)}
                            className="flex items-center justify-between p-3 rounded-xl border-2 bg-card hover:bg-muted/50 hover:border-red-400 cursor-pointer transition-all gap-3 shadow-sm group"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                <span className="font-extrabold text-[15px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate" title={c.nome}>
                                    {c.nome}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wide max-sm:hidden">
                                    Atenção Requerida
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors shrink-0" />
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
