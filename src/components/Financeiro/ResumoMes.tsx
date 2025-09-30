import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, Pencil } from 'lucide-react';
import { MovimentoModal } from './MovimentoModal';

export const ResumoMes = () => {
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [modalAberto, setModalAberto] = useState(false);
  const [movimentoEditando, setMovimentoEditando] = useState<any>(null);
  const [totais, setTotais] = useState({
    faturamentoPrevisto: 0,
    faturamentoRealizado: 0,
    despesasPrevistas: 0,
    despesasRealizadas: 0,
    parceirosPrevisto: 0,
    parceirosRealizado: 0,
    balancoPrevisto: 0,
    balancoRealizado: 0
  });

  useEffect(() => {
    carregarMovimentos();
  }, [mesSelecionado, anoSelecionado]);

  const carregarMovimentos = async () => {
    try {
      const { data } = await supabase
        .from('financeiro_movimentos')
        .select('*')
        .eq('mes_referencia', mesSelecionado)
        .eq('ano_referencia', anoSelecionado)
        .order('data_prevista');

      if (data) {
        setMovimentos(data);
        calcularTotais(data);
      }
    } catch (error) {
      console.error('Erro ao carregar movimentos:', error);
    }
  };

  const calcularTotais = (movs: any[]) => {
    const totais = {
      faturamentoPrevisto: 0,
      faturamentoRealizado: 0,
      despesasPrevistas: 0,
      despesasRealizadas: 0,
      parceirosPrevisto: 0,
      parceirosRealizado: 0,
      balancoPrevisto: 0,
      balancoRealizado: 0
    };

    movs.forEach(mov => {
      const valor = Number(mov.valor) || 0;
      const isParceiro = mov.classificacao?.toLowerCase().includes('parceiro');
      
      if (mov.tipo === 'entrada') {
        totais.faturamentoPrevisto += valor;
        if (mov.status === 'realizado' || mov.status === 'pago') {
          totais.faturamentoRealizado += valor;
        }
      } else {
        if (isParceiro) {
          totais.parceirosPrevisto += valor;
          if (mov.status === 'realizado' || mov.status === 'pago') {
            totais.parceirosRealizado += valor;
          }
        } else {
          totais.despesasPrevistas += valor;
          if (mov.status === 'realizado' || mov.status === 'pago') {
            totais.despesasRealizadas += valor;
          }
        }
      }
    });

    totais.balancoPrevisto = totais.faturamentoPrevisto - totais.despesasPrevistas - totais.parceirosPrevisto;
    totais.balancoRealizado = totais.faturamentoRealizado - totais.despesasRealizadas - totais.parceirosRealizado;

    setTotais(totais);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resumo do Mês</CardTitle>
            <div className="flex gap-2">
              <Select value={mesSelecionado.toString()} onValueChange={(v) => setMesSelecionado(Number(v))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(mes => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(ano => (
                    <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => {
                setMovimentoEditando(null);
                setModalAberto(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Movimento
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Movimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{formatarData(mov.data_prevista)}</TableCell>
                    <TableCell className="font-medium">{mov.movimento}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        mov.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </TableCell>
                    <TableCell>{mov.classificacao}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{mov.descricao}</TableCell>
                    <TableCell className={`text-right font-semibold ${
                      mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatarMoeda(Number(mov.valor) || 0)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        mov.status === 'pago' ? 'bg-blue-100 text-blue-700' :
                        mov.status === 'realizado' ? 'bg-green-100 text-green-700' :
                        mov.status === 'atrasado' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {mov.status === 'pago' ? 'Pago' :
                         mov.status === 'realizado' ? 'Realizado' :
                         mov.status === 'atrasado' ? 'Atrasado' : 'Previsto'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                      {mov.observacoes}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMovimentoEditando(mov);
                          setModalAberto(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {movimentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum movimento encontrado para este mês
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Resumo */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-semibold mb-3">PREVISTO</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>TOTAL FATURAMENTO:</span>
                  <span className="font-semibold text-green-600">{formatarMoeda(totais.faturamentoPrevisto)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TOTAL DESPESAS:</span>
                  <span className="font-semibold text-red-600">{formatarMoeda(totais.despesasPrevistas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TOTAL PARCEIROS:</span>
                  <span className="font-semibold text-red-600">{formatarMoeda(totais.parceirosPrevisto)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold">BALANÇO:</span>
                  <span className={`font-bold ${totais.balancoPrevisto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatarMoeda(totais.balancoPrevisto)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">REALIZADO</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>TOTAL FATURAMENTO:</span>
                  <span className="font-semibold text-green-600">{formatarMoeda(totais.faturamentoRealizado)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TOTAL DESPESAS:</span>
                  <span className="font-semibold text-red-600">{formatarMoeda(totais.despesasRealizadas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TOTAL PARCEIROS:</span>
                  <span className="font-semibold text-red-600">{formatarMoeda(totais.parceirosRealizado)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold">BALANÇO:</span>
                  <span className={`font-bold ${totais.balancoRealizado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatarMoeda(totais.balancoRealizado)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MovimentoModal
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setMovimentoEditando(null);
        }}
        movimento={movimentoEditando}
        mesReferencia={mesSelecionado}
        anoReferencia={anoSelecionado}
        onSuccess={() => {
          carregarMovimentos();
          setModalAberto(false);
          setMovimentoEditando(null);
        }}
      />
    </>
  );
};
