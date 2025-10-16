import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RankingData {
  colaborador_id: string;
  total_pontos: number;
  total_acoes: number;
  posicao: number;
  ultima_acao: string;
  colaborador: {
    nome: string;
    avatar_url: string;
  };
}

export const RankingView = () => {
  const [ranking, setRanking] = useState<RankingData[]>([]);
  const [desafioAtual, setDesafioAtual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      // Buscar desafio ativo
      const { data: desafio, error: desafioError } = await supabase
        .from('gamificacao_desafios')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (desafioError) throw desafioError;

      if (!desafio) {
        setLoading(false);
        return;
      }

      setDesafioAtual(desafio);

      // Buscar ranking do desafio
      const { data: rankingData, error: rankingError } = await supabase
        .from('gamificacao_ranking')
        .select('*')
        .eq('desafio_id', desafio.id)
        .order('posicao', { ascending: true });

      if (rankingError) throw rankingError;

      if (!rankingData || rankingData.length === 0) {
        setRanking([]);
        setLoading(false);
        return;
      }

      // Buscar dados dos colaboradores
      const colaboradorIds = rankingData.map(r => r.colaborador_id);
      const { data: colaboradores, error: colaboradoresError } = await supabase
        .from('colaboradores')
        .select('id, nome, avatar_url')
        .in('id', colaboradorIds);

      if (colaboradoresError) throw colaboradoresError;

      // Combinar os dados
      const rankingCompleto = rankingData.map(r => {
        const colaborador = colaboradores?.find(c => c.id === r.colaborador_id);
        return {
          ...r,
          colaborador: {
            nome: colaborador?.nome || 'Colaborador',
            avatar_url: colaborador?.avatar_url || ''
          }
        };
      });

      setRanking(rankingCompleto);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      toast({
        title: "Erro ao carregar ranking",
        description: "Não foi possível carregar o ranking.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (position === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (position === 3) return <Award className="h-6 w-6 text-orange-500" />;
    return <span className="text-lg font-bold text-muted-foreground">{position}º</span>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!desafioAtual) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nenhum desafio ativo no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const top3 = ranking.slice(0, 3);
  const restante = ranking.slice(3);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking - {desafioAtual.titulo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma ação registrada ainda. Seja o primeiro!
            </p>
          ) : (
            <>
              {/* Top 3 em destaque */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {top3.map((item) => (
                  <Card
                    key={item.colaborador_id}
                    className={`${
                      item.posicao === 1
                        ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20"
                        : item.posicao === 2
                        ? "border-gray-400 bg-gray-50/50 dark:bg-gray-950/20"
                        : "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="relative">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={item.colaborador?.avatar_url} />
                            <AvatarFallback>
                              {item.colaborador?.nome?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-2 -right-2">
                            {getPositionIcon(item.posicao)}
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold">{item.colaborador?.nome}</p>
                          <p className="text-2xl font-bold text-primary mt-1">
                            {item.total_pontos} pts
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.total_acoes} ações
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Restante do ranking */}
              {restante.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">
                    Demais Participantes
                  </h3>
                  {restante.map((item) => (
                    <div
                      key={item.colaborador_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 text-center">
                          {getPositionIcon(item.posicao)}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={item.colaborador?.avatar_url} />
                          <AvatarFallback>
                            {item.colaborador?.nome?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.colaborador?.nome}</p>
                          {item.ultima_acao && (
                            <p className="text-xs text-muted-foreground">
                              Última ação:{" "}
                              {format(new Date(item.ultima_acao), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{item.total_pontos} pts</p>
                        <p className="text-sm text-muted-foreground">
                          {item.total_acoes} ações
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
