import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  RefreshCw,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  Target,
  Layers,
} from 'lucide-react';
import { TrafficCampaign, PLATAFORMA_OPTIONS } from '@/types/traffic';
import { calculateMetrics } from '@/lib/trafficMetrics';
import SalesFunnelChart from './Funnel/SalesFunnelChart';
import FunnelStageCard from './Funnel/FunnelStageCard';
import FunnelMetricsPanel from './Funnel/FunnelMetricsPanel';
import TrafficKPICards from './Metrics/TrafficKPICards';
import { FUNNEL_STAGES } from '@/lib/trafficMetrics';

export default function TrafficCampaignDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<TrafficCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCampaign();
    }
  }, [id]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('traffic_campaigns')
        .select(`
          *,
          cliente:clientes(id, nome)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCampaign(data as TrafficCampaign);
    } catch (error: any) {
      console.error('Erro ao carregar campanha:', error);
      toast.error('Erro ao carregar campanha');
      navigate('/traffic');
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    if (!campaign) return null;
    return calculateMetrics({
      investimento: campaign.investimento || 0,
      impressoes: campaign.impressoes || 0,
      cliques: campaign.cliques || 0,
      pageViews: campaign.page_views || 0,
      checkouts: campaign.checkouts || 0,
      vendas: campaign.vendas || 0,
      leads: campaign.leads || 0,
      valorTotal: campaign.valor_total || 0,
    });
  }, [campaign]);

  const getPlataformaLabel = (value: string) => {
    return PLATAFORMA_OPTIONS.find((p) => p.value === value)?.label || value;
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

    try {
      const { error } = await supabase.from('traffic_campaigns').delete().eq('id', id);
      if (error) throw error;
      toast.success('Campanha excluida com sucesso');
      navigate('/traffic');
    } catch (error: any) {
      console.error('Erro ao excluir campanha:', error);
      toast.error('Erro ao excluir campanha');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign || !metrics) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Campanha nao encontrada</h3>
        <Button onClick={() => navigate('/traffic')} className="mt-4">
          Voltar para Campanhas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/traffic')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.nome}</h1>
            <div className="flex items-center gap-3 mt-1 text-muted-foreground">
              {campaign.cliente?.nome && (
                <span className="text-sm">{campaign.cliente.nome}</span>
              )}
              <Badge variant="outline">{getPlataformaLabel(campaign.plataforma)}</Badge>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                {new Date(campaign.periodo_inicio).toLocaleDateString('pt-BR')} -{' '}
                {new Date(campaign.periodo_fim).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCampaign}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <TrafficKPICards metrics={metrics} />

      {/* Main Content */}
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Funil de Vendas
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metricas Detalhadas
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Etapas do Funil
          </TabsTrigger>
        </TabsList>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SalesFunnelChart
                metrics={metrics}
                onStageClick={(stageKey) => setSelectedStage(stageKey)}
              />
            </div>
            <div>
              <FunnelMetricsPanel metrics={metrics} />
            </div>
          </div>

          {/* Selected Stage Details */}
          {selectedStage && (
            <FunnelStageCard stageKey={selectedStage} metrics={metrics} />
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FunnelMetricsPanel metrics={metrics} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Resumo do Funil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Impressoes</span>
                    <span className="font-bold">{metrics.impressoes.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Cliques</span>
                    <span className="font-bold">{metrics.cliques.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Visualizacoes de Pagina</span>
                    <span className="font-bold">{metrics.pageViews.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Checkouts</span>
                    <span className="font-bold">{metrics.checkouts.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Vendas</span>
                    <span className="font-bold text-green-600">
                      {metrics.vendas.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Leads</span>
                    <span className="font-bold">{metrics.leads.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Ticket Medio</span>
                    <span className="font-bold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(metrics.ticketMedio)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FUNNEL_STAGES.map((stage) => (
              <FunnelStageCard key={stage.key} stageKey={stage.key} metrics={metrics} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
