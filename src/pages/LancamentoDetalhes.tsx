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
import { Calendar, CalendarClock, ArrowLeft, Save, Edit, Download, BarChart3, Calculator, Share2, Copy, Eye, EyeOff, ExternalLink, Clock, Info, Target, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from 'xlsx';
import GanttChartAvancado from "@/components/Lancamentos/GanttChartAvancado";
import LinksUteis from "@/components/Lancamentos/LinksUteis";
import DashboardField from "@/components/Lancamentos/DashboardField";
import VerbaDestaque from "@/components/Lancamentos/VerbaDestaque";
import TimerCPL from "@/components/Lancamentos/TimerCPL";
import InformacoesBasicas from "@/components/Lancamentos/InformacoesBasicas";
import { DiarioBordo } from "@/components/Clientes/DiarioBordo";
interface VerbaFase {
  captacao: {
    percentual: number;
    dias: number;
  };
  evento: {
    percentual: number;
    dias: number;
  };
  lembrete: {
    percentual: number;
    dias: number;
  };
  aquecimento: {
    percentual: number;
    dias: number;
  };
  impulsionar: {
    percentual: number;
    dias: number;
  };
  venda: {
    percentual: number;
    dias: number;
  };
}
interface DistribuicaoCanais {
  meta_ads: {
    percentual: number;
  };
  google_ads: {
    percentual: number;
  };
  outras_fontes: {
    percentual: number;
  };
}
interface Lancamento {
  id: string;
  nome_lancamento: string;
  promessa: string | null;
  status_lancamento: string;
  tipo_lancamento: string;
  data_inicio_captacao: string;
  data_fim_captacao: string | null;
  data_inicio_aquecimento: string | null;
  data_fim_aquecimento: string | null;
  data_inicio_cpl: string | null;
  data_fim_cpl: string | null;
  data_inicio_lembrete: string | null;
  data_fim_lembrete: string | null;
  data_inicio_carrinho: string | null;
  data_fim_carrinho: string | null;
  data_fechamento: string | null;
  ticket_produto: number | null;
  tipo_aulas: string;
  leads_desejados: number | null;
  investimento_total: number;
  publico_alvo: string | null;
  meta_custo_lead: number | null;
  meta_investimento: number | null;
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
  link_dashboard: string | null;
  resultado_obtido: number | null;
  link_publico: string | null;
  link_publico_ativo: boolean;
  checklist_configuracao?: any;
  clientes?: {
    nome: string;
    primary_gestor_user_id?: string;
  } | null;
  gestor?: {
    id: string;
    nome: string;
  } | null;
  primary_gestor?: {
    primary_gestor?: {
      id: string;
      nome: string;
    } | null;
  }[] | null;
}
export default function LancamentoDetalhes() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [lancamento, setLancamento] = useState<Lancamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'calendario' | 'informacoes' | 'verbas' | 'checklist'>('calendario');
  const [ganttView, setGanttView] = useState(false);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [catalogoUrl, setCatalogoUrl] = useState<string | null>(null);

  const handleTogglePublicLink = async () => {
    if (!lancamento) return;

    try {
      if (!lancamento.link_publico_ativo) {
        // Gerar slug único
        const baseSlug = lancamento.nome_lancamento
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 50);

        const randomId = Math.random().toString(36).substring(2, 8);
        const slug = `${baseSlug}-${randomId}`;

        const { error } = await supabase
          .from('lancamentos')
          .update({
            link_publico: slug,
            link_publico_ativo: true
          })
          .eq('id', lancamento.id);

        if (error) throw error;

        const publicUrl = `${window.location.origin}/lancamento/${slug}`;
        await navigator.clipboard.writeText(publicUrl);

        setLancamento(prev => prev ? {
          ...prev,
          link_publico: slug,
          link_publico_ativo: true
        } : null);

        toast.success('Link público ativado e copiado!');
      } else {
        const { error } = await supabase
          .from('lancamentos')
          .update({ link_publico_ativo: false })
          .eq('id', lancamento.id);

        if (error) throw error;

        setLancamento(prev => prev ? {
          ...prev,
          link_publico_ativo: false
        } : null);

        toast.success('Link público desativado');
      }
    } catch (error: any) {
      toast.error('Erro ao gerenciar link: ' + error.message);
    }
  };

  const handleCopyPublicLink = async () => {
    if (!lancamento?.link_publico) return;

    try {
      const publicUrl = `${window.location.origin}/lancamento/${lancamento.link_publico}`;
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link copiado!');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };
  const handleUpdateDates = async (campo: string, valor: string) => {
    if (!lancamento) return;
    try {
      setSaving(true);
      const {
        error
      } = await supabase.from('lancamentos').update({
        [campo]: valor
      }).eq('id', lancamento.id);
      if (error) throw error;
      setLancamento(prev => prev ? {
        ...prev,
        [campo]: valor
      } : null);
      toast.success('Data atualizada com sucesso');

      // Recalcular verbas automaticamente quando datas mudarem
      await recalcularVerbas();
    } catch (error: any) {
      toast.error('Erro ao atualizar data: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  const recalcularVerbas = async () => {
    if (!lancamento) return;

    // Aqui você pode implementar lógica para recalcular automaticamente
    // as verbas baseado nas novas datas
    console.log('Recalculando verbas...');
  };
  const handleClientChange = async (clienteId: string) => {
    if (!clienteId || !lancamento) return;
    try {
      // Buscar informações do cliente incluindo gestor vinculado
      const {
        data: clienteData,
        error: clienteError
      } = await supabase.from('clientes').select(`
          id,
          nome,
          traffic_manager_id,
          primary_gestor_user_id
        `).eq('id', clienteId).single();
      if (clienteError) throw clienteError;

      // Determinar o gestor_responsavel_id
      let gestorId: string | null = (clienteData as any)?.traffic_manager_id || null;

      // Se não houver traffic_manager_id, tentar via primary_gestor_user_id
      if (!gestorId && (clienteData as any)?.primary_gestor_user_id) {
        const {
          data: gestorByUser
        } = await supabase.from('colaboradores').select('id').eq('user_id', (clienteData as any).primary_gestor_user_id).maybeSingle();
        gestorId = gestorByUser?.id || null;
      }

      // Se ainda não encontrou, buscar em client_roles (gestor primário)
      if (!gestorId) {
        const {
          data: primaryRole
        } = await supabase.from('client_roles').select('user_id').eq('client_id', clienteId).eq('role', 'gestor').eq('is_primary', true).maybeSingle();
        if (primaryRole?.user_id) {
          const {
            data: gestorByRole
          } = await supabase.from('colaboradores').select('id').eq('user_id', primaryRole.user_id).maybeSingle();
          gestorId = gestorByRole?.id || null;
        }
      }

      // Preparar updates
      const updates: any = {
        cliente_id: clienteId
      };
      if (gestorId) updates.gestor_responsavel_id = gestorId;
      const {
        error: updateError
      } = await supabase.from('lancamentos').update(updates).eq('id', lancamento.id);
      if (updateError) throw updateError;

      // Carregar dados do gestor para exibir nome (opcional)
      let gestorData: {
        id: string;
        nome: string;
      } | null = null;
      if (gestorId) {
        const {
          data: gestor
        } = await supabase.from('colaboradores').select('id, nome').eq('id', gestorId).maybeSingle();
        gestorData = gestor || null;
      }
      setLancamento(prev => prev ? {
        ...prev,
        cliente_id: clienteId,
        gestor_responsavel_id: gestorId || prev.gestor_responsavel_id,
        clientes: {
          nome: (clienteData as any).nome,
          primary_gestor_user_id: (clienteData as any).primary_gestor_user_id
        },
        gestor: gestorData || prev.gestor
      } : null);
      toast.success('Cliente atualizado e gestor vinculado automaticamente');
    } catch (error: any) {
      toast.error('Erro ao atualizar cliente: ' + error.message);
    }
  };
  const loadAvailableClients = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      setAvailableClients(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
    }
  };
  useEffect(() => {
    loadAvailableClients();
  }, []);

  useEffect(() => {
    const fetchCatalogoUrl = async () => {
      if (lancamento?.cliente_id) {
        const { data } = await supabase
          .from('clientes')
          .select('catalogo_criativos_url')
          .eq('id', lancamento.cliente_id)
          .single();
        setCatalogoUrl(data?.catalogo_criativos_url || null);
      } else {
        setCatalogoUrl(null);
      }
    };
    fetchCatalogoUrl();
  }, [lancamento?.cliente_id]);

  useEffect(() => {
    fetchLancamento();
  }, [id]);
  const fetchLancamento = async () => {
    if (!id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('lancamentos').select(`
          *,
          clientes:cliente_id(nome, primary_gestor_user_id),
          gestor:gestor_responsavel_id(id, nome),
          primary_gestor:clientes(primary_gestor:primary_gestor_user_id(id, nome))
        `).eq('id', id).maybeSingle();
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
      const {
        error
      } = await supabase.from('lancamentos').update({
        nome_lancamento: lancamento.nome_lancamento,
        promessa: lancamento.promessa,
        ticket_produto: lancamento.ticket_produto,
        leads_desejados: lancamento.leads_desejados,
        publico_alvo: lancamento.publico_alvo,
        meta_custo_lead: lancamento.meta_custo_lead,
        observacoes: lancamento.observacoes,
        data_inicio_captacao: lancamento.data_inicio_captacao,
        data_fim_captacao: lancamento.data_fim_captacao,
        data_inicio_aquecimento: lancamento.data_inicio_aquecimento,
        data_fim_aquecimento: lancamento.data_fim_aquecimento,
        data_inicio_cpl: lancamento.data_inicio_cpl,
        data_fim_cpl: lancamento.data_fim_cpl,
        data_inicio_lembrete: lancamento.data_inicio_lembrete,
        data_fim_lembrete: lancamento.data_fim_lembrete,
        data_inicio_carrinho: lancamento.data_inicio_carrinho,
        data_fim_carrinho: lancamento.data_fim_carrinho,
        data_fechamento: lancamento.data_fechamento,
        verba_por_fase: lancamento.verba_por_fase,
        distribuicao_canais: lancamento.distribuicao_canais,
        observacoes_verbas: lancamento.observacoes_verbas,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      toast.success('Lançamento salvo com sucesso');
      setEditing(false);
      setEditingTab(null);
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
    return format(new Date(date), 'dd/MM/yyyy', {
      locale: ptBR
    });
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
      captacao: {
        percentual: 40,
        dias: 0
      },
      evento: {
        percentual: 30,
        dias: 0
      },
      lembrete: {
        percentual: 10,
        dias: 0
      },
      aquecimento: {
        percentual: 10,
        dias: 0
      },
      impulsionar: {
        percentual: 5,
        dias: 0
      },
      venda: {
        percentual: 5,
        dias: 0
      }
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
    const canais = lancamento.distribuicao_canais || {
      meta_ads: {
        percentual: 70
      },
      google_ads: {
        percentual: 20
      },
      outras_fontes: {
        percentual: 10
      }
    };

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
    const events = [{
      label: 'Início Captação',
      date: lancamento?.data_inicio_captacao,
      color: 'bg-blue-500'
    }, {
      label: 'Fim Captação',
      date: lancamento?.data_fim_captacao,
      color: 'bg-blue-300'
    }, {
      label: 'Início CPL',
      date: lancamento?.data_inicio_cpl,
      color: 'bg-yellow-500'
    }, {
      label: 'Fim CPL',
      date: lancamento?.data_fim_cpl,
      color: 'bg-yellow-300'
    }, {
      label: 'Início Carrinho',
      date: lancamento?.data_inicio_carrinho,
      color: 'bg-orange-500'
    }, {
      label: 'Fim Carrinho',
      date: lancamento?.data_fim_carrinho,
      color: 'bg-orange-300'
    }, {
      label: 'Fechamento',
      date: lancamento?.data_fechamento,
      color: 'bg-green-500'
    }].filter(event => event.date);
    if (ganttView) {
      return <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Visualização Gantt</h3>
          <Button variant="outline" size="sm" onClick={() => setGanttView(false)}>
            Ver Calendário
          </Button>
        </div>
        <div className="space-y-3">
          {events.map((event, index) => <div key={index} className="flex items-center gap-4">
            <div className="w-32 text-sm font-medium">{event.label}</div>
            <div className="flex-1 relative h-8 bg-gray-100 rounded">
              <div className={`absolute left-0 top-0 h-full rounded ${event.color} flex items-center px-2 text-white text-xs`} style={{
                width: '80%'
              }}>
                {formatDate(event.date!)}
              </div>
            </div>
          </div>)}
        </div>
      </div>;
    }
    return <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Cronograma</h3>
        <Button variant="outline" size="sm" onClick={() => setGanttView(true)}>
          Ver Gantt
        </Button>
      </div>
      <div className="space-y-3">
        {events.map((event, index) => <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className={`w-3 h-3 rounded-full ${event.color}`}></div>
          <div>
            <p className="font-medium">{event.label}</p>
            <p className="text-sm text-muted-foreground">{formatDate(event.date!)}</p>
          </div>
        </div>)}
      </div>
    </div>;
  };
  const renderVerbas = () => {
    if (!lancamento) return null;
    const verbas = atualizarVerbaPorFase();
    const canais = lancamento.distribuicao_canais || {
      meta_ads: {
        percentual: 70
      },
      google_ads: {
        percentual: 20
      },
      outras_fontes: {
        percentual: 10
      }
    };
    const totalPercentualVerbas = Number(Object.values(verbas as any).reduce((sum: number, fase: any) => sum + (fase?.percentual || 0), 0));
    const totalPercentualCanais = Number(Object.values(canais as any).reduce((sum: number, canal: any) => sum + (canal?.percentual || 0), 0));
    return <div className="space-y-6">
      {/* Header com botões */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Cálculo de Verbas</h3>
        <Button onClick={exportarVerbas} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Alerta de validação */}
      {totalPercentualVerbas > 100 && <Card className="border-destructive bg-destructive/10">
        <CardContent className="p-4">
          <p className="text-sm text-destructive font-medium">
            ⚠️ Atenção: A soma das porcentagens de verbas está acima de 100% (Total: {totalPercentualVerbas.toFixed(1)}%)
          </p>
        </CardContent>
      </Card>}

      {totalPercentualCanais > 100 && <Card className="border-destructive bg-destructive/10">
        <CardContent className="p-4">
          <p className="text-sm text-destructive font-medium">
            ⚠️ Atenção: A soma das porcentagens de canais está acima de 100% (Total: {totalPercentualCanais.toFixed(1)}%)
          </p>
        </CardContent>
      </Card>}

      {/* Tabela de Verbas por Fase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Distribuição por Fase
            <Badge variant={totalPercentualVerbas === 100 ? "default" : totalPercentualVerbas > 100 ? "destructive" : "secondary"}>
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
                return <TableRow key={fase}>
                  <TableCell className="font-medium">
                    {fase.charAt(0).toUpperCase() + fase.slice(1)}
                  </TableCell>
                  <TableCell>
                    {editingTab === 'verbas' ? <div className="flex items-center gap-2">
                      <Input type="number" value={percentual} onChange={e => {
                        const novasVerbas = {
                          ...(verbas as any)
                        };
                        if (novasVerbas[fase]) {
                          novasVerbas[fase].percentual = Number(e.target.value);
                        }
                        setLancamento({
                          ...lancamento,
                          verba_por_fase: novasVerbas
                        });
                      }} className="w-20" />
                      <div className="h-2 rounded-full" style={{
                        width: '60px',
                        background: `linear-gradient(90deg, ${fase === 'captacao' ? '#2563EB' : fase === 'aquecimento' ? '#7C3AED' : fase === 'evento' ? '#10B981' : fase === 'lembrete' ? '#F59E0B' : fase === 'impulsionar' ? '#EF4444' : '#8B5CF6'} ${percentual}%, #E5E7EB ${percentual}%)`
                      }} />
                    </div> : <div className="flex items-center gap-2">
                      <span>{percentual}%</span>
                      <div className="h-2 rounded-full" style={{
                        width: '60px',
                        background: `linear-gradient(90deg, ${fase === 'captacao' ? '#2563EB' : fase === 'aquecimento' ? '#7C3AED' : fase === 'evento' ? '#10B981' : fase === 'lembrete' ? '#F59E0B' : fase === 'impulsionar' ? '#EF4444' : '#8B5CF6'} ${percentual}%, #E5E7EB ${percentual}%)`
                      }} />
                    </div>}
                  </TableCell>
                  <TableCell>
                    R$ {investimentoTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell>
                    R$ {investimentoDiario.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell>{dias} dias</TableCell>
                </TableRow>;
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
                return <TableRow key={canal}>
                  <TableCell className="font-medium">
                    {canal.replace('_', ' ').toUpperCase()}
                  </TableCell>
                  <TableCell>
                    {editingTab === 'verbas' ? <div className="flex items-center gap-2">
                      <Input type="number" value={percentual} onChange={e => {
                        const novosCanais = {
                          ...(canais as any)
                        };
                        if (novosCanais[canal]) {
                          novosCanais[canal].percentual = Number(e.target.value);
                        }
                        setLancamento({
                          ...lancamento,
                          distribuicao_canais: novosCanais
                        });
                      }} className="w-20" />
                      <div className="h-2 rounded-full" style={{
                        width: '60px',
                        background: `linear-gradient(90deg, ${canal === 'meta_ads' ? '#1877F2' : canal === 'google_ads' ? '#4285F4' : '#8B5CF6'} ${percentual}%, #E5E7EB ${percentual}%)`
                      }} />
                    </div> : <div className="flex items-center gap-2">
                      <span>{percentual}%</span>
                      <div className="h-2 rounded-full" style={{
                        width: '60px',
                        background: `linear-gradient(90deg, ${canal === 'meta_ads' ? '#1877F2' : canal === 'google_ads' ? '#4285F4' : '#8B5CF6'} ${percentual}%, #E5E7EB ${percentual}%)`
                      }} />
                    </div>}
                  </TableCell>
                  <TableCell>
                    R$ {valorTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                  </TableCell>
                  <TableCell>
                    R$ {valorDiario.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                  </TableCell>
                </TableRow>;
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
          {editingTab === 'verbas' ? <Textarea value={lancamento.observacoes_verbas || ''} onChange={e => setLancamento({
            ...lancamento,
            observacoes_verbas: e.target.value
          })} placeholder="Adicione observações sobre a distribuição de verbas..." rows={4} /> : <p className="text-sm text-muted-foreground">
            {lancamento.observacoes_verbas || 'Nenhuma observação adicionada'}
          </p>}
        </CardContent>
      </Card>
    </div>;
  };
  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }
  if (!lancamento) {
    return <div className="text-center py-8">Lançamento não encontrado</div>;
  }
  return <div className="space-y-6 p-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/lancamentos')}>
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
              R$ {lancamento.investimento_total.toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {lancamento.link_publico_ativo && lancamento.link_publico && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPublicLink}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copiar Link
          </Button>
        )}

        <Button
          variant={lancamento.link_publico_ativo ? "secondary" : "outline"}
          size="sm"
          onClick={handleTogglePublicLink}
          className="flex items-center gap-2"
        >
          {lancamento.link_publico_ativo ? (
            <>
              <Eye className="h-4 w-4" />
              Público
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Compartilhar
            </>
          )}
        </Button>

        {(activeView === 'informacoes' || activeView === 'verbas') && (
          <>
            {editingTab === activeView ? <>
              <Button variant="outline" onClick={() => {
                setEditingTab(null);
                setEditing(false);
                fetchLancamento();
              }} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={async () => {
                await handleSave();
                setEditingTab(null);
                setEditing(false);
              }} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </> : <Button onClick={() => {
              setEditingTab(activeView);
              setEditing(true);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              {activeView === 'verbas' ? 'Editar Verbas' : 'Editar Informações'}
            </Button>}
          </>
        )}
      </div>
    </div>

    {/* Conteúdo */}
    {/* Pontos de Atenção */}
    {(() => {
      const alerts = [];
      if (!lancamento.data_inicio_captacao) alerts.push('Data de início da captação não definida');

      const checklist = lancamento.checklist_configuracao || {};
      const hasUncheckedItems = Object.values(checklist).some(val => val === false);
      const topLevelKeys = ['checklist_criativos'];
      const isMissingKeys = topLevelKeys.some(key => !checklist[key]);

      if (hasUncheckedItems || isMissingKeys) {
        alerts.push('Existem itens pendentes no checklist de configuração');
      }

      if (alerts.length > 0) {
        return (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">Pontos de Atenção</h3>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {alerts.map((alert, idx) => (
                    <li key={idx} className="text-sm text-orange-800 dark:text-orange-200">
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      }
      return null;
    })()}

    <Tabs value={activeView} onValueChange={value => setActiveView(value as any)}>
      <TabsList>
        <TabsTrigger value="calendario" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Visão geral
        </TabsTrigger>
        <TabsTrigger value="informacoes" className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Informações
        </TabsTrigger>
        <TabsTrigger value="verbas" className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Verbas
        </TabsTrigger>
        <TabsTrigger value="checklist" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Checklist
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calendario" className="space-y-6">
        {/* 1. Verba em Destaque + Timer CPL + Links Úteis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VerbaDestaque investimentoTotal={lancamento.investimento_total} metaInvestimento={lancamento.meta_investimento} verbasPorFase={lancamento.verba_por_fase || {}} />
          <TimerCPL dataInicioCaptacao={lancamento.data_inicio_captacao} dataFimCaptacao={lancamento.data_fim_captacao} dataInicioAquecimento={lancamento.data_inicio_aquecimento} dataInicioCPL={lancamento.data_inicio_cpl} dataInicioCarrinho={lancamento.data_inicio_carrinho} dataFechamento={lancamento.data_fechamento} />
          <LinksUteis lancamentoId={lancamento.id} />
        </div>

        {/* 2. Informações Básicas + Diário de Bordo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InformacoesBasicas lancamento={lancamento} />
          {lancamento.cliente_id && (
            <DiarioBordo clienteId={lancamento.cliente_id} lancamentoId={lancamento.id} />
          )}
        </div>

        {/* 3. Cronograma */}
        <div className="space-y-6">
          <GanttChartAvancado lancamento={lancamento} onUpdateDates={handleUpdateDates} />

          <DashboardField value={lancamento.link_dashboard || ''} onSave={async url => {
            await supabase.from('lancamentos').update({
              link_dashboard: url
            }).eq('id', lancamento.id);
            setLancamento(prev => prev ? {
              ...prev,
              link_dashboard: url
            } : null);
          }} />
        </div>
      </TabsContent>


      <TabsContent value="informacoes" className="space-y-6">

        {/* Dados Gerais */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Info className="h-5 w-5" />
              Dados Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome do Lançamento</Label>
                {editingTab === 'informacoes' ? (
                  <Input
                    value={lancamento.nome_lancamento}
                    onChange={e => setLancamento({ ...lancamento, nome_lancamento: e.target.value })}
                    className="font-medium"
                  />
                ) : (
                  <p className="text-base font-medium">{lancamento.nome_lancamento}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cliente</Label>
                {editingTab === 'informacoes' ? (
                  <select
                    value={lancamento.cliente_id || ''}
                    onChange={e => {
                      if (e.target.value) {
                        handleClientChange(e.target.value);
                      } else {
                        setLancamento({ ...lancamento, cliente_id: null, clientes: null });
                      }
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Selecione um cliente</option>
                    {availableClients.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-base font-medium">{lancamento.clientes?.nome || 'Não vinculado'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                {editingTab === 'informacoes' ? (
                  <select
                    value={lancamento.status_lancamento}
                    onChange={e => setLancamento({ ...lancamento, status_lancamento: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="em_captacao">Em Captação</option>
                    <option value="em_cpl">Em CPL</option>
                    <option value="em_carrinho">Em Carrinho</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="pausado">Pausado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                ) : (
                  <Badge className={getStatusColor(lancamento.status_lancamento)}>
                    {lancamento.status_lancamento}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de Lançamento</Label>
                {editingTab === 'informacoes' ? (
                  <select
                    value={lancamento.tipo_lancamento}
                    onChange={e => setLancamento({ ...lancamento, tipo_lancamento: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="semente">Semente</option>
                    <option value="interno">Interno</option>
                    <option value="externo">Externo</option>
                    <option value="perpetuo">Perpétuo</option>
                    <option value="flash">Flash</option>
                    <option value="evento">Evento</option>
                    <option value="tradicional">Lançamento Tradicional</option>
                    <option value="captacao_simples">Captação simples</option>
                    <option value="outro">Outro</option>
                  </select>
                ) : (
                  <p className="text-base font-medium capitalize">{lancamento.tipo_lancamento}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de Aulas</Label>
                {editingTab === 'informacoes' ? (
                  <select
                    value={lancamento.tipo_aulas}
                    onChange={e => setLancamento({ ...lancamento, tipo_aulas: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="ao_vivo">Ao Vivo</option>
                    <option value="gravadas">Gravadas</option>
                  </select>
                ) : (
                  <p className="text-base font-medium">{lancamento.tipo_aulas === 'ao_vivo' ? 'Ao Vivo' : 'Gravadas'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gestor Responsável</Label>
                <p className="text-base font-medium">
                  {lancamento.gestor?.nome || lancamento.primary_gestor?.[0]?.primary_gestor?.nome || 'Não atribuído'}
                </p>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Promessa</Label>
                {editingTab === 'informacoes' ? (
                  <Textarea
                    value={lancamento.promessa || ''}
                    onChange={e => setLancamento({ ...lancamento, promessa: e.target.value })}
                    placeholder="Descreva a promessa do lançamento"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{lancamento.promessa || 'Não informado'}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observações</Label>
                {editingTab === 'informacoes' ? (
                  <Textarea
                    value={lancamento.observacoes || ''}
                    onChange={e => setLancamento({ ...lancamento, observacoes: e.target.value })}
                    placeholder="Adicione observações sobre o lançamento"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{lancamento.observacoes || 'Nenhuma observação'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datas do Lançamento */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
              <Calendar className="h-5 w-5" />
              Datas do Lançamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Captação */}
              <div className="border-l-4 border-blue-500 pl-4 space-y-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Captação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Início</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_inicio_captacao}
                        onChange={e => setLancamento({ ...lancamento, data_inicio_captacao: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_inicio_captacao ? format(parseISO(lancamento.data_inicio_captacao), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Fim</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_fim_captacao || ''}
                        onChange={e => setLancamento({ ...lancamento, data_fim_captacao: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_fim_captacao ? format(parseISO(lancamento.data_fim_captacao), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Aquecimento */}
              <div className="border-l-4 border-orange-500 pl-4 space-y-4">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Aquecimento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Início</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_inicio_aquecimento || ''}
                        onChange={e => setLancamento({ ...lancamento, data_inicio_aquecimento: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_inicio_aquecimento ? format(parseISO(lancamento.data_inicio_aquecimento), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Fim</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_fim_aquecimento || ''}
                        onChange={e => setLancamento({ ...lancamento, data_fim_aquecimento: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_fim_aquecimento ? format(parseISO(lancamento.data_fim_aquecimento), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* CPL / Aulas */}
              <div className="border-l-4 border-yellow-500 pl-4 space-y-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  CPL / Aulas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Início</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_inicio_cpl || ''}
                        onChange={e => setLancamento({ ...lancamento, data_inicio_cpl: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_inicio_cpl ? format(parseISO(lancamento.data_inicio_cpl), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Fim</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_fim_cpl || ''}
                        onChange={e => setLancamento({ ...lancamento, data_fim_cpl: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_fim_cpl ? format(parseISO(lancamento.data_fim_cpl), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lembrete */}
              <div className="border-l-4 border-indigo-500 pl-4 space-y-4">
                <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Lembrete
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Início</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_inicio_lembrete || ''}
                        onChange={e => setLancamento({ ...lancamento, data_inicio_lembrete: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_inicio_lembrete ? format(parseISO(lancamento.data_inicio_lembrete), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Fim</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_fim_lembrete || ''}
                        onChange={e => setLancamento({ ...lancamento, data_fim_lembrete: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_fim_lembrete ? format(parseISO(lancamento.data_fim_lembrete), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Carrinho / Vendas */}
              <div className="border-l-4 border-green-500 pl-4 space-y-4">
                <h4 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Carrinho / Vendas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Início</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_inicio_carrinho || ''}
                        onChange={e => setLancamento({ ...lancamento, data_inicio_carrinho: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_inicio_carrinho ? format(parseISO(lancamento.data_inicio_carrinho), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Data de Fim</Label>
                    {editingTab === 'informacoes' ? (
                      <Input
                        type="date"
                        value={lancamento.data_fim_carrinho || ''}
                        onChange={e => setLancamento({ ...lancamento, data_fim_carrinho: e.target.value })}
                      />
                    ) : (
                      <p className="font-medium">
                        {lancamento.data_fim_carrinho ? format(parseISO(lancamento.data_fim_carrinho), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fechamento */}
              <div className="border-l-4 border-red-500 pl-4 space-y-4">
                <h4 className="font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Fechamento
                </h4>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Data de Fechamento</Label>
                  {editingTab === 'informacoes' ? (
                    <Input
                      type="date"
                      value={lancamento.data_fechamento || ''}
                      onChange={e => setLancamento({ ...lancamento, data_fechamento: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">
                      {lancamento.data_fechamento ? format(parseISO(lancamento.data_fechamento), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas e Metas */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <Target className="h-5 w-5" />
              Métricas e Metas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ticket do Produto</Label>
                {editingTab === 'informacoes' ? (
                  <Input
                    type="number"
                    value={lancamento.ticket_produto || ''}
                    onChange={e => setLancamento({ ...lancamento, ticket_produto: e.target.value ? Number(e.target.value) : null })}
                    placeholder="R$ 0,00"
                  />
                ) : (
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {lancamento.ticket_produto ? `R$ ${lancamento.ticket_produto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Leads Desejados</Label>
                {editingTab === 'informacoes' ? (
                  <Input
                    type="number"
                    value={lancamento.leads_desejados || ''}
                    onChange={e => setLancamento({ ...lancamento, leads_desejados: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Ex: 1000"
                  />
                ) : (
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {lancamento.leads_desejados?.toLocaleString('pt-BR') || 'Não informado'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Investimento Previsto</Label>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  R$ {lancamento.investimento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta de CPL</Label>
                {editingTab === 'informacoes' ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={lancamento.meta_custo_lead || ''}
                    onChange={e => setLancamento({ ...lancamento, meta_custo_lead: e.target.value ? Number(e.target.value) : null })}
                    placeholder="R$ 0,00"
                  />
                ) : (
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    {lancamento.meta_custo_lead ? `R$ ${lancamento.meta_custo_lead.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Público-alvo</Label>
                {editingTab === 'informacoes' ? (
                  <Textarea
                    value={lancamento.publico_alvo || ''}
                    onChange={e => setLancamento({ ...lancamento, publico_alvo: e.target.value })}
                    placeholder="Descreva o público-alvo"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{lancamento.publico_alvo || 'Não informado'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </TabsContent>

      <TabsContent value="verbas" className="space-y-6">
        {renderVerbas()}
      </TabsContent>

      <TabsContent value="checklist" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Checklist de Configuração</CardTitle>
            <p className="text-sm text-muted-foreground">
              Marque os itens conforme forem sendo concluídos
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'pixel_api', label: 'Configurar Pixel e API', description: 'Configurar pixels de rastreamento e integrações de API' },
                { key: 'pagina_obrigado', label: 'Testar página de obrigado', description: 'Verificar se a página de agradecimento está funcionando corretamente' },
                { key: 'planilha_leads', label: 'Criar planilha de leads UTM', description: 'Configurar planilha para rastreamento de leads com parâmetros UTM' },
                { key: 'planilha_vendas', label: 'Criar planilha de vendas', description: 'Configurar planilha para controle de vendas' },
                { key: 'pesquisa', label: 'Criar pesquisa para o lançamento', description: 'Criar formulário de pesquisa para coletar feedback' },
                { key: 'email_boas_vindas', label: 'Conferir email de boas-vindas', description: 'Revisar e testar email automático de boas-vindas' },
                { key: 'cpl_aulas', label: 'Conferir CPL das aulas', description: 'Verificar e validar o custo por lead de cada aula do lançamento' },
                { key: 'etapas_lancamento', label: 'Conferir quais etapas do lançamento terá', description: 'Definir se terá Aquecimento, Lembrete e Remarketing' },
                { key: 'checklist_criativos', label: 'Enviar pro cliente Checklist de criativos', description: 'Compartilhar o checklist de criativos com o cliente' },
                { key: 'utms_organicas', label: 'Criar UTMs orgânicas para o lançamento', description: 'Configurar UTMs para rastreamento de tráfego orgânico' }
              ].map((item) => {
                const checklist = (lancamento.checklist_configuracao || {}) as Record<string, boolean>;
                const isChecked = checklist[item.key] || false;

                return (
                  <div key={item.key} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      id={item.key}
                      checked={isChecked}
                      onChange={async (e) => {
                        const checked = e.target.checked;

                        try {
                          // Atualizar estado localmente primeiro
                          const newChecklist = {
                            ...(checklist || {}),
                            [item.key]: checked
                          };

                          setLancamento(prev => prev ? {
                            ...prev,
                            checklist_configuracao: newChecklist
                          } : null);

                          // Fazer update no banco
                          const { error } = await supabase
                            .from('lancamentos')
                            .update({
                              checklist_configuracao: newChecklist,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', lancamento.id)
                            .select()
                            .single();

                          if (error) {
                            console.error('Erro ao atualizar checklist:', error);
                            // Reverter estado local em caso de erro
                            setLancamento(prev => prev ? {
                              ...prev,
                              checklist_configuracao: checklist
                            } : null);
                            toast.error('Erro ao atualizar checklist');
                            return;
                          }

                          toast.success(checked ? 'Item marcado como concluído' : 'Item desmarcado');
                        } catch (err) {
                          console.error('Erro inesperado:', err);
                          // Reverter estado local em caso de erro
                          setLancamento(prev => prev ? {
                            ...prev,
                            checklist_configuracao: checklist
                          } : null);
                          toast.error('Erro ao atualizar checklist');
                        }
                      }}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex-1">
                      <label htmlFor={item.key} className="font-medium cursor-pointer">
                        {item.label}
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progresso</span>
                <span className="text-sm text-muted-foreground">
                  {(() => {
                    const checklist = (lancamento.checklist_configuracao || {}) as Record<string, boolean>;
                    const completed = Object.values(checklist).filter(Boolean).length;
                    const total = 10;
                    return `${completed}/${total} concluídos`;
                  })()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(() => {
                      const checklist = (lancamento.checklist_configuracao || {}) as Record<string, boolean>;
                      const completed = Object.values(checklist).filter(Boolean).length;
                      return (completed / 10) * 100;
                    })()}%`
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>;
}