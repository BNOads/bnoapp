import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Top3Ranking } from "@/components/Gamificacao/Top3Ranking";

export function DesafioSidebar() {
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

    if (loading) return <Card className="animate-pulse h-[200px]" />;

    if (!desafioAtual) return null;

    return (
        <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-900/10 h-full flex flex-col justify-center">
            <CardHeader className="p-3 pb-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
                        <Trophy className="h-4 w-4" />
                        Desafio Atual
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
                        onClick={() => navigate('/gamificacao')}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-2 flex flex-col lg:flex-row gap-4 items-center justify-between flex-1">
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <h4 className="font-bold text-base leading-tight text-foreground" title={desafioAtual.titulo}>
                        {desafioAtual.titulo}
                    </h4>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background/50 w-fit px-2 py-1 rounded-md border border-border/20">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                            {format(new Date(desafioAtual.data_inicio), "dd/MM", { locale: ptBR })} - {format(new Date(desafioAtual.data_fim), "dd/MM", { locale: ptBR })}
                        </span>
                    </div>
                </div>

                <div className="min-w-0 shrink-0">
                    <Top3Ranking compact={true} />
                </div>
            </CardContent>
        </Card>
    );
}
