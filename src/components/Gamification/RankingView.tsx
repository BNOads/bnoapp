import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, TrendingUp, Clock, Flame, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RankingData {
  user_id: string;
  posicao: number;
  pontos_totais: number;
  pontos_estudo: number;
  pontos_reunioes: number;
  streak_estudo: number;
  reunioes_participadas: number;
  tempo_estudo_total: number;
  tempo_reunioes_total: number;
  profiles?: any;
}

export const RankingView: React.FC = () => {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [periodo, setPeriodo] = useState<'semanal' | 'mensal' | 'geral'>('semanal');
  const [tipo, setTipo] = useState<'geral' | 'estudo' | 'reunioes'>('geral');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRankings();
  }, [periodo, tipo]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      
      const hoje = new Date();
      let dataReferencia = '';
      
      if (periodo === 'semanal') {
        const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
        dataReferencia = inicioSemana.toISOString().split('T')[0];
      } else if (periodo === 'mensal') {
        dataReferencia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      } else {
        dataReferencia = '2024-01-01'; // Para ranking geral
      }

      const { data, error } = await supabase
        .from('rankings')
        .select(`
          *,
          profiles!rankings_user_id_fkey(nome, avatar_url)
        `)
        .eq('tipo', tipo)
        .eq('periodo', periodo)
        .gte('data_referencia', dataReferencia)
        .order('posicao');

      if (error) throw error;

      setRankings(data || []);
    } catch (error) {
      console.error('Erro ao carregar rankings:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar rankings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const atualizarRankings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('gamification-engine', {
        body: { action: 'update_rankings' }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Rankings atualizados com sucesso"
      });

      loadRankings();
    } catch (error) {
      console.error('Erro ao atualizar rankings:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar rankings",
        variant: "destructive"
      });
    }
  };

  const formatarTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  };

  const getPositionIcon = (posicao: number) => {
    switch (posicao) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="h-6 w-6 text-center font-bold text-muted-foreground">{posicao}</span>;
    }
  };

  const getPeriodoLabel = (periodo: string) => {
    switch (periodo) {
      case 'semanal': return 'Semanal';
      case 'mensal': return 'Mensal';
      case 'geral': return 'Geral';
      default: return periodo;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'geral': return 'Geral';
      case 'estudo': return 'Estudo';
      case 'reunioes': return 'Reuniões';
      default: return tipo;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rankings</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho da equipe
          </p>
        </div>
        
        <Button onClick={atualizarRankings} disabled={loading}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Atualizar Rankings
        </Button>
      </div>

      <Tabs defaultValue="periodo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="periodo">Por Período</TabsTrigger>
          <TabsTrigger value="tipo">Por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="periodo" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['semanal', 'mensal', 'geral'].map((p) => (
              <Button
                key={p}
                variant={periodo === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodo(p as any)}
              >
                {getPeriodoLabel(p)}
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tipo" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['geral', 'estudo', 'reunioes'].map((t) => (
              <Button
                key={t}
                variant={tipo === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTipo(t as any)}
              >
                {getTipoLabel(t)}
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ranking {getTipoLabel(tipo)} - {getPeriodoLabel(periodo)}
          </CardTitle>
          <CardDescription>
            Baseado em pontuação de atividades e participação
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                  </div>
                  <div className="w-16 h-8 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : rankings.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum dado de ranking disponível</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rankings.map((ranking, index) => (
                <div key={ranking.user_id} className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-12">
                    {getPositionIcon(ranking.posicao)}
                  </div>
                  
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={ranking.profiles?.avatar_url} />
                    <AvatarFallback>
                      {ranking.profiles?.nome?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {ranking.profiles?.nome || 'Usuário'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Trophy className="h-3 w-3 mr-1" />
                        {ranking.pontos_totais} pts
                      </Badge>
                      
                      {ranking.streak_estudo > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Flame className="h-3 w-3 mr-1" />
                          {ranking.streak_estudo} dias
                        </Badge>
                      )}
                      
                      {tipo === 'geral' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatarTempo(ranking.tempo_estudo_total)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {ranking.reunioes_participadas} reuniões
                          </Badge>
                        </>
                      )}
                      
                      {tipo === 'estudo' && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatarTempo(ranking.tempo_estudo_total)}
                        </Badge>
                      )}
                      
                      {tipo === 'reunioes' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {ranking.reunioes_participadas} reuniões
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatarTempo(ranking.tempo_reunioes_total)}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-lg">#{ranking.posicao}</div>
                    <div className="text-sm text-muted-foreground">
                      {ranking.pontos_totais} pontos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};