import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraficosComparativos } from './GraficosComparativos';
import { TabelaResumoAno } from './TabelaResumoAno';
import { TabelaResumoAvancado } from './TabelaResumoAvancado';
import { DollarSign, TrendingUp, Users, Target } from 'lucide-react';

export const DashboardAnual = () => {
  const [kpis, setKpis] = useState({
    mrrTotal: 0,
    ltvMedio: 0,
    roiAnual: 0,
    lucroAcumulado: 0
  });
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  useEffect(() => {
    carregarKPIs();
  }, [anoSelecionado]);

  const carregarKPIs = async () => {
    try {
      // Carregar resumo mensal do ano
      const { data: resumoMensal } = await supabase
        .from('financeiro_mensal')
        .select('*')
        .eq('ano', anoSelecionado);

      if (resumoMensal) {
        const lucroAcumulado = resumoMensal.reduce((acc, mes) => {
          const faturamento = Number(mes.faturamento_realizado) || 0;
          const despesas = Number(mes.despesas_realizadas) || 0;
          const parceiros = Number(mes.pagamento_parceiros_realizado) || 0;
          return acc + (faturamento - despesas - parceiros);
        }, 0);

        const totalAds = resumoMensal.reduce((acc, mes) => acc + (Number(mes.total_ads) || 0), 0);
        const roiAnual = totalAds > 0 ? (lucroAcumulado / totalAds) * 100 : 0;

        // Carregar clientes ativos para MRR e LTV
        const { data: clientesAtivos } = await supabase
          .from('financeiro_clientes_ativos')
          .select('mrr, ltv')
          .eq('ano_referencia', anoSelecionado);

        const mrrTotal = clientesAtivos?.reduce((acc, c) => acc + (Number(c.mrr) || 0), 0) || 0;
        const ltvMedio = clientesAtivos?.length 
          ? clientesAtivos.reduce((acc, c) => acc + (Number(c.ltv) || 0), 0) / clientesAtivos.length
          : 0;

        setKpis({
          mrrTotal,
          ltvMedio,
          roiAnual,
          lucroAcumulado
        });
      }
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs do Topo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.mrrTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.ltvMedio)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Anual</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.roiAnual.toFixed(2)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Acumulado</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.lucroAcumulado)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Comparativos */}
      <GraficosComparativos anoSelecionado={anoSelecionado} onAnoChange={setAnoSelecionado} />

      {/* Tabelas de Resumo */}
      <TabelaResumoAno anoSelecionado={anoSelecionado} />
      <TabelaResumoAvancado anoSelecionado={anoSelecionado} />
    </div>
  );
};
