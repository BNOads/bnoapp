import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Users, AlertTriangle } from "lucide-react";

export function NPSOverview() {
  const [stats, setStats] = useState({
    nps_medio: 0,
    total_respostas: 0,
    total_promotores: 0,
    total_detratores: 0,
    alertas_pendentes: 0,
    tendencia: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async () => {
    try {
      // Últimos 30 dias
      const hoje = new Date();
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: respostas } = await supabase
        .from('nps_respostas' as any)
        .select('*')
        .gte('data_resposta', trintaDiasAtras.toISOString());

      const { data: alertas } = await supabase
        .from('nps_alertas' as any)
        .select('*')
        .eq('resolvido', false);

      if (respostas) {
        const nps_medio = respostas.reduce((sum: number, r: any) => sum + r.nota_nps, 0) / respostas.length;
        const promotores = respostas.filter((r: any) => r.tipo_respondente === 'promotor').length;
        const detratores = respostas.filter((r: any) => r.tipo_respondente === 'detrator').length;

        setStats({
          nps_medio: nps_medio || 0,
          total_respostas: respostas.length,
          total_promotores: promotores,
          total_detratores: detratores,
          alertas_pendentes: alertas?.length || 0,
          tendencia: 0.2 // Calcular depois
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">NPS Geral BNOads</CardTitle>
          {stats.tendencia > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.nps_medio.toFixed(1)} ⭐</div>
          <p className="text-xs text-muted-foreground">
            {stats.tendencia > 0 ? '↗️' : '↘️'} {Math.abs(stats.tendencia).toFixed(1)} nos últimos 30 dias
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.total_respostas}</div>
          <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Promotores vs Detratores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className="text-green-600">{stats.total_promotores}</span> / <span className="text-red-600">{stats.total_detratores}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {((stats.total_promotores / stats.total_respostas) * 100).toFixed(0)}% promotores
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas Pendentes</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">{stats.alertas_pendentes}</div>
          <p className="text-xs text-muted-foreground">Requerem atenção urgente</p>
        </CardContent>
      </Card>
    </div>
  );
}
