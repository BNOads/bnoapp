import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface TabelaResumoAnoProps {
  anoSelecionado: number;
}

export const TabelaResumoAno = ({ anoSelecionado }: TabelaResumoAnoProps) => {
  const [dados, setDados] = useState<any[]>([]);

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
          
          return {
            mes: mes.mes,
            saida: totalSaidas,
            entrada: faturamento,
            saldo: faturamento - totalSaidas,
            rSaida: totalSaidas,
            rEntrada: faturamento,
            balanco: faturamento - totalSaidas
          };
        });

        setDados(dadosProcessados);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const exportarCSV = () => {
    // TODO: Implementar exportação CSV
    console.log('Exportar CSV');
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resumo do Ano (1) - {anoSelecionado}</CardTitle>
        <Button variant="outline" size="sm" onClick={exportarCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Saída</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">R$ Saída</TableHead>
                <TableHead className="text-right">R$ Entrada</TableHead>
                <TableHead className="text-right">Σ Balanço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((row) => (
                <TableRow key={row.mes}>
                  <TableCell className="font-medium">{meses[row.mes - 1]}</TableCell>
                  <TableCell className="text-right">{row.saida.toFixed(0)}</TableCell>
                  <TableCell className="text-right">{row.entrada.toFixed(0)}</TableCell>
                  <TableCell className="text-right">{row.saldo.toFixed(0)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatarMoeda(row.rSaida)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatarMoeda(row.rEntrada)}</TableCell>
                  <TableCell className={`text-right font-semibold ${row.balanco >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatarMoeda(row.balanco)}
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
