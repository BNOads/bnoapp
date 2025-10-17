import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RankingData {
  colaborador_id: string;
  total_pontos: number;
  total_acoes: number;
  posicao: number;
  colaborador: {
    nome: string;
    avatar_url: string;
  };
}

export const Top3Ranking = () => {
  const [top3, setTop3] = useState<RankingData[]>([]);
  const [desafioTitulo, setDesafioTitulo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTop3();
  }, []);

  const loadTop3 = async () => {
    try {
      // Buscar desafio ativo
      const { data: desafio, error: desafioError } = await supabase
        .from('gamificacao_desafios')
        .select('id, titulo')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (desafioError) throw desafioError;

      if (!desafio) {
        setLoading(false);
        return;
      }

      setDesafioTitulo(desafio.titulo);

      // Buscar top 3 do ranking
      const { data: rankingData, error: rankingError } = await supabase
        .from('gamificacao_ranking')
        .select('*')
        .eq('desafio_id', desafio.id)
        .order('posicao', { ascending: true })
        .limit(3);

      if (rankingError) throw rankingError;

      if (!rankingData || rankingData.length === 0) {
        setTop3([]);
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

      setTop3(rankingCompleto);
    } catch (error) {
      console.error('Erro ao carregar top 3:', error);
      toast({
        title: "Erro ao carregar ranking",
        description: "Não foi possível carregar o top 3.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (position === 2) return <Medal className="h-8 w-8 text-gray-400" />;
    if (position === 3) return <Award className="h-8 w-8 text-orange-500" />;
    return null;
  };

  const getPositionBg = (position: number) => {
    if (position === 1) return "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20";
    if (position === 2) return "border-gray-400 bg-gray-50/50 dark:bg-gray-950/20";
    if (position === 3) return "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20";
    return "";
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

  if (top3.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Ranking do Desafio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Nenhuma ação registrada ainda. Seja o primeiro!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Top 3 - {desafioTitulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((item) => (
            <Card
              key={item.colaborador_id}
              className={getPositionBg(item.posicao)}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-background">
                      <AvatarImage src={item.colaborador?.avatar_url} />
                      <AvatarFallback className="text-lg font-bold">
                        {item.colaborador?.nome?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-2 -right-2">
                      {getPositionIcon(item.posicao)}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.colaborador?.nome}</p>
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
      </CardContent>
    </Card>
  );
};
