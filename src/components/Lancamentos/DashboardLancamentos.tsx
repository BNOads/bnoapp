import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Calendar, Users, Target, Activity } from 'lucide-react';

interface Lancamento {
  id: string;
  nome_lancamento: string;
  gestor_responsavel: string;
  status_lancamento: string;
  tipo_lancamento: string;
  data_inicio_captacao: string;
  data_fim_captacao?: string;
  investimento_total: number;
  meta_investimento?: number;
  resultado_obtido?: number;
  roi_percentual?: number;
  colaboradores?: {
    nome: string;
    avatar_url?: string;
  };
}

interface DashboardLancamentosProps {
  lancamentos: Lancamento[];
  statusLabels: Record<string, string>;
  tipoLabels: Record<string, string>;
}

const DashboardLancamentos: React.FC<DashboardLancamentosProps> = ({
  lancamentos,
  statusLabels,
  tipoLabels
}) => {
  
  // Cores para os gráficos
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

  // Calcular métricas gerais
  const metricas = useMemo(() => {
    const ativos = lancamentos.filter(l => ['em_captacao', 'cpl', 'remarketing'].includes(l.status_lancamento));
    const finalizados = lancamentos.filter(l => l.status_lancamento === 'finalizado');
    
    const investimentoTotal = lancamentos.reduce((sum, l) => sum + l.investimento_total, 0);
    const investimentoAtivo = ativos.reduce((sum, l) => sum + l.investimento_total, 0);
    const metaTotal = lancamentos.reduce((sum, l) => sum + (l.meta_investimento || 0), 0);
    
    const roiMedio = finalizados.length > 0 
      ? finalizados.reduce((sum, l) => sum + (l.roi_percentual || 0), 0) / finalizados.length 
      : 0;

    return {
      totalLancamentos: lancamentos.length,
      lancamentosAtivos: ativos.length,
      lancamentosFinalizados: finalizados.length,
      investimentoTotal,
      investimentoAtivo,
      metaTotal,
      roiMedio,
      percentualMeta: metaTotal > 0 ? (investimentoTotal / metaTotal) * 100 : 0
    };
  }, [lancamentos]);

  // Dados para gráfico de distribuição por status
  const dadosStatus = useMemo(() => {
    const distribuicao = Object.entries(statusLabels).map(([status, label]) => {
      const quantidade = lancamentos.filter(l => l.status_lancamento === status).length;
      const investimento = lancamentos
        .filter(l => l.status_lancamento === status)
        .reduce((sum, l) => sum + l.investimento_total, 0);
      
      return {
        status: label,
        quantidade,
        investimento,
        percentual: lancamentos.length > 0 ? (quantidade / lancamentos.length) * 100 : 0
      };
    }).filter(item => item.quantidade > 0);

    return distribuicao;
  }, [lancamentos, statusLabels]);

  // Dados para gráfico de distribuição por tipo
  const dadosTipo = useMemo(() => {
    const distribuicao = Object.entries(tipoLabels).map(([tipo, label]) => {
      const quantidade = lancamentos.filter(l => l.tipo_lancamento === tipo).length;
      const investimento = lancamentos
        .filter(l => l.tipo_lancamento === tipo)
        .reduce((sum, l) => sum + l.investimento_total, 0);
      
      return {
        tipo: label,
        quantidade,
        investimento,
        percentual: lancamentos.length > 0 ? (quantidade / lancamentos.length) * 100 : 0
      };
    }).filter(item => item.quantidade > 0);

    return distribuicao;
  }, [lancamentos, tipoLabels]);

  // Dados para gráfico de investimento por gestor
  const dadosGestores = useMemo(() => {
    const gestoresMap = new Map();
    
    lancamentos.forEach(l => {
      const nomeGestor = l.colaboradores?.nome || 'N/A';
      if (!gestoresMap.has(nomeGestor)) {
        gestoresMap.set(nomeGestor, {
          nome: nomeGestor,
          quantidade: 0,
          investimento: 0,
          ativos: 0
        });
      }
      
      const gestor = gestoresMap.get(nomeGestor);
      gestor.quantidade += 1;
      gestor.investimento += l.investimento_total;
      
      if (['em_captacao', 'cpl', 'remarketing'].includes(l.status_lancamento)) {
        gestor.ativos += 1;
      }
    });

    return Array.from(gestoresMap.values()).sort((a, b) => b.investimento - a.investimento);
  }, [lancamentos]);

  // Dados para evolução temporal (últimos 6 meses)
  const dadosEvolucao = useMemo(() => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      const lancamentosDoMes = lancamentos.filter(l => {
        const dataLancamento = new Date(l.data_inicio_captacao);
        return dataLancamento.getMonth() === data.getMonth() && 
               dataLancamento.getFullYear() === data.getFullYear();
      });

      meses.push({
        mes: mesAno,
        quantidade: lancamentosDoMes.length,
        investimento: lancamentosDoMes.reduce((sum, l) => sum + l.investimento_total, 0)
      });
    }

    return meses;
  }, [lancamentos]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const formatarMoedaCompleta = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Lançamentos Ativos</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{metricas.lancamentosAtivos}</div>
            <div className="text-xs text-muted-foreground">
              de {metricas.totalLancamentos} total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Investimento Ativo</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatarMoeda(metricas.investimentoAtivo)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total: {formatarMoeda(metricas.investimentoTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">% da Meta</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {metricas.percentualMeta.toFixed(1)}%
            </div>
            <Progress value={Math.min(100, metricas.percentualMeta)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">ROI Médio</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {metricas.roiMedio.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {metricas.lancamentosFinalizados} finalizados
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Quantidade e investimento por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percentual }) => `${status} (${percentual.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantidade"
                >
                  {dadosStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    `${value} lançamentos`,
                    `Investimento: ${formatarMoedaCompleta(props.payload.investimento)}`
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Investimento por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Investimento por Tipo</CardTitle>
            <CardDescription>Valor investido por tipo de lançamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosTipo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="tipo" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={(value) => formatarMoeda(value)} />
                <Tooltip 
                  formatter={(value) => [formatarMoedaCompleta(Number(value)), 'Investimento']}
                  labelFormatter={(label) => `Tipo: ${label}`}
                />
                <Bar dataKey="investimento" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Gestores e Evolução Temporal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking de Gestores */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking por Gestor</CardTitle>
            <CardDescription>Investimento total por gestor responsável</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dadosGestores.slice(0, 6).map((gestor, index) => (
                <div key={gestor.nome} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{gestor.nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {gestor.quantidade} lançamentos ({gestor.ativos} ativos)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatarMoeda(gestor.investimento)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Evolução Temporal */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução dos Lançamentos</CardTitle>
            <CardDescription>Quantidade e investimento nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosEvolucao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatarMoeda(value)} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'quantidade') return [value, 'Lançamentos'];
                    return [formatarMoedaCompleta(Number(value)), 'Investimento'];
                  }}
                />
                <Bar yAxisId="left" dataKey="quantidade" fill="#10B981" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="investimento" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Performance</CardTitle>
          <CardDescription>Indicadores consolidados do período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Lançamentos Simultâneos</h4>
              <div className="text-3xl font-bold text-blue-600">{metricas.lancamentosAtivos}</div>
              <p className="text-sm text-muted-foreground">
                Lançamentos em execução paralela atualmente
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Investimento Simultâneo</h4>
              <div className="text-3xl font-bold text-green-600">
                {formatarMoeda(metricas.investimentoAtivo)}
              </div>
              <p className="text-sm text-muted-foreground">
                Capital total em lançamentos ativos
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Taxa de Conclusão</h4>
              <div className="text-3xl font-bold text-purple-600">
                {metricas.totalLancamentos > 0 
                  ? ((metricas.lancamentosFinalizados / metricas.totalLancamentos) * 100).toFixed(1)
                  : 0
                }%
              </div>
              <p className="text-sm text-muted-foreground">
                Percentual de lançamentos finalizados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardLancamentos;