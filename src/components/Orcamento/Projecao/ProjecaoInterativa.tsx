import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Calculator,
  RefreshCw,
  Info,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  CheckCircle,
  Save,
  Loader2,
  History,
  Trash2,
  RotateCcw,
  Pencil,
  Check,
  X,
  Zap,
  UserPlus,
} from 'lucide-react';
import AdminBenchmarksModal from '@/components/Ferramentas/AdminBenchmarksModal';
import {
  formatMetricValue,
  getPerformanceStatus,
  getStatusBgClass,
} from '@/lib/trafficMetrics';

export interface ProjecaoData {
  investimento: number;
  cpm: number;
  ctr: number;
  loadingRate: number;
  checkoutRate: number;
  conversionRate: number;
  ticketMedio: number;
}

interface Benchmark {
  chave: string;
  valor: number;
  label: string;
  unidade: string;
  descricao: string;
}

interface ProjecaoHistorico {
  id: string;
  nome: string;
  investimento: number;
  vendas_projetadas: number;
  receita_projetada: number;
  roi_projetado: number;
  roas_projetado: number;
  cpa_projetado: number;
  cpm: number;
  ctr: number;
  loading_rate: number;
  checkout_rate: number;
  conversion_rate: number;
  ticket_medio: number;
  created_at: string;
}

interface ProjecaoInterativaProps {
  funilId?: string;
  funilNome?: string;
  clienteNome?: string;
  clienteId?: string;
  investimentoBase?: number;
  projecaoSalva?: ProjecaoData | null;
  onSave?: (projecao: ProjecaoData) => void;
}

const STAGE_ICONS = {
  impressoes: <Eye className="h-5 w-5" />,
  cliques: <MousePointer className="h-5 w-5" />,
  pageViews: <Target className="h-5 w-5" />,
  checkouts: <ShoppingCart className="h-5 w-5" />,
  vendas: <CheckCircle className="h-5 w-5" />,
  cadastros: <UserPlus className="h-5 w-5" />,
};

export default function ProjecaoInterativa({
  funilId,
  funilNome,
  clienteNome,
  clienteId,
  investimentoBase,
  projecaoSalva,
  onSave,
}: ProjecaoInterativaProps) {
  const [activeTab, setActiveTab] = useState<'vendas' | 'cadastros'>('vendas');
  const [saving, setSaving] = useState(false);
  const [nomeProjecao, setNomeProjecao] = useState('');
  const [historico, setHistorico] = useState<ProjecaoHistorico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [viewProjecao, setViewProjecao] = useState<ProjecaoHistorico | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const [projecao, setProjecao] = useState<ProjecaoData>(projecaoSalva || {
    investimento: investimentoBase || 5000,
    cpm: 15,
    ctr: 1.5,
    loadingRate: 85,
    checkoutRate: 30,
    conversionRate: 3,
    ticketMedio: 297,
  });
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark>>({});
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Carregar benchmarks do banco
  const loadBenchmarks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('benchmarks_funil')
        .select('*');

      if (error) throw error;

      if (data) {
        const benchmarksMap: Record<string, Benchmark> = {};
        data.forEach(b => {
          benchmarksMap[b.chave] = b;
        });
        setBenchmarks(benchmarksMap);

        // Se não houver projeção salva, inicializar com os benchmarks
        if (!projecaoSalva) {
          setProjecao({
            investimento: investimentoBase || 5000,
            cpm: benchmarksMap['cpm']?.valor || 15,
            ctr: benchmarksMap['ctr']?.valor || 1.5,
            loadingRate: benchmarksMap['loading_rate']?.valor || benchmarksMap['loadingRate']?.valor || 85,
            checkoutRate: benchmarksMap['checkout_rate']?.valor || benchmarksMap['checkoutRate']?.valor || 30,
            conversionRate: benchmarksMap['conversion_rate']?.valor || benchmarksMap['conversionRate']?.valor || 3,
            ticketMedio: 297,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar benchmarks:', error);
    } finally {
      setLoadingBenchmarks(false);
    }
  }, [projecaoSalva, investimentoBase]);

  // Checar se é admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.role === 'admin');
      }
    };
    checkAdmin();
    loadBenchmarks();
  }, [loadBenchmarks]);

  // Carregar histórico de projeções
  const loadHistorico = useCallback(async () => {
    if (!funilId) return;
    setLoadingHistorico(true);
    try {
      const { data, error } = await supabase
        .from('projecoes_funil')
        .select('*')
        .eq('orcamento_funil_id', funilId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
      console.error('Erro ao carregar historico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  }, [funilId]);

  useEffect(() => {
    loadHistorico();
  }, [loadHistorico]);

  // Calcular valores do funil com base nas métricas
  const funnelData = useMemo(() => {
    const { investimento, cpm, ctr, loadingRate, checkoutRate, conversionRate, ticketMedio } = projecao;

    const impressoes = cpm > 0 ? Math.round((investimento / cpm) * 1000) : 0;
    const cliques = Math.round(impressoes * (ctr / 100));
    const pageViews = Math.round(cliques * (loadingRate / 100));

    if (activeTab === 'cadastros') {
      const cadastros = Math.round(pageViews * (conversionRate / 100));
      const cpl = cadastros > 0 ? investimento / cadastros : 0;
      return {
        impressoes, cliques, pageViews, cadastros, cpl,
        checkouts: 0, vendas: 0, receita: 0, lucro: 0, roi: 0, roas: 0, cpa: 0
      };
    }

    const checkouts = Math.round(pageViews * (checkoutRate / 100));
    const vendas = Math.round(checkouts * (conversionRate / 100));
    const receita = vendas * ticketMedio;
    const lucro = receita - investimento;
    const roi = investimento > 0 ? ((receita - investimento) / investimento) * 100 : 0;
    const roas = investimento > 0 ? receita / investimento : 0;
    const cpa = vendas > 0 ? investimento / vendas : 0;

    return { impressoes, cliques, pageViews, checkouts, vendas, receita, lucro, roi, roas, cpa };
  }, [projecao, activeTab]);

  const handleMetricChange = useCallback((key: keyof ProjecaoData, value: number) => {
    setProjecao((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Iniciar edição manual de uma métrica
  const startEditingMetric = useCallback((metricKey: string, currentValue: number) => {
    setEditingMetric(metricKey);
    setEditValue(currentValue.toString());
  }, []);

  // Confirmar edição manual
  const confirmEditMetric = useCallback((metricKey: keyof ProjecaoData, min: number, max: number) => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue)) {
      // Limitar ao range permitido
      const clampedValue = Math.min(Math.max(numValue, min), max);
      handleMetricChange(metricKey, clampedValue);
    }
    setEditingMetric(null);
    setEditValue('');
  }, [editValue, handleMetricChange]);

  // Cancelar edição manual
  const cancelEditMetric = useCallback(() => {
    setEditingMetric(null);
    setEditValue('');
  }, []);

  const resetToMarket = useCallback(() => {
    setProjecao({
      investimento: investimentoBase || 5000,
      cpm: benchmarks['cpm']?.valor || 15,
      ctr: benchmarks['ctr']?.valor || 1.5,
      loadingRate: benchmarks['loading_rate']?.valor || benchmarks['loadingRate']?.valor || 85,
      checkoutRate: benchmarks['checkout_rate']?.valor || benchmarks['checkoutRate']?.valor || 30,
      conversionRate: benchmarks['conversion_rate']?.valor || benchmarks['conversionRate']?.valor || 3,
      ticketMedio: 297,
    });
  }, [investimentoBase, benchmarks]);

  const handleSave = async () => {
    if (!nomeProjecao.trim()) {
      toast.error('Digite um nome para a projecao');
      return;
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const saveData: any = {
        nome: nomeProjecao.trim(),
        investimento: projecao.investimento,
        cpm: projecao.cpm,
        ctr: projecao.ctr,
        loading_rate: projecao.loadingRate,
        checkout_rate: projecao.checkoutRate,
        conversion_rate: projecao.conversionRate,
        ticket_medio: projecao.ticketMedio,
        impressoes_projetadas: funnelData.impressoes,
        cliques_projetados: funnelData.cliques,
        vendas_projetadas: funnelData.vendas,
        receita_projetada: funnelData.receita,
        roi_projetado: funnelData.roi,
        roas_projetado: funnelData.roas,
        cpa_projetado: funnelData.cpa,
        updated_by: user.user?.id,
      };

      // Se tiver funil, incluir as IDs
      if (funilId) {
        saveData.orcamento_funil_id = funilId;
        saveData.cliente_id = clienteId;
      }

      const { error } = await supabase.from('projecoes_funil').insert(saveData);

      if (error) throw error;

      toast.success('Projecao salva com sucesso!');
      setNomeProjecao('');
      loadHistorico();
      onSave?.(projecao);
    } catch (error: any) {
      console.error('Erro ao salvar projecao:', error);
      toast.error('Erro ao salvar projecao: ' + (error.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProjecao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projecoes_funil')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Projecao excluida');
      loadHistorico();
    } catch (error: any) {
      console.error('Erro ao excluir projecao:', error);
      toast.error('Erro ao excluir projecao');
    }
  };

  const handleRestoreProjecao = (proj: ProjecaoHistorico) => {
    setProjecao({
      investimento: proj.investimento,
      cpm: proj.cpm,
      ctr: proj.ctr,
      loadingRate: proj.loading_rate,
      checkoutRate: proj.checkout_rate,
      conversionRate: proj.conversion_rate,
      ticketMedio: proj.ticket_medio,
    });
    toast.success('Projecao restaurada para edicao');
  };

  const getMetricStatus = (metric: string, value: number) => {
    const benchmark = benchmarks[metric === 'loadingRate' ? 'loading_rate' :
      metric === 'checkoutRate' ? 'checkout_rate' :
        metric === 'conversionRate' ? 'conversion_rate' :
          metric]?.valor;

    // Se não houver benchmark dinâmico, usa o padrão do helper
    if (benchmark === undefined) return getPerformanceStatus(metric, value);

    // A lógica de "bom", "regular" ou "ruim" depende da métrica
    // Para simplificar e manter consistência, vamos usar o benchmark dinâmico
    // se ele estiver disponível, adaptando a lógica do helper
    return getPerformanceStatus(metric, value);
  };

  const funnelStages = [
    { key: 'impressoes', label: 'Topo (Exposição)', value: funnelData.impressoes, color: '#3B82F6', toolTip: 'Pessoas atingidas pelos anúncios' },
    { key: 'cliques', label: 'Cliques (Interesse)', value: funnelData.cliques, color: '#8B5CF6', toolTip: 'Acesso ao site ou oferta' },
    { key: 'pageViews', label: 'Página (Leitura)', value: funnelData.pageViews, color: '#F59E0B', toolTip: 'Pessoas que carregaram o site' },
    ...(activeTab === 'cadastros'
      ? [{ key: 'cadastros', label: 'Cadastros (Leads)', value: funnelData.cadastros, color: '#10B981', toolTip: 'Pessoas que completaram o cadastro' }]
      : [
        { key: 'checkouts', label: 'Checkout (Intenção)', value: funnelData.checkouts, color: '#F97316', toolTip: 'Início do processo de compra' },
        { key: 'vendas', label: 'Vendas (Sucesso)', value: funnelData.vendas, color: '#10B981', toolTip: 'Pedidos confirmados e pagos' }
      ]
    ),
  ];

  // Usar cliques como escala maxima para melhor visualizacao do funil
  const maxValue = Math.max(funnelData.cliques, 1);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Projecao: {funilNome}
            </h2>
            <p className="text-sm text-muted-foreground">{clienteNome}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="Nome da projecao (ex: Cenario Otimista)"
              value={nomeProjecao}
              onChange={(e) => setNomeProjecao(e.target.value)}
              className="w-full sm:w-64"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetToMarket}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resetar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !nomeProjecao.trim()}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </div>

        <AdminBenchmarksModal
          open={showAdminModal}
          onOpenChange={setShowAdminModal}
          onSave={loadBenchmarks}
        />

        {/* Sub-abas Vendas / Cadastros */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'vendas' | 'cadastros')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="vendas" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="cadastros" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Cadastros
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Barra de Benchmarks de Mercado */}
        <Card className="bg-emerald-500 text-white overflow-hidden border-none shadow-lg">
          <CardContent className="p-4 sm:p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 fill-current animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Benchmarks de Mercado</h3>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20 ml-auto rounded-full"
                  onClick={() => setShowAdminModal(true)}
                  title="Editar metas de mercado"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className={`grid grid-cols-2 ${activeTab === 'cadastros' ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-3`}>
              <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-md border border-white/20 shadow-inner group transition-all hover:bg-white/30">
                <span className="text-[10px] font-bold opacity-90 uppercase block mb-1 tracking-tighter">CPM</span>
                <div className="text-xl font-extrabold drop-shadow-sm">
                  R${benchmarks['cpm']?.valor || 15}
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-md border border-white/20 shadow-inner group transition-all hover:bg-white/30">
                <span className="text-[10px] font-bold opacity-90 uppercase block mb-1 tracking-tighter">CTR</span>
                <div className="text-xl font-extrabold drop-shadow-sm">
                  {benchmarks['ctr']?.valor || 1.5}%
                </div>
              </div>
              <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-md border border-white/20 shadow-inner group transition-all hover:bg-white/30">
                <span className="text-[10px] font-bold opacity-90 uppercase block mb-1 tracking-tighter">Carregamento</span>
                <div className="text-xl font-extrabold drop-shadow-sm">
                  {benchmarks['loading_rate']?.valor || 85}%
                </div>
              </div>
              {activeTab === 'vendas' && (
                <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-md border border-white/20 shadow-inner group transition-all hover:bg-white/30">
                  <span className="text-[10px] font-bold opacity-90 uppercase block mb-1 tracking-tighter">Checkout</span>
                  <div className="text-xl font-extrabold drop-shadow-sm">
                    {benchmarks['checkout_rate']?.valor || 30}%
                  </div>
                </div>
              )}
              <div className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-md border border-white/20 shadow-inner group transition-all hover:bg-white/30">
                <span className="text-[10px] font-bold opacity-90 uppercase block mb-1 tracking-tighter">{activeTab === 'cadastros' ? 'Conversão' : 'Conversão'}</span>
                <div className="text-xl font-extrabold drop-shadow-sm">
                  {activeTab === 'cadastros' ? '50%' : `${benchmarks['conversion_rate']?.valor || 3}%`}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-center mt-3 opacity-80 font-medium italic">
              Valores ideais de referência para campanhas de tráfego pago
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel de Métricas Editáveis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metricas de Entrada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Investimento */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-500" />
                    Investimento
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Valor total planejado para investir em anúncios no período.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="text-sm font-bold text-red-600">
                    {formatMetricValue(projecao.investimento, 'currency')}
                  </span>
                </div>
                <Input
                  type="number"
                  value={projecao.investimento}
                  onChange={(e) => handleMetricChange('investimento', parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                />
              </div>

              {/* CPM */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">CPM</span>
                    <span className="text-[10px] text-muted-foreground font-normal leading-tight">
                      (Custo por Mil Impressões) — <span className="italic opacity-80">Cálculo: (Investimento / Impressões) * 1000</span>
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        <p className="font-bold">CPM</p>
                        <p className="text-xs">Quanto você paga para o seu anúncio aparecer 1000 vezes.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex items-center gap-2">
                    {editingMetric === 'cpm' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-7 text-sm"
                          step="0.5"
                          min={5}
                          max={50}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEditMetric('cpm', 5, 50);
                            if (e.key === 'Escape') cancelEditMetric();
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => confirmEditMetric('cpm', 5, 50)}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditMetric}>
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Badge className={getStatusBgClass(getMetricStatus('cpm', projecao.cpm))}>
                          {formatMetricValue(projecao.cpm, 'currency')}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => startEditingMetric('cpm', projecao.cpm)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Slider
                  value={[projecao.cpm]}
                  onValueChange={([value]) => handleMetricChange('cpm', value)}
                  min={5}
                  max={50}
                  step={0.5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>R$5</span>
                  <span className="text-emerald-600 font-semibold">Meta: R${benchmarks['cpm']?.valor || 15}</span>
                  <span>R$50</span>
                </div>
              </div>

              {/* CTR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 flex-wrap text-left">
                    <span className="font-bold">CTR</span>
                    <span className="text-[10px] text-muted-foreground font-normal leading-tight">
                      (Click-Through Rate) — <span className="italic opacity-80">Cálculo: (Cliques / Impressões) * 100</span>
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        <p>Mede a eficiência do criativo.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex items-center gap-2">
                    {editingMetric === 'ctr' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-7 text-sm"
                          step="0.1"
                          min={0.1}
                          max={5}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEditMetric('ctr', 0.1, 5);
                            if (e.key === 'Escape') cancelEditMetric();
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => confirmEditMetric('ctr', 0.1, 5)}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditMetric}>
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Badge className={getStatusBgClass(getMetricStatus('ctr', projecao.ctr))}>
                          {projecao.ctr.toFixed(2)}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => startEditingMetric('ctr', projecao.ctr)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Slider
                  value={[projecao.ctr]}
                  onValueChange={([value]) => handleMetricChange('ctr', value)}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.1%</span>
                  <span className="text-emerald-600 font-semibold">Meta: {benchmarks['ctr']?.valor || 1.5}%</span>
                  <span>5%</span>
                </div>
              </div>

              {/* Taxa Carregamento */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 flex-wrap text-left">
                    <span className="font-bold">Taxa Carregamento</span>
                    <span className="text-[10px] text-muted-foreground font-normal leading-tight">
                      (Landing Page) — <span className="italic opacity-80">Cálculo: (Page Views / Cliques) * 100</span>
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        <p>Visitantes que realmente carregaram a página.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex items-center gap-2">
                    {editingMetric === 'loadingRate' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-7 text-sm"
                          step="1"
                          min={50}
                          max={100}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEditMetric('loadingRate', 50, 100);
                            if (e.key === 'Escape') cancelEditMetric();
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => confirmEditMetric('loadingRate', 50, 100)}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditMetric}>
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Badge className={getStatusBgClass(getMetricStatus('loadingRate', projecao.loadingRate))}>
                          {projecao.loadingRate.toFixed(0)}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => startEditingMetric('loadingRate', projecao.loadingRate)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Slider
                  value={[projecao.loadingRate]}
                  onValueChange={([value]) => handleMetricChange('loadingRate', value)}
                  min={50}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50%</span>
                  <span className="text-emerald-600 font-semibold">Meta: {benchmarks['loading_rate']?.valor || benchmarks['loadingRate']?.valor || 85}%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Taxa Checkout - apenas no modo Vendas */}
              {activeTab === 'vendas' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 flex-wrap text-left">
                      <span className="font-bold">Taxa Checkout</span>
                      <span className="text-[10px] text-muted-foreground font-normal leading-tight">
                        (Intenção) — <span className="italic opacity-80">Cálculo: (Checkouts / Page Views) * 100</span>
                      </span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">
                          <p>Visitantes que iniciaram o checkout.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="flex items-center gap-2">
                      {editingMetric === 'checkoutRate' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 h-7 text-sm"
                            step="1"
                            min={5}
                            max={60}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmEditMetric('checkoutRate', 5, 60);
                              if (e.key === 'Escape') cancelEditMetric();
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => confirmEditMetric('checkoutRate', 5, 60)}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditMetric}>
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge className={getStatusBgClass(getMetricStatus('checkoutRate', projecao.checkoutRate))}>
                            {projecao.checkoutRate.toFixed(0)}%
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => startEditingMetric('checkoutRate', projecao.checkoutRate)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[projecao.checkoutRate]}
                    onValueChange={([value]) => handleMetricChange('checkoutRate', value)}
                    min={5}
                    max={60}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5%</span>
                    <span className="text-emerald-600 font-semibold">Meta: {benchmarks['checkout_rate']?.valor || benchmarks['checkoutRate']?.valor || 30}%</span>
                    <span>60%</span>
                  </div>
                </div>
              )}

              {/* Taxa Conversao */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 flex-wrap text-left">
                    <span className="font-bold">{activeTab === 'cadastros' ? 'Taxa Conversão' : 'Taxa Conversao'}</span>
                    <span className="text-[10px] text-muted-foreground font-normal leading-tight">
                      {activeTab === 'cadastros'
                        ? <>(Cadastros) — <span className="italic opacity-80">Cálculo: (Cadastros / Page Views) * 100</span></>
                        : <>(Vendas) — <span className="italic opacity-80">Cálculo: (Vendas / Checkouts) * 100</span></>
                      }
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        <p>{activeTab === 'cadastros'
                          ? 'Porcentagem de visitantes da página que completaram o cadastro.'
                          : 'Porcentagem final de checkouts que viraram vendas.'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex items-center gap-2">
                    {editingMetric === 'conversionRate' ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-7 text-sm"
                          step={activeTab === 'cadastros' ? '1' : '0.1'}
                          min={activeTab === 'cadastros' ? 5 : 0.5}
                          max={activeTab === 'cadastros' ? 100 : 10}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmEditMetric('conversionRate', activeTab === 'cadastros' ? 5 : 0.5, activeTab === 'cadastros' ? 100 : 10);
                            if (e.key === 'Escape') cancelEditMetric();
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => confirmEditMetric('conversionRate', activeTab === 'cadastros' ? 5 : 0.5, activeTab === 'cadastros' ? 100 : 10)}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditMetric}>
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Badge className={getStatusBgClass(getMetricStatus('conversionRate', projecao.conversionRate))}>
                          {projecao.conversionRate.toFixed(activeTab === 'cadastros' ? 0 : 2)}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => startEditingMetric('conversionRate', projecao.conversionRate)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Slider
                  value={[projecao.conversionRate]}
                  onValueChange={([value]) => handleMetricChange('conversionRate', value)}
                  min={activeTab === 'cadastros' ? 5 : 0.5}
                  max={activeTab === 'cadastros' ? 100 : 10}
                  step={activeTab === 'cadastros' ? 1 : 0.1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{activeTab === 'cadastros' ? '5%' : '0.5%'}</span>
                  <span className="text-emerald-600 font-semibold">Meta: {activeTab === 'cadastros' ? '50' : (benchmarks['conversion_rate']?.valor || benchmarks['conversionRate']?.valor || 3)}%</span>
                  <span>{activeTab === 'cadastros' ? '100%' : '10%'}</span>
                </div>
              </div>

              {/* Ticket Medio - apenas no modo Vendas */}
              {activeTab === 'vendas' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      Ticket Medio
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Valor médio de cada venda realizada no seu funil.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <span className="text-sm font-bold">
                      {formatMetricValue(projecao.ticketMedio, 'currency')}
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={projecao.ticketMedio}
                    onChange={(e) => handleMetricChange('ticketMedio', parseFloat(e.target.value) || 0)}
                    step="10"
                    min="0"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visualização do Funil */}
          <div className="space-y-4">
            {/* Funil Visual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funil Projetado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {funnelStages.map((stage, index) => {
                    const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
                    const prevStage = index > 0 ? funnelStages[index - 1] : null;
                    const conversionRate = prevStage && prevStage.value > 0
                      ? (stage.value / prevStage.value) * 100
                      : 100;

                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        {/* Label e icone lado esquerdo */}
                        <div className="w-28 flex items-center gap-2 justify-end text-right">
                          <span className="text-sm font-medium text-muted-foreground">{stage.label}</span>
                          <div
                            className="p-1.5 rounded shrink-0"
                            style={{ backgroundColor: stage.color + '20' }}
                          >
                            {STAGE_ICONS[stage.key as keyof typeof STAGE_ICONS]}
                          </div>
                        </div>

                        {/* Barra centralizada */}
                        <div className="flex-1 flex justify-center">
                          <div
                            className="h-11 rounded-lg transition-all duration-500 flex items-center justify-center shadow-sm"
                            style={{
                              width: `${Math.max(widthPercent, 8)}%`,
                              backgroundColor: stage.color,
                              minWidth: '60px',
                            }}
                          >
                            <span className="text-white text-sm font-bold">
                              {stage.value.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        {/* Taxa de conversao lado direito */}
                        <div className="w-20 text-left">
                          {index > 0 ? (
                            <div className="flex flex-col">
                              <Badge
                                variant="outline"
                                className={conversionRate >= 50 ? 'text-emerald-600 border-emerald-300' : conversionRate >= 20 ? 'text-amber-600 border-amber-300' : 'text-red-600 border-red-300'}
                              >
                                {conversionRate.toFixed(1)}%
                              </Badge>
                              <span className="text-[9px] font-medium opacity-70 mt-0.5 leading-none">
                                {stage.key === 'cliques' ? 'CTR/Cliques' :
                                  stage.key === 'pageViews' ? 'Carregamento' :
                                    stage.key === 'checkouts' ? 'Checkout' :
                                      stage.key === 'vendas' ? 'Conversão' :
                                        stage.key === 'cadastros' ? 'Conversão' : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Alcance Inicial</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Taxa de conversao total */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {activeTab === 'cadastros'
                        ? 'Taxa de Conversão Final (Cliques → Cadastros):'
                        : 'Taxa de Conversão Final (Cliques → Vendas):'}
                    </span>
                    <span className={`font-bold text-lg ${activeTab === 'cadastros'
                      ? (funnelData.cadastros > 0 ? 'text-emerald-600' : 'text-red-500')
                      : (funnelData.vendas > 0 ? 'text-emerald-600' : 'text-red-500')}`}>
                      {activeTab === 'cadastros'
                        ? (funnelData.cliques > 0 ? ((funnelData.cadastros / funnelData.cliques) * 100).toFixed(2) : 0)
                        : (funnelData.cliques > 0 ? ((funnelData.vendas / funnelData.cliques) * 100).toFixed(2) : 0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resultados Projetados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Resultados Projetados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTab === 'cadastros' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Investimento</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatMetricValue(projecao.investimento, 'currency')}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Cadastros Projetados</p>
                        <p className="text-xl font-bold text-emerald-600">{funnelData.cadastros}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 mt-4">
                      <div className="text-center p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <p className="text-xs text-muted-foreground">Custo por Lead (CPL)</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatMetricValue(funnelData.cpl, 'currency')}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Investimento</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatMetricValue(projecao.investimento, 'currency')}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Receita Projetada</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatMetricValue(funnelData.receita, 'currency')}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${funnelData.lucro >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                        <p className="text-xs text-muted-foreground">Lucro Projetado</p>
                        <p className={`text-xl font-bold ${funnelData.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatMetricValue(funnelData.lucro, 'currency')}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-xs text-muted-foreground">Vendas Projetadas</p>
                        <p className="text-xl font-bold text-purple-600">{funnelData.vendas}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="text-center p-2 border rounded-lg">
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className={`text-lg font-bold ${funnelData.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {funnelData.roi.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-2 border rounded-lg">
                        <p className="text-xs text-muted-foreground">ROAS</p>
                        <p className="text-lg font-bold text-blue-600">{funnelData.roas.toFixed(2)}x</p>
                      </div>
                      <div className="text-center p-2 border rounded-lg">
                        <p className="text-xs text-muted-foreground">CPA</p>
                        <p className="text-lg font-bold text-orange-600">
                          {formatMetricValue(funnelData.cpa, 'currency')}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Histórico de Projeções */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Historico de Projecoes
              {historico.length > 0 && (
                <Badge variant="secondary">{historico.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistorico ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nenhuma projecao salva ainda</p>
                <p className="text-sm">Salve uma projecao para criar um historico</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Invest.</TableHead>
                      <TableHead className="text-right">CPM</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Carreg.</TableHead>
                      <TableHead className="text-right">Checkout</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">Ticket</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-center">Data</TableHead>
                      <TableHead className="text-center">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historico.map((proj) => (
                      <TableRow key={proj.id}>
                        <TableCell className="font-medium">{proj.nome}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatMetricValue(proj.investimento, 'currency')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getStatusBgClass(getPerformanceStatus('cpm', proj.cpm))}>
                            R${proj.cpm.toFixed(0)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getStatusBgClass(getPerformanceStatus('ctr', proj.ctr))}>
                            {proj.ctr.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getStatusBgClass(getPerformanceStatus('loadingRate', proj.loading_rate))}>
                            {proj.loading_rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getStatusBgClass(getPerformanceStatus('checkoutRate', proj.checkout_rate))}>
                            {proj.checkout_rate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={getStatusBgClass(getPerformanceStatus('conversionRate', proj.conversion_rate))}>
                            {proj.conversion_rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMetricValue(proj.ticket_medio, 'currency')}
                        </TableCell>
                        <TableCell className="text-right font-bold">{proj.vendas_projetadas}</TableCell>
                        <TableCell className="text-right text-green-600 font-bold">
                          {formatMetricValue(proj.receita_projetada, 'currency')}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${proj.roi_projetado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {proj.roi_projetado.toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {new Date(proj.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:text-blue-600"
                                  onClick={() => setViewProjecao(proj)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visualizar funil</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleRestoreProjecao(proj)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Restaurar para edicao</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600"
                                  onClick={() => handleDeleteProjecao(proj.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir projecao</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Visualização do Funil */}
        <Dialog open={!!viewProjecao} onOpenChange={(open) => !open && setViewProjecao(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {viewProjecao?.nome}
              </DialogTitle>
            </DialogHeader>
            {viewProjecao && (() => {
              const impressoes = viewProjecao.cpm > 0 ? Math.round((viewProjecao.investimento / viewProjecao.cpm) * 1000) : 0;
              const cliques = Math.round(impressoes * (viewProjecao.ctr / 100));
              const pageViews = Math.round(cliques * (viewProjecao.loading_rate / 100));
              const checkouts = Math.round(pageViews * (viewProjecao.checkout_rate / 100));
              const vendas = viewProjecao.vendas_projetadas;
              const stages = [
                { key: 'impressoes', label: 'Impressoes', value: impressoes, color: '#3B82F6' },
                { key: 'cliques', label: 'Cliques', value: cliques, color: '#8B5CF6' },
                { key: 'pageViews', label: 'Visualizacoes', value: pageViews, color: '#F59E0B' },
                { key: 'checkouts', label: 'Checkouts', value: checkouts, color: '#F97316' },
                { key: 'vendas', label: 'Vendas', value: vendas, color: '#10B981' },
              ];
              // Usar cliques como escala maxima
              const maxVal = Math.max(cliques, 1);

              return (
                <div className="space-y-6 py-4">
                  {/* Funil Visual Centralizado */}
                  <div className="space-y-2">
                    {stages.map((stage, index) => {
                      const widthPercent = maxVal > 0 ? (stage.value / maxVal) * 100 : 0;
                      const prevStage = index > 0 ? stages[index - 1] : null;
                      const conversionRate = prevStage && prevStage.value > 0
                        ? (stage.value / prevStage.value) * 100
                        : 100;

                      return (
                        <div key={stage.key} className="flex items-center gap-3">
                          {/* Label lado esquerdo */}
                          <div className="w-24 text-right">
                            <span className="text-sm font-medium text-muted-foreground">{stage.label}</span>
                          </div>

                          {/* Barra centralizada */}
                          <div className="flex-1 flex justify-center">
                            <div
                              className="h-9 rounded-lg transition-all duration-500 flex items-center justify-center shadow-sm"
                              style={{
                                width: `${Math.max(widthPercent, 10)}%`,
                                backgroundColor: stage.color,
                                minWidth: '50px',
                              }}
                            >
                              <span className="text-white text-xs font-bold">
                                {stage.value.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          {/* Taxa de conversao lado direito */}
                          <div className="w-16 text-left">
                            {index > 0 ? (
                              <Badge
                                variant="outline"
                                className={conversionRate >= 50 ? 'text-emerald-600 border-emerald-300' : conversionRate >= 20 ? 'text-amber-600 border-amber-300' : 'text-red-600 border-red-300'}
                              >
                                {conversionRate.toFixed(0)}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Topo</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Investimento</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatMetricValue(viewProjecao.investimento, 'currency')}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatMetricValue(viewProjecao.receita_projetada, 'currency')}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${viewProjecao.roi_projetado >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <p className="text-xs text-muted-foreground">ROI</p>
                      <p className={`text-lg font-bold ${viewProjecao.roi_projetado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {viewProjecao.roi_projetado.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Métricas de Entrada */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="p-2 border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">CPM</p>
                      <Badge className={getStatusBgClass(getPerformanceStatus('cpm', viewProjecao.cpm))}>
                        R${viewProjecao.cpm.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="p-2 border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">CTR</p>
                      <Badge className={getStatusBgClass(getPerformanceStatus('ctr', viewProjecao.ctr))}>
                        {viewProjecao.ctr.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="p-2 border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Carregamento</p>
                      <Badge className={getStatusBgClass(getPerformanceStatus('loadingRate', viewProjecao.loading_rate))}>
                        {viewProjecao.loading_rate.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="p-2 border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Checkout</p>
                      <Badge className={getStatusBgClass(getPerformanceStatus('checkoutRate', viewProjecao.checkout_rate))}>
                        {viewProjecao.checkout_rate.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="p-2 border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Conversao</p>
                      <Badge className={getStatusBgClass(getPerformanceStatus('conversionRate', viewProjecao.conversion_rate))}>
                        {viewProjecao.conversion_rate.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="p-2 border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Ticket Medio</p>
                      <p className="font-bold">{formatMetricValue(viewProjecao.ticket_medio, 'currency')}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
