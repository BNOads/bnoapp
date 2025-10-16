import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Conquista {
  id: string;
  posicao: number;
  pontos_finais: number;
  acoes_finais: number;
  desafio: {
    titulo: string;
    data_fim: string;
  };
}

export const MinhasConquistas = () => {
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [stats, setStats] = useState({
    totalPontos: 0,
    totalDesafios: 0,
    vitorias: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConquistas();
  }, []);

  const loadConquistas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('gamificacao_conquistas')
        .select(`
          *,
          desafio:gamificacao_desafios(titulo, data_fim)
        `)
        .eq('colaborador_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConquistas(data || []);

      // Calcular estatísticas
      const totalPontos = data?.reduce((sum, c) => sum + c.pontos_finais, 0) || 0;
      const vitorias = data?.filter(c => c.posicao === 1).length || 0;

      setStats({
        totalPontos,
        totalDesafios: data?.length || 0,
        vitorias
      });
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error);
      toast({
        title: "Erro ao carregar conquistas",
        description: "Não foi possível carregar suas conquistas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMedalha = (posicao: number) => {
    if (posicao === 1) return { emoji: "🥇", color: "text-yellow-500" };
    if (posicao === 2) return { emoji: "🥈", color: "text-gray-400" };
    if (posicao === 3) return { emoji: "🥉", color: "text-orange-500" };
    return { emoji: "🏅", color: "text-muted-foreground" };
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPontos}</p>
                <p className="text-sm text-muted-foreground">Pontos Totais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.vitorias}</p>
                <p className="text-sm text-muted-foreground">Vitórias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDesafios}</p>
                <p className="text-sm text-muted-foreground">Desafios Participados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Conquistas</CardTitle>
        </CardHeader>
        <CardContent>
          {conquistas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Você ainda não possui conquistas. Participe dos desafios!
            </p>
          ) : (
            <div className="space-y-3">
              {conquistas.map((conquista) => {
                const medalha = getMedalha(conquista.posicao);
                return (
                  <div
                    key={conquista.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-4xl ${medalha.color}`}>
                        {medalha.emoji}
                      </span>
                      <div>
                        <p className="font-medium">{conquista.desafio.titulo}</p>
                        <p className="text-sm text-muted-foreground">
                          {conquista.acoes_finais} ações • {conquista.pontos_finais} pontos
                        </p>
                      </div>
                    </div>
                    <Badge variant={conquista.posicao === 1 ? "default" : "secondary"}>
                      {conquista.posicao}º lugar
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
