import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Top3Ranking } from "@/components/Gamificacao/Top3Ranking";
import { Badge } from "@/components/ui/badge";

export function DesafioSidebar({ variant = "default" }: { variant?: "default" | "banner" }) {
    const navigate = useNavigate();
    const [desafioAtual, setDesafioAtual] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const carregarDesafio = async () => {
            try {
                const { data, error } = await supabase
                    .from('gamificacao_desafios')
                    .select('*')
                    .eq('ativo', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                setDesafioAtual(data);
            } catch (error) {
                console.error('Erro ao carregar desafio:', error);
            } finally {
                setLoading(false);
            }
        };

        carregarDesafio();
    }, []);

    if (loading) {
        return (
            <Card className="border-yellow-500/20 bg-yellow-50/30 dark:bg-yellow-900/5 h-full min-h-[140px] flex flex-col justify-center animate-pulse">
                <CardContent className="p-3 flex gap-4 items-center">
                    <div className="h-10 w-10 rounded-full bg-yellow-200/50 shrink-0" />
                    <div className="space-y-2 flex-1">
                        <div className="h-4 bg-yellow-200/50 rounded w-1/3" />
                        <div className="h-3 bg-yellow-200/50 rounded w-1/4" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!desafioAtual) return null;

    return (
        <Card className={variant === "banner"
            ? "border-white/20 bg-white/10 backdrop-blur-md shadow-inner h-full flex flex-col justify-center"
            : "border-yellow-500/20 bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-900/10 h-full flex flex-col justify-center"
        }>
            <CardHeader className="p-3 pb-0">
                <div className="flex items-center justify-between">
                    <CardTitle className={`text-base font-bold flex items-center gap-2 ${variant === 'banner' ? 'text-white' : 'text-yellow-700 dark:text-yellow-500'}`}>
                        <Trophy className="h-4 w-4" />
                        Desafio Atual
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 ${variant === 'banner' ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'}`}
                        onClick={() => navigate('/gamificacao')}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-2 flex flex-col lg:flex-row gap-4 items-center justify-between flex-1">
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <h4 className={`font-bold text-base leading-tight ${variant === 'banner' ? 'text-white' : 'text-foreground'}`} title={desafioAtual.titulo}>
                        {desafioAtual.titulo}
                    </h4>
                    {(() => {
                        const diasRestantes = differenceInDays(new Date(desafioAtual.data_fim), new Date());
                        return (
                            <div className="mt-1">
                                <Badge variant={diasRestantes > 7 ? "default" : "destructive"}>
                                    {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Encerrado'}
                                </Badge>
                            </div>
                        );
                    })()}
                </div>

                <div className="min-w-0 shrink-0">
                    <Top3Ranking compact={true} />
                </div>
            </CardContent>
        </Card>
    );
}
