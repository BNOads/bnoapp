import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Calendar, FileText, History, TrendingUp, Info, FileImage, AlertCircle, Megaphone, Link2, ExternalLink } from 'lucide-react';
import { getCategoriaLabel, getCategoriaDescricao, MESES, STATUS_ORCAMENTO } from '@/lib/orcamentoConstants';
import { OrcamentoCriativosTab } from './OrcamentoCriativosTab';

interface OrcamentoDetalhes {
  id: string;
  nome_funil: string;
  valor_investimento: number;
  landing_page_url?: string | null;
  valor_gasto?: number;
  etapa_funil?: string;
  periodo_mes?: number;
  periodo_ano?: number;
  status_orcamento?: string;
  observacoes?: string;
  categoria_explicacao?: string;
  data_atualizacao?: string;
  created_at?: string;
  cliente_nome?: string;
  cliente_id?: string;
  linked_campaigns?: { id: string; name: string }[];
}

interface HistoricoItem {
  id: string;
  valor_anterior: number;
  valor_novo: number;
  motivo_alteracao: string;
  data_alteracao: string;
  alterado_por: string;
}

interface OrcamentoDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: OrcamentoDetalhes | null;
  initialTab?: string;
}

export const OrcamentoDetalhesModal = ({ open, onOpenChange, orcamento, initialTab = "info" }: OrcamentoDetalhesModalProps) => {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, open]);

  useEffect(() => {
    if (open && orcamento?.id) {
      carregarHistorico(orcamento.id);
    }
  }, [open, orcamento?.id]);

  const carregarHistorico = async (orcamentoId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('historico_orcamentos')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .order('data_alteracao', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getMesLabel = (mes: number) => {
    return MESES.find(m => m.value === mes)?.label || `Mês ${mes}`;
  };

  const getStatusBadge = (status?: string) => {
    const statusOption = STATUS_ORCAMENTO.find(s => s.value === status);
    if (!statusOption) return null;
    return (
      <Badge className={`${statusOption.color} text-white`}>
        {statusOption.label}
      </Badge>
    );
  };

  // Preparar dados para o gráfico de evolução
  const chartData = historico
    .slice()
    .reverse()
    .map((item, index) => ({
      index: index + 1,
      data: format(new Date(item.data_alteracao), 'dd/MM', { locale: ptBR }),
      valor: item.valor_novo,
      valorAnterior: item.valor_anterior || 0
    }));

  // Adicionar valor atual ao final se não estiver no histórico
  if (orcamento && chartData.length > 0) {
    const lastValue = chartData[chartData.length - 1]?.valor;
    if (lastValue !== orcamento.valor_investimento) {
      chartData.push({
        index: chartData.length + 1,
        data: 'Atual',
        valor: orcamento.valor_investimento,
        valorAnterior: lastValue || 0
      });
    }
  }

  if (!orcamento) return null;

  const explicacao = orcamento.categoria_explicacao || getCategoriaDescricao(orcamento.etapa_funil || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="text-xl">{orcamento.nome_funil}</DialogTitle>
            {orcamento.etapa_funil && (
              <Badge variant="outline">
                {getCategoriaLabel(orcamento.etapa_funil)}
              </Badge>
            )}
            {getStatusBadge(orcamento.status_orcamento)}
          </div>
          {orcamento.cliente_nome && (
            <p className="text-sm text-muted-foreground">{orcamento.cliente_nome}</p>
          )}
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="criativos" className="flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Criativos
            </TabsTrigger>
            <TabsTrigger value="campanhas" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="grafico" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Gráfico
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Links Úteis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Valor principal */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Previsto</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(orcamento.valor_investimento)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Período */}
            {orcamento.periodo_mes && orcamento.periodo_ano && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Período</p>
                      <p className="text-lg font-semibold">
                        {getMesLabel(orcamento.periodo_mes)} / {orcamento.periodo_ano}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Landing Page */}
            {orcamento.landing_page_url && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Link2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Landing Page</p>
                        <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-md">
                          {orcamento.landing_page_url}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(orcamento.landing_page_url!, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Explicação da Categoria */}
            {explicacao && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Info className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Explicação da Categoria</p>
                      <p className="text-sm mt-1">{explicacao}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Observações */}
            {orcamento.observacoes && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Observações</p>
                      <p className="text-sm mt-1">{orcamento.observacoes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data de atualização */}
            {orcamento.data_atualizacao && (
              <p className="text-xs text-muted-foreground text-center">
                Última atualização: {format(new Date(orcamento.data_atualizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </TabsContent>

          <TabsContent value="criativos" className="mt-4">
            {orcamento.id && orcamento.cliente_id ? (
              <OrcamentoCriativosTab orcamentoId={orcamento.id} clienteId={orcamento.cliente_id} />
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Informações do cliente não encontradas para este funil.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="campanhas" className="mt-4">
            {!orcamento.linked_campaigns || orcamento.linked_campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma campanha vinculada encontrada.</p>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Campanhas Vinculadas</h3>
                      <Badge variant="secondary">{orcamento.linked_campaigns.length}</Badge>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome da Campanha</TableHead>
                            <TableHead className="w-[100px] text-right">ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orcamento.linked_campaigns.map((campanha) => (
                            <TableRow key={campanha.id}>
                              <TableCell className="font-medium">{campanha.name}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">{campanha.id}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : historico.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor Anterior</TableHead>
                      <TableHead>Novo Valor</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(item.data_alteracao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {item.valor_anterior ? formatCurrency(item.valor_anterior) : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(item.valor_novo)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.motivo_alteracao || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum histórico de alterações encontrado</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="grafico" className="mt-4">
            {chartData.length > 1 ? (
              <Card>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="valor"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Valor"
                        dot={{ fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Não há dados suficientes para exibir o gráfico de evolução.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  O gráfico será exibido quando houver alterações no valor do orçamento.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              {orcamento.landing_page_url ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Link2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Landing Page</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-md">
                            {orcamento.landing_page_url}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(orcamento.landing_page_url!);
                            // toast.success is not imported here, but we can assume sonner or similar if we wanted
                          }}
                        >
                          Copiar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => window.open(orcamento.landing_page_url!, '_blank')}
                        >
                          Abrir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">Nenhum link útil cadastrado para este funil.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
