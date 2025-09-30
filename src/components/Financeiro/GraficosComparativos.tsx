import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface GraficosComparativosProps {
  anoSelecionado: number;
  onAnoChange: (ano: number) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const GraficosComparativos = ({ anoSelecionado, onAnoChange }: GraficosComparativosProps) => {
  const [dadosLinha, setDadosLinha] = useState<any[]>([]);
  const [dadosBarras, setDadosBarras] = useState<any[]>([]);
  const [dadosPizza, setDadosPizza] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState('ano');

  useEffect(() => {
    carregarDadosGraficos();
  }, [anoSelecionado, periodo]);

  const carregarDadosGraficos = async () => {
    try {
      const { data: resumoMensal } = await supabase
        .from('financeiro_mensal')
        .select('*')
        .eq('ano', anoSelecionado)
        .order('mes');

      if (resumoMensal) {
        // Dados para gráfico de linha
        const linha = resumoMensal.map(mes => ({
          mes: `${mes.mes}/${mes.ano}`,
          Faturamento: Number(mes.faturamento_realizado) || 0,
          Despesas: Number(mes.despesas_realizadas) || 0,
          Lucro: (Number(mes.faturamento_realizado) || 0) - (Number(mes.despesas_realizadas) || 0) - (Number(mes.pagamento_parceiros_realizado) || 0)
        }));

        // Dados para gráfico de barras
        const barras = resumoMensal.map(mes => ({
          mes: `${mes.mes}/${mes.ano}`,
          Entradas: Number(mes.faturamento_realizado) || 0,
          Saídas: (Number(mes.despesas_realizadas) || 0) + (Number(mes.pagamento_parceiros_realizado) || 0)
        }));

        setDadosLinha(linha);
        setDadosBarras(barras);

        // Carregar movimentos para pizza de distribuição
        const { data: movimentos } = await supabase
          .from('financeiro_movimentos')
          .select('classificacao, valor')
          .eq('ano_referencia', anoSelecionado)
          .eq('tipo', 'saida')
          .eq('status', 'realizado');

        if (movimentos) {
          const distribuicao = movimentos.reduce((acc: any, mov) => {
            const classificacao = mov.classificacao || 'Outros';
            acc[classificacao] = (acc[classificacao] || 0) + Number(mov.valor);
            return acc;
          }, {});

          const pizza = Object.entries(distribuicao).map(([name, value]) => ({
            name,
            value
          }));

          setDadosPizza(pizza);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos:', error);
    }
  };

  const exportarGrafico = (tipo: string) => {
    // TODO: Implementar exportação de gráfico
    console.log(`Exportar gráfico: ${tipo}`);
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ano">Ano Completo</SelectItem>
              <SelectItem value="6meses">Últimos 6 Meses</SelectItem>
              <SelectItem value="3meses">Últimos 3 Meses</SelectItem>
            </SelectContent>
          </Select>

          <Select value={anoSelecionado.toString()} onValueChange={(v) => onAnoChange(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(ano => (
                <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gráfico de Linha - Faturamento vs Despesas vs Lucro */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Linha do Tempo - Faturamento, Despesas e Lucro</CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportarGrafico('linha')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosLinha}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
              <Legend />
              <Line type="monotone" dataKey="Faturamento" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Lucro" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Barras - Entradas vs Saídas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Entradas vs Saídas</CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportarGrafico('barras')}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosBarras}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                <Legend />
                <Bar dataKey="Entradas" fill="#10b981" />
                <Bar dataKey="Saídas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição de Despesas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Distribuição de Despesas</CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportarGrafico('pizza')}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
