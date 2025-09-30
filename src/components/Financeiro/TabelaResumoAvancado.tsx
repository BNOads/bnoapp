import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TabelaResumoAvancadoProps {
  anoSelecionado: number;
}

export const TabelaResumoAvancado = ({ anoSelecionado }: TabelaResumoAvancadoProps) => {
  const [dados, setDados] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    carregarDados();
  }, [anoSelecionado]);

  const carregarDados = async () => {
    try {
      const { data: resumoMensal } = await supabase
        .from('financeiro_mensal')
        .select('*')
        .eq('ano', anoSelecionado)
        .order('mes');

      if (resumoMensal) {
        const dadosProcessados = resumoMensal.map(mes => {
          const faturamento = Number(mes.faturamento_realizado) || 0;
          const despesas = Number(mes.despesas_realizadas) || 0;
          const parceiros = Number(mes.pagamento_parceiros_realizado) || 0;
          const totalSaidas = despesas + parceiros;
          const lucro = faturamento - totalSaidas;
          const margemLucro = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
          const ticketMedio = mes.clientes_ativos > 0 ? faturamento / mes.clientes_ativos : 0;
          const custoPorConta = mes.clientes_ativos > 0 ? despesas / mes.clientes_ativos : 0;
          const churnRate = mes.clientes_ativos > 0 ? (mes.clientes_perdidos / mes.clientes_ativos) * 100 : 0;
          const roi = mes.total_ads > 0 ? (lucro / mes.total_ads) * 100 : 0;

          return {
            mes: mes.mes,
            mesRef: `${mes.mes}/${mes.ano}`,
            faturamento,
            despesas,
            totalSaidas,
            lucro,
            margemLucro,
            parceiros,
            ticketMedio,
            custoPorConta,
            churnRate,
            roi,
            clientesAtivos: mes.clientes_ativos,
            colaboradores: mes.colaboradores,
            fechamento: mes.fechamento
          };
        });

        setDados(dadosProcessados);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resumo do Ano (2) - Financeiro Avançado</CardTitle>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês ref.</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Total Saídas</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
                <TableHead className="text-right">Parceiros</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Custo/Conta</TableHead>
                <TableHead className="text-right">Churn %</TableHead>
                <TableHead className="text-right">ROI %</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Colab.</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((row) => (
                <TableRow key={row.mes}>
                  <TableCell className="font-medium">{meses[row.mes - 1]}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(row.faturamento)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(row.despesas)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(row.totalSaidas)}</TableCell>
                  <TableCell className={`text-right font-semibold ${row.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatarMoeda(row.lucro)}
                  </TableCell>
                  <TableCell className="text-right">{row.margemLucro.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{formatarMoeda(row.parceiros)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(row.ticketMedio)}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(row.custoPorConta)}</TableCell>
                  <TableCell className="text-right">{row.churnRate.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{row.roi.toFixed(2)}%</TableCell>
                  <TableCell className="text-center">{row.clientesAtivos}</TableCell>
                  <TableCell className="text-center">{row.colaboradores}</TableCell>
                  <TableCell className="text-sm">{row.fechamento}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Navegar para o resumo do mês
                        const url = new URL(window.location.href);
                        url.searchParams.set('tab', 'mes');
                        url.searchParams.set('mes', row.mes.toString());
                        url.searchParams.set('ano', anoSelecionado.toString());
                        window.history.pushState({}, '', url);
                        window.location.reload();
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
