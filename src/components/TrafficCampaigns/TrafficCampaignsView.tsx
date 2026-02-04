import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Eye,
  Calendar,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { TrafficCampaign, PLATAFORMA_OPTIONS } from '@/types/traffic';
import {
  calculateMetrics,
  formatMetricValue,
  getPerformanceStatus,
} from '@/lib/trafficMetrics';
import PerformanceIndicator, { StatusDot } from './Metrics/PerformanceIndicator';
import NovoTrafficCampaignModal from './NovoTrafficCampaignModal';

export default function TrafficCampaignsView() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<TrafficCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [plataformaFilter, setPlataformaFilter] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('traffic_campaigns')
        .select(`
          *,
          cliente:clientes(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data as TrafficCampaign[]) || []);
    } catch (error: any) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesSearch =
        campaign.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPlataforma =
        plataformaFilter === 'all' || campaign.plataforma === plataformaFilter;

      return matchesSearch && matchesPlataforma;
    });
  }, [campaigns, searchTerm, plataformaFilter]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const totalInvestimento = campaigns.reduce((sum, c) => sum + (c.investimento || 0), 0);
    const totalReceita = campaigns.reduce((sum, c) => sum + (c.valor_total || 0), 0);
    const totalVendas = campaigns.reduce((sum, c) => sum + (c.vendas || 0), 0);
    const roi = totalInvestimento > 0 ? ((totalReceita - totalInvestimento) / totalInvestimento) * 100 : 0;

    return {
      totalCampaigns: campaigns.length,
      totalInvestimento,
      totalReceita,
      totalVendas,
      roi,
    };
  }, [campaigns]);

  const getCampaignMetrics = (campaign: TrafficCampaign) => {
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
  };

  const getPlataformaLabel = (value: string) => {
    return PLATAFORMA_OPTIONS.find((p) => p.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Campanhas de Trafego
          </h1>
          <p className="text-muted-foreground">
            Gerencie e analise o funil de vendas das suas campanhas
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Campanhas</span>
            </div>
            <p className="text-2xl font-bold">{aggregateStats.totalCampaigns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Investimento Total</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatMetricValue(aggregateStats.totalInvestimento, 'currency')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Receita Total</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatMetricValue(aggregateStats.totalReceita, 'currency')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Vendas Totais</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{aggregateStats.totalVendas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">ROI Geral</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {formatMetricValue(aggregateStats.roi, 'percentage')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={plataformaFilter} onValueChange={setPlataformaFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Plataformas</SelectItem>
                {PLATAFORMA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadCampaigns} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas ({filteredCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma campanha encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira campanha para comecar a analisar o funil de vendas
              </p>
              <Button onClick={() => setShowNewModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Campanha
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const metrics = getCampaignMetrics(campaign);
                    const roiStatus = getPerformanceStatus('roi', metrics.roi);

                    return (
                      <TableRow
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/traffic/${campaign.id}`)}
                      >
                        <TableCell className="font-medium">{campaign.nome}</TableCell>
                        <TableCell>{campaign.cliente?.nome || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPlataformaLabel(campaign.plataforma)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(campaign.periodo_inicio).toLocaleDateString('pt-BR')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatMetricValue(metrics.investimento, 'currency')}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatMetricValue(metrics.valorTotal, 'currency')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <StatusDot status={roiStatus} />
                            {formatMetricValue(metrics.roi, 'percentage')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMetricValue(metrics.ctr, 'percentage')}
                        </TableCell>
                        <TableCell>
                          <PerformanceIndicator status={roiStatus} size="sm" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/traffic/${campaign.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Campaign Modal */}
      <NovoTrafficCampaignModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={loadCampaigns}
      />
    </div>
  );
}
