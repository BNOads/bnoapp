import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CalendarClock, ArrowLeft, Save, Edit, Download, BarChart3, Calculator } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from 'xlsx';

interface VerbaFase {
  captacao: { percentual: number; dias: number };
  evento: { percentual: number; dias: number };
  lembrete: { percentual: number; dias: number };
  aquecimento: { percentual: number; dias: number };
  impulsionar: { percentual: number; dias: number };
  venda: { percentual: number; dias: number };
}

interface DistribuicaoCanais {
  meta_ads: { percentual: number };
  google_ads: { percentual: number };
  outras_fontes: { percentual: number };
}

interface Lancamento {
  id: string;
  nome_lancamento: string;
  promessa: string | null;
  status_lancamento: string;
  tipo_lancamento: string;
  data_inicio_captacao: string;
  data_fim_captacao: string | null;
  data_inicio_cpl: string | null;
  data_fim_cpl: string | null;
  data_inicio_carrinho: string | null;
  data_fim_carrinho: string | null;
  data_fechamento: string | null;
  ticket_produto: number | null;
  tipo_aulas: string;
  leads_desejados: number | null;
  investimento_total: number;
  publico_alvo: string | null;
  meta_custo_lead: number | null;
  distribuicao_plataformas: any;
  distribuicao_fases: any;
  metas_investimentos: any;
  links_uteis: any[];
  observacoes: string | null;
  verba_por_fase: any;
  distribuicao_canais: any;
  observacoes_verbas: string | null;
  cliente_id: string | null;
  gestor_responsavel_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  clientes?: { nome: string } | null;
  gestor?: { id: string; nome: string } | null;
}

export default function LancamentoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lancamento, setLancamento] = useState<Lancamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'calendario' | 'informacoes' | 'verbas'>('calendario');
  const [ganttView, setGanttView] = useState(false);

  useEffect(() => {
    fetchLancamento();
  }, [id]);

  const fetchLancamento = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('lancamentos')
        .select(`
          *,
          clientes:cliente_id(nome),
          gestor:gestor_responsavel_id(id, nome)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error('Lançamento não encontrado');
        navigate('/lancamentos');
        return;
      }

      setLancamento(data as any);
    } catch (error) {
      console.error('Erro ao buscar lançamento:', error);
      toast.error('Erro ao carregar lançamento');
      navigate('/lancamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lancamento) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lancamentos')
        .update({
          nome_lancamento: lancamento.nome_lancamento,
          promessa: lancamento.promessa,
          ticket_produto: lancamento.ticket_produto,
          leads_desejados: lancamento.leads_desejados,
          publico_alvo: lancamento.publico_alvo,
          meta_custo_lead: lancamento.meta_custo_lead,
          observacoes: lancamento.observacoes,
          data_inicio_cpl: lancamento.data_inicio_cpl,
          data_fim_cpl: lancamento.data_fim_cpl,
          data_inicio_carrinho: lancamento.data_inicio_carrinho,
          data_fim_carrinho: lancamento.data_fim_carrinho,
          data_fechamento: lancamento.data_fechamento,
          verba_por_fase: lancamento.verba_por_fase,
          distribuicao_canais: lancamento.distribuicao_canais,
          observacoes_verbas: lancamento.observacoes_verbas,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Lançamento salvo com sucesso');
      setEditing(false);
      fetchLancamento();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar lançamento');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Não definido';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'em_captacao': 'bg-blue-100 text-blue-800',
      'em_cpl': 'bg-yellow-100 text-yellow-800',
      'em_carrinho': 'bg-orange-100 text-orange-800',
      'finalizado': 'bg-green-100 text-green-800',
      'pausado': 'bg-gray-100 text-gray-800',
      'cancelado': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const calcularDiasFase = (dataInicio: string | null, dataFim: string | null) => {
    if (!dataInicio || !dataFim) return 0;
    return Math.max(1, differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1);
  };

  const atualizarVerbaPorFase = () => {
    if (!lancamento) return lancamento;

    const verbas = lancamento.verba_por_fase || {
      captacao: { percentual: 40, dias: 0 },
      evento: { percentual: 30, dias: 0 },
      lembrete: { percentual: 10, dias: 0 },
      aquecimento: { percentual: 10, dias: 0 },
      impulsionar: { percentual: 5, dias: 0 },
      venda: { percentual: 5, dias: 0 }
    };

    // Calcular dias automaticamente baseado nas datas
    verbas.captacao.dias = calcularDiasFase(lancamento.data_inicio_captacao, lancamento.data_fim_captacao);
    verbas.evento.dias = calcularDiasFase(lancamento.data_inicio_cpl, lancamento.data_fim_cpl);
    verbas.lembrete.dias = calcularDiasFase(lancamento.data_inicio_carrinho, lancamento.data_fim_carrinho);
    verbas.aquecimento.dias = 1; // Fase específica
    verbas.impulsionar.dias = 1; // Fase específica
    verbas.venda.dias = calcularDiasFase(lancamento.data_inicio_carrinho, lancamento.data_fechamento);

    return verbas;
  };

  const exportarVerbas = () => {
    if (!lancamento) return;

    const verbas = atualizarVerbaPorFase();
    const canais = lancamento.distribuicao_canais || { meta_ads: { percentual: 70 }, google_ads: { percentual: 20 }, outras_fontes: { percentual: 10 } };

    // Criar dados para o Excel
    const dadosVerbas = Object.entries(verbas).map(([fase, dados]: [string, any]) => ({
      'Etapa': fase.charAt(0).toUpperCase() + fase.slice(1),
      '% Verba': dados?.percentual || 0,
      'Investimento Total (R$)': (lancamento.investimento_total * (dados?.percentual || 0) / 100).toFixed(2),
      'Investimento Diário (R$)': (dados?.dias || 0) > 0 ? (lancamento.investimento_total * (dados?.percentual || 0) / 100 / (dados?.dias || 1)).toFixed(2) : '0',
      'Quantidade de Dias': dados?.dias || 0
    }));

    const dadosCanais = Object.entries(canais).map(([canal, dados]: [string, any]) => ({
      'Canal': canal.replace('_', ' ').toUpperCase(),
      '% Distribuição': dados?.percentual || 0,
      'Valor (R$)': (lancamento.investimento_total * (dados?.percentual || 0) / 100).toFixed(2)
    }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Adicionar planilhas
    const wsVerbas = XLSX.utils.json_to_sheet(dadosVerbas);
    const wsCanais = XLSX.utils.json_to_sheet(dadosCanais);
    
    XLSX.utils.book_append_sheet(wb, wsVerbas, 'Verbas por Fase');
    XLSX.utils.book_append_sheet(wb, wsCanais, 'Distribuição Canais');

    // Salvar arquivo
    XLSX.writeFile(wb, `verbas_${lancamento.nome_lancamento}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  };

  const renderTimeline = () => {
    const events = [
      { label: 'Início Captação', date: lancamento?.data_inicio_captacao, color: 'bg-blue-500' },
      { label: 'Fim Captação', date: lancamento?.data_fim_captacao, color: 'bg-blue-300' },
      { label: 'Início CPL', date: lancamento?.data_inicio_cpl, color: 'bg-yellow-500' },
      { label: 'Fim CPL', date: lancamento?.data_fim_cpl, color: 'bg-yellow-300' },
      { label: 'Início Carrinho', date: lancamento?.data_inicio_carrinho, color: 'bg-orange-500' },
      { label: 'Fim Carrinho', date: lancamento?.data_fim_carrinho, color: 'bg-orange-300' },
      { label: 'Fechamento', date: lancamento?.data_fechamento, color: 'bg-green-500' }
    ].filter(event => event.date);

    if (ganttView) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Visualização Gantt</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setGanttView(false)}
            >
              Ver Calendário
            </Button>
          </div>
          <div className="space-y-3">
            {events.map((event, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium">{event.label}</div>
                <div className="flex-1 relative h-8 bg-gray-100 rounded">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded ${event.color} flex items-center px-2 text-white text-xs`}
                    style={{ width: '80%' }}
                  >
                    {formatDate(event.date!)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Cronograma</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setGanttView(true)}
          >
            Ver Gantt
          </Button>
        </div>
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className={`w-3 h-3 rounded-full ${event.color}`}></div>
              <div>
                <p className="font-medium">{event.label}</p>
                <p className="text-sm text-muted-foreground">{formatDate(event.date!)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVerbas = () => {
    if (!lancamento) return null;

    const verbas = atualizarVerbaPorFase();
    const canais = lancamento.distribuicao_canais || { 
      meta_ads: { percentual: 70 }, 
      google_ads: { percentual: 20 }, 
      outras_fontes: { percentual: 10 } 
    };

    const totalPercentualVerbas = Object.values(verbas as any).reduce((sum: number, fase: any) => sum + (fase?.percentual || 0), 0);
    const totalPercentualCanais = Object.values(canais as any).reduce((sum: number, canal: any) => sum + (canal?.percentual || 0), 0);

    return (
      <div className="space-y-6">
        {/* Header com botões */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Cálculo de Verbas</h3>
          <Button onClick={exportarVerbas} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Tabela de Verbas por Fase */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Distribuição por Fase
              <Badge variant={totalPercentualVerbas === 100 ? "default" : "destructive"}>
                Total: {Number(totalPercentualVerbas)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
                  <TableHead>% Verba</TableHead>
                  <TableHead>Investimento Total (R$)</TableHead>
                  <TableHead>Investimento Diário (R$)</TableHead>
                  <TableHead>Quantidade de Dias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(verbas as any).map(([fase, dados]: [string, any]) => {
                  const percentual = dados?.percentual || 0;
                  const dias = dados?.dias || 0;
                  const investimentoTotal = lancamento.investimento_total * percentual / 100;
                  const investimentoDiario = dias > 0 ? investimentoTotal / dias : 0;
                  
                  return (
                    <TableRow key={fase}>
                      <TableCell className="font-medium">
                        {fase.charAt(0).toUpperCase() + fase.slice(1)}
                      </TableCell>
                      <TableCell>
                        {editing ? (
                          <Input
                            type="number"
                            value={percentual}
                            onChange={(e) => {
                              const novasVerbas = { ...(verbas as any) };
                              if (novasVerbas[fase]) {
                                novasVerbas[fase].percentual = Number(e.target.value);
                              }
                              setLancamento({
                                ...lancamento,
                                verba_por_fase: novasVerbas
                              });
                            }}
                            className="w-20"
                          />
                        ) : (
                          <span>{percentual}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        R$ {investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        R$ {investimentoDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{dias} dias</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabela de Distribuição por Canal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição por Canal
              <Badge variant={totalPercentualCanais === 100 ? "default" : "destructive"}>
                Total: {Number(totalPercentualCanais)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>% Distribuição</TableHead>
                  <TableHead>Valor (R$)</TableHead>
                  <TableHead>Valor Diário Médio (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(canais as any).map(([canal, dados]: [string, any]) => {
                  const percentual = dados?.percentual || 0;
                  const valorTotal = lancamento.investimento_total * percentual / 100;
                  const diasCampanha = Object.values(verbas as any).reduce((sum: number, fase: any) => sum + (Number(fase?.dias) || 0), 0);
                  const valorDiario = Number(diasCampanha) > 0 ? valorTotal / Number(diasCampanha) : 0;
                  
                  return (
                    <TableRow key={canal}>
                      <TableCell className="font-medium">
                        {canal.replace('_', ' ').toUpperCase()}
                      </TableCell>
                      <TableCell>
                        {editing ? (
                          <Input
                            type="number"
                            value={percentual}
                            onChange={(e) => {
                              const novosCanais = { ...(canais as any) };
                              if (novosCanais[canal]) {
                                novosCanais[canal].percentual = Number(e.target.value);
                              }
                              setLancamento({
                                ...lancamento,
                                distribuicao_canais: novosCanais
                              });
                            }}
                            className="w-20"
                          />
                        ) : (
                          <span>{percentual}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        R$ {valorDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações sobre Verbas</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={lancamento.observacoes_verbas || ''}
                onChange={(e) => setLancamento({
                  ...lancamento,
                  observacoes_verbas: e.target.value
                })}
                placeholder="Adicione observações sobre a distribuição de verbas..."
                rows={4}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {lancamento.observacoes_verbas || 'Nenhuma observação adicionada'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  if (!lancamento) {
    return <div className="text-center py-8">Lançamento não encontrado</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/lancamentos')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lancamento.nome_lancamento}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(lancamento.status_lancamento)}>
                {lancamento.status_lancamento.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {lancamento.tipo_lancamento.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="secondary">
                R$ {lancamento.investimento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cronograma
          </TabsTrigger>
          <TabsTrigger value="informacoes" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="verbas" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Verbas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cronograma do Lançamento</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTimeline()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="informacoes" className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome do Lançamento</Label>
                  {editing ? (
                    <Input
                      value={lancamento.nome_lancamento}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        nome_lancamento: e.target.value
                      })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{lancamento.nome_lancamento}</p>
                  )}
                </div>

                <div>
                  <Label>Promessa</Label>
                  {editing ? (
                    <Textarea
                      value={lancamento.promessa || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        promessa: e.target.value
                      })}
                      placeholder="Descreva a promessa do lançamento"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.promessa || 'Não informado'}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Tipo de Aulas</Label>
                  <p className="text-sm text-muted-foreground">
                    {lancamento.tipo_aulas === 'ao_vivo' ? 'Ao Vivo' : 'Gravadas'}
                  </p>
                </div>

                <div>
                  <Label>Cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    {lancamento.clientes?.nome || 'Não vinculado'}
                  </p>
                </div>

                <div>
                  <Label>Gestor Responsável</Label>
                  <p className="text-sm text-muted-foreground">
                    {lancamento.gestor?.nome || 'Não atribuído'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Métricas e Metas */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas e Metas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ticket do Produto</Label>
                  {editing ? (
                    <Input
                      type="number"
                      value={lancamento.ticket_produto || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        ticket_produto: e.target.value ? Number(e.target.value) : null
                      })}
                      placeholder="R$ 0,00"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.ticket_produto ? 
                        `R$ ${lancamento.ticket_produto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                        'Não informado'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <Label>Leads Desejados</Label>
                  {editing ? (
                    <Input
                      type="number"
                      value={lancamento.leads_desejados || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        leads_desejados: e.target.value ? Number(e.target.value) : null
                      })}
                      placeholder="Ex: 1000"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.leads_desejados || 'Não informado'}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Investimento Previsto</Label>
                  <p className="text-sm text-muted-foreground">
                    R$ {lancamento.investimento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <Label>Meta de Custo por Lead</Label>
                  {editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={lancamento.meta_custo_lead || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        meta_custo_lead: e.target.value ? Number(e.target.value) : null
                      })}
                      placeholder="R$ 0,00"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.meta_custo_lead ? 
                        `R$ ${lancamento.meta_custo_lead.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 
                        'Não informado'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <Label>Público-alvo</Label>
                  {editing ? (
                    <Textarea
                      value={lancamento.publico_alvo || ''}
                      onChange={(e) => setLancamento({
                        ...lancamento,
                        publico_alvo: e.target.value
                      })}
                      placeholder="Descreva o público-alvo"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {lancamento.publico_alvo || 'Não informado'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="verbas" className="space-y-6">
          {renderVerbas()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
