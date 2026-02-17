
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { Loader2, TrendingUp, DollarSign, Users, MousePointerClick, Eye, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';

interface LancamentoResultadosTabProps {
    lancamento: any;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
};

export const LancamentoResultadosTab = ({ lancamento }: LancamentoResultadosTabProps) => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<any>({
        spend: 0,
        impressions: 0,
        clicks: 0,
        leads: 0,
        cpc: 0,
        ctr: 0,
        cpl: 0,
        cpm: 0
    });
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [topCreatives, setTopCreatives] = useState<any[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [availableCampaigns, setAvailableCampaigns] = useState<any[]>([]);
    const [manualCampaignIds, setManualCampaignIds] = useState<string[]>([]);
    const [manualSearch, setManualSearch] = useState('');
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [autoLinkedIds, setAutoLinkedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, [lancamento]);

    const handleSync = async () => {
        if (!lancamento?.cliente_id) return;

        try {
            setSyncing(true);
            toast.info("Iniciando sincronização com Meta Ads...");

            const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
                body: {
                    client_id: lancamento.cliente_id,
                    trigger_source: 'manual_launch_tab'
                }
            });

            if (error) throw error;

            toast.success("Sincronização concluída com sucesso!");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao sincronizar dados.");
        } finally {
            setSyncing(false);
        }
    };

    const loadAvailableCampaigns = async () => {
        if (!lancamento?.cliente_id) return;

        try {
            setSelectionLoading(true);
            // Get Ad Accounts
            const { data: accounts } = await supabase
                .from('meta_client_ad_accounts')
                .select('id, ad_account_id')
                .eq('cliente_id', lancamento.cliente_id);

            const accountIds = accounts?.map(a => a.id) || [];
            if (accountIds.length === 0) return;

            const { data, error } = await supabase
                .from('meta_campaign_insights')
                .select('campaign_id, campaign_name, date_start')
                .in('ad_account_id', accountIds)
                .order('date_start', { ascending: false });

            if (error) throw error;

            // Deduplicate by ID
            const unique = new Map();
            data?.forEach((c: any) => {
                if (!unique.has(c.campaign_id)) {
                    unique.set(c.campaign_id, c);
                }
            });

            const allCamps = Array.from(unique.values());
            setAvailableCampaigns(allCamps);

            // If no manual selection yet, pre-check the auto-linked campaigns
            if (manualCampaignIds.length === 0 && autoLinkedIds.length > 0) {
                setManualCampaignIds(autoLinkedIds);
            } else if (manualCampaignIds.length === 0) {
                // Compute auto-linked on the fly for pre-checking
                const launchName = lancamento.nome_lancamento.toLowerCase().trim();
                const launchWords = launchName.split(' ').filter((w: string) => w.length > 2);
                const autoIds: string[] = [];
                allCamps.forEach(c => {
                    const cName = c.campaign_name.toLowerCase();
                    if (cName.includes(launchName)) {
                        autoIds.push(c.campaign_id);
                        return;
                    }
                    let score = 0;
                    launchWords.forEach((word: string) => {
                        if (cName.includes(word)) score += word.length;
                    });
                    if (score > 2) autoIds.push(c.campaign_id);
                });
                if (autoIds.length > 0) {
                    setManualCampaignIds(autoIds);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar campanhas disponíveis.");
        } finally {
            setSelectionLoading(false);
        }
    };

    const saveManualSelection = async (newIds: string[]) => {
        try {
            const { error } = await supabase
                .from('lancamentos')
                .update({ manual_campaign_ids: newIds as any })
                .eq('id', lancamento.id);

            if (error) throw error;

            setManualCampaignIds(newIds);
            setAutoLinkedIds([]); // Clear auto-linked since we now have manual selection
            setIsSelectionOpen(false);
            toast.success("Campanhas atualizadas com sucesso!");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar seleção.");
        }
    };

    const fetchData = async () => {
        if (!lancamento?.cliente_id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // 0. Fetch latest manual_campaign_ids
            const { data: lancamentoData } = await supabase
                .from('lancamentos')
                .select('manual_campaign_ids')
                .eq('id', lancamento.id)
                .single();

            const currentManualIds = (lancamentoData?.manual_campaign_ids as string[]) || [];
            setManualCampaignIds(currentManualIds);

            // 1. Get Ad Accounts for Client
            const { data: accounts } = await supabase
                .from('meta_client_ad_accounts')
                .select('id, ad_account_id')
                .eq('cliente_id', lancamento.cliente_id);

            const accountIds = accounts?.map(a => a.id) || [];

            if (accountIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch Campaign Insights
            // We need to fetch all campaigns for these accounts and then filter by name in JS
            // because we want fuzzy matching with the launch name.
            // OPTIMIZATION: Filter by date if launch has start date.

            let query = supabase
                .from('meta_campaign_insights')
                .select('*')
                .in('ad_account_id', accountIds)
                .order('date_start', { ascending: true });

            // Removing strict date filter to ensure we catch campaigns that might have started slightly earlier
            // or if the launch start date is set to a future date but ads are already running.
            // if (lancamento.data_inicio_captacao) {
            //      query = query.gte('date_start', lancamento.data_inicio_captacao);
            // }

            const { data: allCampaignsData, error: campaignError } = await query;

            if (campaignError) throw campaignError;

            // If manual_campaign_ids has values, use it as SOURCE OF TRUTH
            // Otherwise, fall back to auto-linking by name
            let relevantCampaigns: any[] = [];

            if (currentManualIds.length > 0) {
                // Source of truth: manual selection
                relevantCampaigns = allCampaignsData?.filter(c =>
                    currentManualIds.includes(c.campaign_id)
                ) || [];
            } else {
                // Fallback: auto-link by name matching
                const launchName = lancamento.nome_lancamento.toLowerCase().trim();
                const launchWords = launchName.split(' ').filter((w: string) => w.length > 2);

                relevantCampaigns = allCampaignsData?.filter(c => {
                    const cName = c.campaign_name.toLowerCase();

                    // 1. Exact Match
                    if (cName.includes(launchName)) return true;

                    // 2. Fuzzy Score Match
                    let score = 0;
                    launchWords.forEach((word: string) => {
                        if (cName.includes(word)) score += word.length;
                    });

                    return score > 2;
                }) || [];
            }

            // Track auto-linked IDs for the edit dialog
            const autoIds = new Set<string>();
            if (currentManualIds.length === 0) {
                relevantCampaigns.forEach(c => autoIds.add(c.campaign_id));
            }
            setAutoLinkedIds(Array.from(autoIds));

            if (relevantCampaigns.length === 0) {
                setLoading(false);
                return;
            }

            // Aggregate Metrics
            const totalMetrics = {
                spend: 0,
                impressions: 0,
                clicks: 0,
                leads: 0,
                link_clicks: 0
            };

            const dailyMap = new Map();
            const campaignMap = new Map();
            const campaignIds = new Set();

            relevantCampaigns.forEach((item: any) => {
                campaignIds.add(item.campaign_id);

                const spend = Number(item.spend || 0);
                const impressions = Number(item.impressions || 0);
                const clicks = Number(item.clicks || 0);

                let leads = 0;
                if (item.actions) {
                    const leadActions = item.actions.filter((a: any) =>
                        ['lead', 'contact', 'submit_application', 'schedule', 'd2_leads', 'fb_mobile_complete_registration', 'complete_registration'].includes(a.action_type)
                    );
                    leads = leadActions.reduce((sum: number, a: any) => sum + Number(a.value), 0);
                }

                totalMetrics.spend += spend;
                totalMetrics.impressions += impressions;
                totalMetrics.clicks += clicks;
                totalMetrics.leads += leads;

                // Daily aggregation for chart
                const date = item.date_start;
                if (!dailyMap.has(date)) {
                    dailyMap.set(date, { date, spend: 0, leads: 0, impressions: 0 });
                }
                const day = dailyMap.get(date);
                day.spend += spend;
                day.leads += leads;
                day.impressions += impressions;

                // Campaign aggregation
                if (!campaignMap.has(item.campaign_id)) {
                    campaignMap.set(item.campaign_id, {
                        id: item.campaign_id,
                        name: item.campaign_name,
                        spend: 0,
                        impressions: 0,
                        clicks: 0,
                        leads: 0,
                    });
                }
                const camp = campaignMap.get(item.campaign_id);
                camp.spend += spend;
                camp.impressions += impressions;
                camp.clicks += clicks;
                camp.leads += leads;
            });

            // Calculate derivative metrics
            const kpis = {
                ...totalMetrics,
                cpc: totalMetrics.clicks > 0 ? totalMetrics.spend / totalMetrics.clicks : 0,
                ctr: totalMetrics.impressions > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0,
                cpl: totalMetrics.leads > 0 ? totalMetrics.spend / totalMetrics.leads : 0,
                cpm: totalMetrics.impressions > 0 ? (totalMetrics.spend / totalMetrics.impressions) * 1000 : 0,
            };
            setMetrics(kpis);

            // Prepare Chart Data
            const sortedDaily = Array.from(dailyMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setChartData(sortedDaily);

            // Prepare Campaign List
            const sortedCampaigns = Array.from(campaignMap.values()).map((c: any) => ({
                ...c,
                cpl: c.leads > 0 ? c.spend / c.leads : 0,
                ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
                cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
            })).sort((a, b) => b.spend - a.spend);
            setCampaigns(sortedCampaigns);

            // 3. Fetch Top Creatives (Ad Insights)
            // We need ad insights for the relevant campaign IDs
            // To avoid huge query, we can query by 'campaign_id' in list

            // Since 'in' query can be limited, if we have too many campaigns we might need to be careful
            // But typically a launch has < 50 campaigns
            const campaignsIdArray = Array.from(campaignIds);

            let adQuery = supabase
                .from('meta_ad_insights')
                .select('*')
                .in('campaign_id', campaignsIdArray)
                .order('spend', { ascending: false });

            // if (lancamento.data_inicio_captacao) {
            //    adQuery = adQuery.gte('date_start', lancamento.data_inicio_captacao);
            // }

            const { data: adInsights, error: adError } = await adQuery;

            if (!adError && adInsights) {
                const adMap = new Map();

                adInsights.forEach((ad: any) => {
                    if (!adMap.has(ad.ad_id)) {
                        adMap.set(ad.ad_id, {
                            ad_id: ad.ad_id,
                            ad_name: ad.ad_name,
                            thumbnail: ad.creative_thumbnail_url,
                            url: ad.creative_url,
                            spend: 0,
                            leads: 0,
                            impressions: 0,
                            clicks: 0
                        });
                    }

                    const item = adMap.get(ad.ad_id);
                    const spend = Number(ad.spend || 0);

                    let leads = 0;
                    if (ad.actions) {
                        const leadActions = ad.actions.filter((a: any) =>
                            ['lead', 'contact', 'submit_application', 'schedule', 'd2_leads', 'fb_mobile_complete_registration', 'complete_registration'].includes(a.action_type)
                        );
                        leads = leadActions.reduce((sum: number, a: any) => sum + Number(a.value), 0);
                    }

                    item.spend += spend;
                    item.leads += leads;
                    item.impressions += Number(ad.impressions || 0);
                    item.clicks += Number(ad.clicks || 0);
                });

                const sortedAds = Array.from(adMap.values())
                    .map((ad: any) => ({
                        ...ad,
                        cpl: ad.leads > 0 ? ad.spend / ad.leads : 0,
                        ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0
                    }))
                    .sort((a, b) => b.spend - a.spend)
                    .slice(0, 10); // Top 10 by spend

                setTopCreatives(sortedAds);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        // Loading state
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-medium hidden sm:block">Resultados do Lançamento</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Dialog open={isSelectionOpen} onOpenChange={(open) => {
                        setIsSelectionOpen(open);
                        if (open) loadAvailableCampaigns();
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
                                <Pencil className="h-4 w-4" />
                                Editar Campanhas
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Editar Campanhas do Lançamento</DialogTitle>
                            </DialogHeader>

                            <div className="relative my-2">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar campanha..."
                                    value={manualSearch}
                                    onChange={e => setManualSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            <ScrollArea className="flex-1 border rounded-md p-2 h-[300px]">
                                {selectionLoading ? (
                                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : (
                                    <div className="space-y-1">
                                        {availableCampaigns
                                            .filter(c => c.campaign_name.toLowerCase().includes(manualSearch.toLowerCase()))
                                            .map(campaign => {
                                                const isSelected = manualCampaignIds.includes(campaign.campaign_id);
                                                return (
                                                    <div key={campaign.campaign_id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                                                        <Checkbox
                                                            id={`camp-${campaign.campaign_id}`}
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setManualCampaignIds(prev => [...prev, campaign.campaign_id]);
                                                                } else {
                                                                    setManualCampaignIds(prev => prev.filter(id => id !== campaign.campaign_id));
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor={`camp-${campaign.campaign_id}`}
                                                            className="text-sm cursor-pointer flex-1 user-select-none"
                                                        >
                                                            <div className="font-medium">{campaign.campaign_name}</div>
                                                            <div className="text-xs text-muted-foreground">ID: {campaign.campaign_id} • {new Date(campaign.date_start).toLocaleDateString()}</div>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        {availableCampaigns.length === 0 && !selectionLoading && (
                                            <div className="text-center p-4 text-muted-foreground">Nenhuma campanha encontrada.</div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>

                            <DialogFooter className="mt-4">
                                <Button variant="outline" onClick={() => setIsSelectionOpen(false)}>Cancelar</Button>
                                <Button onClick={() => saveManualSelection(manualCampaignIds)}>
                                    <Check className="h-4 w-4 mr-2" />
                                    Salvar Seleção ({manualCampaignIds.length})
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSync}
                        disabled={syncing}
                        className="gap-2 flex-1 sm:flex-none"
                    >
                        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                </div>
            </div>

            {campaigns.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Target className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-muted-foreground">Nenhum dado encontrado</h3>
                        <p className="text-sm text-muted-foreground max-w-sm text-center mt-2">
                            Não encontramos campanhas com o nome "{lancamento.nome_lancamento}" nas contas vinculadas.
                            Verifique se o nome do lançamento corresponde ao nome das campanhas no Meta Ads ou selecione manualmente.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Investimento Total</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(metrics.spend)}</div>
                                <p className="text-xs text-muted-foreground">
                                    CPC M&eacute;dio: {formatCurrency(metrics.cpc)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Leads Gerados</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(metrics.leads)}</div>
                                <p className="text-xs text-muted-foreground">
                                    CPL M&eacute;dio: {formatCurrency(metrics.cpl)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Impress&otilde;es</CardTitle>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(metrics.impressions)}</div>
                                <p className="text-xs text-muted-foreground">
                                    CPM: {formatCurrency(metrics.cpm)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Cliques</CardTitle>
                                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(metrics.clicks)}</div>
                                <p className="text-xs text-muted-foreground">
                                    CTR: {metrics.ctr.toFixed(2)}%
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Evolu&ccedil;&atilde;o de Resultados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                                        />
                                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                        <Tooltip
                                            labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                                            formatter={(value: any, name: any) => {
                                                if (name === 'Investimento') return formatCurrency(value);
                                                return value;
                                            }}
                                        />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="spend" name="Investimento" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                        <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="#82ca9d" strokeWidth={2} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Campaigns */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Campanhas do Lan&ccedil;amento</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[400px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Campanha</TableHead>
                                                <TableHead className="text-right">Investimento</TableHead>
                                                <TableHead className="text-right">Leads</TableHead>
                                                <TableHead className="text-right">CPL</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {campaigns.map((campaign) => (
                                                <TableRow key={campaign.id}>
                                                    <TableCell className="font-medium text-xs max-w-[200px] truncate" title={campaign.name}>
                                                        {campaign.name}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs">
                                                        {formatCurrency(campaign.spend)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs">
                                                        {campaign.leads}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs">
                                                        {formatCurrency(campaign.cpl)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Creatives */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Criativos (Gasto)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[400px] overflow-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Criativo</TableHead>
                                                <TableHead className="text-right">Investimento</TableHead>
                                                <TableHead className="text-right">Leads</TableHead>
                                                <TableHead className="text-right">CPL</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topCreatives.map((creative) => (
                                                <TableRow key={creative.ad_id}>
                                                    <TableCell className="flex items-center gap-2">
                                                        {creative.thumbnail ? (
                                                            <div className="h-10 w-10 relative overflow-hidden rounded group cursor-pointer">
                                                                <img src={creative.thumbnail} alt="" className="h-full w-full object-cover" />
                                                                {creative.url && (
                                                                    <a href={creative.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                        <Eye className="h-4 w-4 text-white" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                                                                <Target className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col max-w-[140px]">
                                                            <span className="text-xs font-medium truncate" title={creative.ad_name}>{creative.ad_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs">
                                                        {formatCurrency(creative.spend)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs">
                                                        {creative.leads}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs">
                                                        {formatCurrency(creative.cpl)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            )}
        </div>
    );
};
