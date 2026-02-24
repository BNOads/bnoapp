import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function useClientesEmAlerta() {
    return useQuery({
        queryKey: ["clientes-em-alerta"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome, situacao_cliente")
                .eq("situacao_cliente", "alerta")
                .eq("ativo", true)
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
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 px-5 py-3.5 flex items-center gap-4 flex-wrap">
            {/* Label */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                    Clientes em Alerta
                </span>
            </div>

            <div className="h-4 w-px bg-red-200 dark:bg-red-800 flex-shrink-0 hidden sm:block" />

            {error ? (
                <span className="text-xs text-destructive">{(error as Error).message}</span>
            ) : (
                /* Horizontal chip list */
                <div className="flex items-center gap-2 flex-wrap">
                    {clientes.map((c: any) => (
                        <button
                            key={c.id}
                            onClick={() => navigate(`/clientes?id=${c.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-300 dark:border-red-700 bg-white dark:bg-red-950/40 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                            {c.nome}
                            <ExternalLink className="h-3 w-3 opacity-60" />
                        </button>
                    ))}
                </div>
            )}

            {/* Count badge on the right */}
            <div className="ml-auto flex-shrink-0">
                <Badge
                    variant="outline"
                    className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700 text-xs"
                >
                    {clientes.length} em alerta
                </Badge>
            </div>
        </div>
    );
}
