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
    if (position === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-orange-500" />;
    return null;
  };

  const getPositionBg = (position: number) => {
    if (position === 1) return "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20";
    if (position === 2) return "border-gray-400 bg-gray-50/50 dark:bg-gray-950/20";
    if (position === 3) return "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20";
    return "";
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (top3.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda</p>;
  }

  return (
    <div className="flex items-center gap-3">
      {top3.map((item) => (
        <div
          key={item.colaborador_id}
          className="flex items-center gap-2"
        >
          <div className="flex-shrink-0">
            {getPositionIcon(item.posicao)}
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-foreground">{item.colaborador?.nome}</p>
            <p className="text-xs text-muted-foreground">{item.total_pontos} pts</p>
          </div>
        </div>
      ))}
    </div>
  );
};
