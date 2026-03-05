import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Rocket, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

function useClientesEmOnboarding() {
    return useQuery({
        queryKey: ["clientes-em-onboarding"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clientes")
                .select("id, nome")
                .eq("etapa_onboarding", "onboarding")
                .eq("is_active", true)
                .order("nome", { ascending: true });
            if (error) throw new Error(error.message);
            return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function ClientesEmOnboarding() {
    const { data: clientes = [], isLoading, error } = useClientesEmOnboarding();
    const navigate = useNavigate();

    // Don't render anything if loading or no clients in onboarding
    if (isLoading || (!error && clientes.length === 0)) return null;

    return (
        <Card className="border-blue-100 dark:border-blue-900/30 overflow-hidden">
            <CardHeader className="pb-3 px-4 pt-4 bg-blue-50/30 dark:bg-blue-950/10 border-b border-blue-50 dark:border-blue-900/20">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-700 dark:text-blue-400">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40">
                            <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span>Em Onboarding</span>
                    </CardTitle>
                    <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800">
                        {clientes.length}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3 bg-blue-50/10 dark:bg-blue-950/5 pt-3">
                {error ? (
                    <div className="text-sm text-destructive px-2 pb-2">{(error as Error).message}</div>
                ) : (
                    clientes.map((c: any) => (
                        <div
                            key={c.id}
                            onClick={() => navigate(`/clientes?id=${c.id}`)}
                            className="flex items-center justify-between p-3 rounded-xl border-2 bg-card hover:bg-muted/50 hover:border-blue-400 cursor-pointer transition-all gap-3 shadow-sm group"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                <span className="font-extrabold text-[15px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate" title={c.nome}>
                                    {c.nome}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide max-sm:hidden">
                                    Em Progresso
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors shrink-0" />
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
