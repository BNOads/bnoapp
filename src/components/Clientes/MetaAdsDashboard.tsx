import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, DollarSign, MousePointer, Eye, Activity, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, subDays, format, subMonths, parseISO, compareAsc, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from 'date-fns-tz';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { MetaMetricsConfig } from "@/components/MetaAds/MetaMetricsConfig";
import { Settings } from "lucide-react";

interface MetaAdsDashboardProps {
    clientId: string;
    isPublicView?: boolean;
}

export const MetaAdsDashboard = ({ clientId, isPublicView = false }: MetaAdsDashboardProps) => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<any>(null);
    const [visibleMetrics, setVisibleMetrics] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState("last_30d");
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
    const [syncing, setSyncing] = useState(false);

    // New State for Chart and Ads List
    const [chartData, setChartData] = useState<any[]>([]);
    const [adsList, setAdsList] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [campaignPage, setCampaignPage] = useState(1);
    const [funnels, setFunnels] = useState<any[]>([]);
    const [campaignSearch, setCampaignSearch] = useState("");
    const [onlyActiveCampaigns, setOnlyActiveCampaigns] = useState(true);
    const [selectedFunnel, setSelectedFunnel] = useState<string>("all");
    const [campaignSortCol, setCampaignSortCol] = useState<string>("spend");
    const [campaignSortDir, setCampaignSortDir] = useState<"asc" | "desc">("desc");
    const [metricsConfigOpen, setMetricsConfigOpen] = useState(false);

    // Features State
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortMetric, setSortMetric] = useState("spend"); // spend | clicks | reach
    const [currentPage, setCurrentPage] = useState(1);
    const adsPerPage = 3;

    const { toast } = useToast();

    useEffect(() => {
        loadSettingsAndData();
    }, [clientId, dateRange, selectedAccountId]);

    // Reset pagination when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortMetric, adsList]);

    const getDateRange = () => {
        const now = new Date();
        let startDate = subDays(now, 30);
        let endDate = now;

        if (dateRange === 'this_month') {
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        } else if (dateRange === 'last_month') {
            const lastMonth = subMonths(now, 1);
            startDate = startOfMonth(lastMonth);
            endDate = endOfMonth(lastMonth);
        } else if (dateRange === 'today') {
            startDate = now;
            endDate = now;
        }

        return { startDate, endDate };
    };

    const loadSettingsAndData = async () => {
        setLoading(true);
        try {
            // 1. Load Visibility Settings
            const { data: settings } = await supabase
                .from('client_meta_settings')
                .select('*')
                .eq('cliente_id', clientId)
                .eq('is_visible', true);

            const visibleKeys = settings?.map(s => s.metric_name) || [];
            if (visibleKeys.length === 0) {
                setVisibleMetrics(['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'actions']);
            } else {
                setVisibleMetrics(visibleKeys);
            }

            // 2. Fetch Linked Accounts
            const { data: fetchedAccounts, error: accountsError } = await supabase
                .from('meta_client_ad_accounts')
                .select('id, account_name, ad_account_id, meta_ad_accounts(name)')
                .eq('cliente_id', clientId);

            if (accountsError) throw accountsError;

            setAccounts(fetchedAccounts || []);

            const accountUuids = fetchedAccounts?.map(a => a.id) || [];

            if (accountUuids.length === 0) {
                setMetrics(null);
                setLoading(false);
                return;
            }

            // Determine target accounts for query
            let targetAccountIds = accountUuids;
            if (selectedAccountId !== 'all') {
                const targetLink = fetchedAccounts?.find(a => a.ad_account_id === selectedAccountId);
                if (targetLink) {
                    targetAccountIds = [targetLink.id];
                } else {
                    targetAccountIds = [selectedAccountId];
                }
            }

            // 3. Determine Date Range
            const { startDate, endDate } = getDateRange();
            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            // 4. Fetch Data from meta_campaign_insights (for Totals and Chart)
            const { data: insights, error } = await supabase
                .from('meta_campaign_insights')
                .select('campaign_id, campaign_name, spend, impressions, clicks, reach, actions, action_values, date_start')
                .in('ad_account_id', targetAccountIds)
                .gte('date_start', startDateStr)
                .lte('date_start', endDateStr)
                .order('date_start', { ascending: true });

            if (error) throw error;

            // 5. Fetch Funnels for Association
            const { data: fetchedFunnels } = await supabase
                .from('orcamentos_funil')
                .select('id, nome_funil')
                .eq('cliente_id', clientId)
                .eq('ativo', true);

            setFunnels(fetchedFunnels || []);

            // --- Aggregate Totals ---
            const totals = {
                spend: 0,
                impressions: 0,
                clicks: 0,
                reach: 0,
                actions: 0,
                action_values: 0,
                cpc: 0,
                cpm: 0,
                ctr: 0,
                frequency: 0,
                conversions: 0,
                cpa: 0,
            };

            const chartMap: Record<string, number> = {};
            const campaignMap: Record<string, any> = {};

            const conversionTypes = [
                'purchase', 'lead', 'contact', 'schedule', 'submit_application',
                'complete_registration', 'onsite_conversion.messaging_conversation_started_7d',
                'omn_level_complete', 'start_trial'
            ];

            insights?.forEach(item => {
                const spend = Number(item.spend) || 0;
                totals.spend += spend;
                totals.impressions += Number(item.impressions) || 0;
                totals.clicks += Number(item.clicks) || 0;
                totals.reach += Number(item.reach) || 0;

                // Conversion Logic
                let conversions = 0;
                if (Array.isArray(item.actions)) {
                    item.actions.forEach((act: any) => {
                        if (conversionTypes.some(t => act.action_type === t || act.action_type.includes(t))) {
                            conversions += Number(act.value);
                        }
                    });
                }
                totals.conversions += conversions;

                // Chart Data
                const dateKey = item.date_start;
                chartMap[dateKey] = (chartMap[dateKey] || 0) + spend;

                // Campaign Aggregation
                if (!campaignMap[item.campaign_id]) {
                    campaignMap[item.campaign_id] = {
                        id: item.campaign_id,
                        name: item.campaign_name,
                        spend: 0,
                        impressions: 0,
                        clicks: 0,
                        reach: 0,
                        conversions: 0,
                    };
                }
                campaignMap[item.campaign_id].spend += spend;
                campaignMap[item.campaign_id].impressions += Number(item.impressions) || 0;
                campaignMap[item.campaign_id].clicks += Number(item.clicks) || 0;
                campaignMap[item.campaign_id].reach += Number(item.reach) || 0;
                campaignMap[item.campaign_id].conversions += conversions;
            });

            // Process Campaigns List
            const processedCampaigns = Object.values(campaignMap)
                .map((cmp: any) => {
                    let bestFunnel = null;
                    let bestScore = 0;

                    if (fetchedFunnels) {
                        fetchedFunnels.forEach((f: any) => {
                            const words = f.nome_funil.toLowerCase().split(' ').filter((w: string) => w.length > 1);
                            const campaignName = cmp.name.toLowerCase();

                            let score = 0;
                            words.forEach((word: string) => {
                                if (campaignName.includes(word)) {
                                    score += word.length;
                                }
                            });

                            if (score > bestScore) {
                                bestScore = score;
                                bestFunnel = f;
                            }
                        });
                    }

                    return {
                        ...cmp,
                        cpc: cmp.clicks > 0 ? cmp.spend / cmp.clicks : 0,
                        ctr: cmp.impressions > 0 ? (cmp.clicks / cmp.impressions) * 100 : 0,
                        cpa: cmp.conversions > 0 ? cmp.spend / cmp.conversions : 0,
                        funnelName: bestFunnel ? (bestFunnel as any).nome_funil : null,
                    };
                })
                .sort((a: any, b: any) => b.spend - a.spend);

            setCampaigns(processedCampaigns);

            // Calculate rates
            totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
            totals.cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
            totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
            totals.cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

            setMetrics(totals);

            // --- Format Chart Data with Zero-Filling ---
            const allDates = eachDayOfInterval({ start: startDate, end: endDate });

            const sortedChartData = allDates.map(dateObj => {
                const dateKey = format(dateObj, 'yyyy-MM-dd');
                const value = chartMap[dateKey] || 0;
                return {
                    date: format(dateObj, 'dd/MM'),
                    originalDate: dateKey,
                    value: Number(value.toFixed(2))
                };
            });
            setChartData(sortedChartData);


            // 5. Fetch Ad Insights (for Ad List)
            const { data: adInsights, error: adError } = await supabase
                .from('meta_ad_insights')
                .select('*')
                .in('ad_account_id', targetAccountIds)
                .gte('date_start', startDateStr)
                .lte('date_start', endDateStr);

            if (adError) {
                console.error("Error fetching ad insights", adError);
            } else {
                const adsMap: Record<string, any> = {};

                adInsights?.forEach(item => {
                    if (!adsMap[item.ad_id]) {
                        adsMap[item.ad_id] = {
                            id: item.ad_id,
                            name: item.ad_name,
                            thumbnail: item.creative_thumbnail_url || item.creative_url,
                            link: item.creative_url,
                            spend: 0,
                            impressions: 0,
                            clicks: 0,
                            reach: 0,
                            video_3sec: 0,
                            video_p75: 0,
                        };
                    }
                    adsMap[item.ad_id].spend += Number(item.spend) || 0;
                    adsMap[item.ad_id].impressions += Number(item.impressions) || 0;
                    adsMap[item.ad_id].clicks += Number(item.clicks) || 0;
                    adsMap[item.ad_id].reach += Number(item.reach) || 0;

                    // Video Metrics
                    let v3 = 0;
                    let vP75 = 0;

                    const getActionValue = (list: any[], types: string[]) => {
                        if (!Array.isArray(list)) return 0;
                        let val = 0;
                        list.forEach((act: any) => {
                            if (types.includes(act.action_type)) {
                                val += Number(act.value);
                            }
                        });
                        return val;
                    };

                    // Priority: video_metrics column (if populated), otherwise actions column
                    // Check if video_metrics has valid data, not just empty object from default
                    const vm = item.video_metrics;

                    // 3-Second Plays / Video Views
                    if (vm && Array.isArray(vm.video_3_sec_watched_actions) && vm.video_3_sec_watched_actions.length > 0) {
                        v3 = getActionValue(vm.video_3_sec_watched_actions, ['video_view', 'video_3_sec_watched_actions']);
                    } else {
                        v3 = getActionValue(item.actions, ['video_view', 'video_3_sec_watched_actions']);
                    }

                    // 75% video views
                    if (vm && Array.isArray(vm.video_p75_watched_actions) && vm.video_p75_watched_actions.length > 0) {
                        vP75 = getActionValue(vm.video_p75_watched_actions, ['video_p75_watched_actions']);
                    } else {
                        vP75 = getActionValue(item.actions, ['video_p75_watched_actions']);
                    }

                    adsMap[item.ad_id].video_3sec += v3;
                    adsMap[item.ad_id].video_p75 += vP75;
                });

                const finalAds = Object.values(adsMap)
                    .filter((ad: any) => ad.spend > 0) // Only show ads with spend
                    .map((ad: any) => ({
                        ...ad,
                        ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
                        cpc: ad.clicks > 0 ? ad.spend / ad.clicks : 0,
                        hookRate: ad.impressions > 0 ? (ad.video_3sec / ad.impressions) * 100 : 0,
                        holdRate: ad.reach > 0 ? (ad.video_p75 / ad.reach) * 100 : 0,
                    }));

                // Sorting is handled in render time now, but we set initial state
                setAdsList(finalAds);
            }

            // 6. Fetch Last Sync Time
            const { data: lastLog } = await supabase
                .from('meta_sync_logs')
                .select('completed_at, created_at')
                .eq('status', 'success')
                .in('ad_account_id', accountUuids)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (lastLog) {
                setLastSync(lastLog.completed_at || lastLog.created_at);
            } else {
                setLastSync(null);

                // Fallback: check campaign insights for latest data
                if (accountUuids.length > 0) {
                    const { data: latestInsight } = await supabase
                        .from('meta_campaign_insights')
                        .select('created_at')
                        .in('ad_account_id', accountUuids)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (latestInsight?.created_at) {
                        setLastSync(latestInsight.created_at);
                    }
                }
            }

        } catch (error) {
            console.error('Erro ao carregar dados do Meta Ads:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleSync = async () => {
        setSyncing(true);
        try {
            const { startDate, endDate } = getDateRange();

            const payload: any = {
                date_start: format(startDate, 'yyyy-MM-dd'),
                date_stop: format(endDate, 'yyyy-MM-dd'),
                trigger_source: 'manual'
            };

            if (selectedAccountId !== 'all') {
                payload.ad_account_id = selectedAccountId;
            } else {
                payload.client_id = clientId;
            }

            const { error } = await supabase.functions.invoke('meta-ads-sync', {
                body: payload
            });

            if (error) throw error;

            toast({
                title: "Sincronização iniciada",
                description: "Os dados estão sendo atualizados.",
            });

            await loadSettingsAndData();

        } catch (error: any) {
            console.error('Erro ao sincronizar:', error);
            toast({
                title: "Erro na sincronização",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSyncing(false);
        }
    };

    if (!metrics && !loading) return null;

    // Formatters
    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const number = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
    const percent = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100);

    const CARD_CONFIG: Record<string, any> = {
        spend: { label: 'Investimento', icon: DollarSign, fmt: currency },
        impressions: { label: 'Impressões', icon: Eye, fmt: number },
        clicks: { label: 'Cliques', icon: MousePointer, fmt: number },
        conversions: { label: 'Conversões', icon: TrendingUp, fmt: number },
        cpa: { label: 'Custo por Resultado', icon: DollarSign, fmt: currency },
        reach: { label: 'Alcance (Est.)', icon: activityIcon, fmt: number },
        ctr: { label: 'CTR', icon: TrendingUp, fmt: (v: number) => percent(v) },
        cpc: { label: 'CPC', icon: DollarSign, fmt: currency },
        cpm: { label: 'CPM', icon: DollarSign, fmt: currency },
    };

    function activityIcon() { return <Activity className="h-4 w-4 text-muted-foreground" /> }

    // --- Ads List Logic (Filter, Sort, Pagination) ---
    const filteredAds = adsList
        .filter(ad => ad.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b[sortMetric] - a[sortMetric]);

    const totalPages = Math.ceil(filteredAds.length / adsPerPage);
    const startIndex = (currentPage - 1) * adsPerPage;
    const currentAds = filteredAds.slice(startIndex, startIndex + adsPerPage);

    const nextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
    const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold">Performance Meta Ads</h2>
                        {lastSync && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <RefreshCw className="h-3 w-3" />
                                <span>Atualizado: {format(toZonedTime(lastSync, 'America/Sao_Paulo'), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                            </div>
                        )}

                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {!isPublicView && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSync}
                            disabled={syncing || accounts.length === 0}
                            title="Sincronizar dados"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        </Button>
                    )}

                    {accounts.length > 1 && (
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Conta" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Contas</SelectItem>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.ad_account_id}>
                                        {acc.account_name || acc.meta_ad_accounts?.name || 'Conta sem nome'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hoje</SelectItem>
                            <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                            <SelectItem value="this_month">Este Mês</SelectItem>
                            <SelectItem value="last_month">Mês Passado</SelectItem>
                        </SelectContent>
                    </Select>

                    {!isPublicView && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMetricsConfigOpen(true)}
                            title="Configurar Métricas"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>


            {
                loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-xl" />)}
                    </div>
                ) : (
                    <>
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.keys(CARD_CONFIG).map(key => {
                                if (!visibleMetrics.includes(key)) return null;
                                const conf = CARD_CONFIG[key];
                                const Icon = conf.icon;
                                return (
                                    <Card key={key}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">
                                                {conf.label}
                                            </CardTitle>
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {conf.fmt(metrics[key] || 0)}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Chart Section */}
                        {chartData.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold">Investimento Diário</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px] w-full pt-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                                tickFormatter={(value) => `R$${value}`}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => [currency(value), 'Investimento']}
                                                labelStyle={{ color: '#111827' }}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorSpend)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}


                        {/* Campaigns Table - 5 per page */}
                        {campaigns.length > 0 && (
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-base font-semibold">Campanhas</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar campanha..."
                                                value={campaignSearch}
                                                onChange={(e) => {
                                                    setCampaignSearch(e.target.value);
                                                    setCampaignPage(1);
                                                }}
                                                className="h-8 w-[180px] pl-8 text-xs"
                                            />
                                        </div>
                                        {funnels.length > 0 && (
                                            <Select value={selectedFunnel} onValueChange={(v) => { setSelectedFunnel(v); setCampaignPage(1); }}>
                                                <SelectTrigger className="h-8 w-[160px] text-xs">
                                                    <SelectValue placeholder="Funil" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos os Funis</SelectItem>
                                                    <SelectItem value="none">Sem Funil</SelectItem>
                                                    {funnels.map(f => (
                                                        <SelectItem key={f.id} value={f.nome_funil}>{f.nome_funil}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={onlyActiveCampaigns}
                                                onCheckedChange={(checked) => {
                                                    setOnlyActiveCampaigns(checked);
                                                    setCampaignPage(1);
                                                }}
                                                id="active-filter"
                                            />
                                            <label htmlFor="active-filter" className="text-sm text-muted-foreground cursor-pointer select-none">
                                                Apenas ativas
                                            </label>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        {(() => {
                                            const filteredCampaigns = campaigns.filter(c => {
                                                const matchesSearch = c.name.toLowerCase().includes(campaignSearch.toLowerCase());
                                                const matchesActive = onlyActiveCampaigns ? c.spend > 0 : true;
                                                const matchesFunnel = selectedFunnel === 'all' ? true : selectedFunnel === 'none' ? !c.funnelName : c.funnelName === selectedFunnel;
                                                return matchesSearch && matchesActive && matchesFunnel;
                                            });

                                            const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
                                                const aVal = a[campaignSortCol] ?? 0;
                                                const bVal = b[campaignSortCol] ?? 0;
                                                if (typeof aVal === 'string') return campaignSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                                                return campaignSortDir === 'asc' ? aVal - bVal : bVal - aVal;
                                            });

                                            const paginatedCampaigns = sortedCampaigns.slice((campaignPage - 1) * 5, campaignPage * 5);

                                            const totals = filteredCampaigns.reduce((acc, c) => ({
                                                spend: acc.spend + c.spend,
                                                conversions: acc.conversions + c.conversions,
                                                clicks: acc.clicks + c.clicks,
                                                impressions: acc.impressions + c.impressions,
                                                reach: acc.reach + c.reach,
                                            }), { spend: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0 });
                                            const totalsCpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
                                            const totalsCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

                                            const SortableHead = ({ col, label, align = 'right' }: { col: string; label: string; align?: string }) => {
                                                const isActive = campaignSortCol === col;
                                                return (
                                                    <TableHead
                                                        className={`${align === 'right' ? 'text-right' : ''} cursor-pointer select-none hover:bg-muted/50 transition-colors`}
                                                        onClick={() => {
                                                            if (isActive) {
                                                                setCampaignSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                                            } else {
                                                                setCampaignSortCol(col);
                                                                setCampaignSortDir('desc');
                                                            }
                                                            setCampaignPage(1);
                                                        }}
                                                    >
                                                        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                                                            {label}
                                                            {isActive ? (
                                                                campaignSortDir === 'desc'
                                                                    ? <ArrowDown className="h-3 w-3 text-blue-600" />
                                                                    : <ArrowUp className="h-3 w-3 text-blue-600" />
                                                            ) : (
                                                                <ArrowDown className="h-3 w-3 opacity-0 group-hover:opacity-30" />
                                                            )}
                                                        </div>
                                                    </TableHead>
                                                );
                                            };

                                            return (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="group">
                                                            <SortableHead col="name" label="Campanha" align="left" />
                                                            <TableHead>Funil</TableHead>
                                                            <SortableHead col="spend" label="Investimento" />
                                                            <SortableHead col="conversions" label="Conversões" />
                                                            <SortableHead col="cpa" label="CPA" />
                                                            <SortableHead col="clicks" label="Cliques" />
                                                            <SortableHead col="ctr" label="CTR" />
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {paginatedCampaigns.map((campaign) => (
                                                            <TableRow key={campaign.id}>
                                                                <TableCell className="font-medium max-w-[200px] truncate" title={campaign.name}>
                                                                    {campaign.name}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {campaign.funnelName && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-100">
                                                                            {campaign.funnelName}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">{currency(campaign.spend)}</TableCell>
                                                                <TableCell className="text-right">{number(campaign.conversions)}</TableCell>
                                                                <TableCell className="text-right">{currency(campaign.cpa)}</TableCell>
                                                                <TableCell className="text-right">{number(campaign.clicks)}</TableCell>
                                                                <TableCell className="text-right">{percent(campaign.ctr)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                    {filteredCampaigns.length > 0 && (
                                                        <tfoot>
                                                            <tr className="border-t-2 bg-muted/30 font-semibold text-sm">
                                                                <td className="p-2 pl-4">Total ({filteredCampaigns.length})</td>
                                                                <td></td>
                                                                <td className="p-2 text-right">{currency(totals.spend)}</td>
                                                                <td className="p-2 text-right">{number(totals.conversions)}</td>
                                                                <td className="p-2 text-right">{currency(totalsCpa)}</td>
                                                                <td className="p-2 text-right">{number(totals.clicks)}</td>
                                                                <td className="p-2 text-right">{percent(totalsCtr)}</td>
                                                            </tr>
                                                        </tfoot>
                                                    )}
                                                </Table>
                                            );
                                        })()}
                                    </div>

                                    {/* Pagination Controls */}
                                    {(() => {
                                        const count = campaigns.filter(c => {
                                            const matchesSearch = c.name.toLowerCase().includes(campaignSearch.toLowerCase());
                                            const matchesActive = onlyActiveCampaigns ? c.spend > 0 : true;
                                            const matchesFunnel = selectedFunnel === 'all' ? true : selectedFunnel === 'none' ? !c.funnelName : c.funnelName === selectedFunnel;
                                            return matchesSearch && matchesActive && matchesFunnel;
                                        }).length;
                                        const totalPgs = Math.ceil(count / 5);
                                        if (totalPgs <= 1) return null;
                                        return (
                                            <div className="flex items-center justify-end space-x-2 py-4">
                                                <Button variant="outline" size="sm" onClick={() => setCampaignPage(p => Math.max(1, p - 1))} disabled={campaignPage === 1}>
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <span className="text-sm text-muted-foreground">
                                                    Página {campaignPage} de {totalPgs}
                                                </span>
                                                <Button variant="outline" size="sm" onClick={() => setCampaignPage(p => Math.min(totalPgs, p + 1))} disabled={campaignPage === totalPgs}>
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        )}


                        {/* Active Ads List */}
                        {
                            adsList.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <h3 className="text-lg font-semibold">Anúncios Ativos</h3>

                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <div className="relative w-full sm:w-64">
                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Buscar anúncios..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-8"
                                                />
                                            </div>
                                            <Select value={sortMetric} onValueChange={setSortMetric}>
                                                <SelectTrigger className="w-[160px]">
                                                    <SelectValue placeholder="Ordenar por" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="spend">Mais Gasto</SelectItem>
                                                    <SelectItem value="clicks">Mais Cliques</SelectItem>
                                                    <SelectItem value="reach">Maior Alcance</SelectItem>
                                                    <SelectItem value="impressions">Mais Impressões</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Carousel Grid */}
                                    <div className="relative group">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {currentAds.map((ad) => (
                                                <div key={ad.id} className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                                    <div className="aspect-square w-full bg-slate-100 relative group/image overflow-hidden">
                                                        {ad.thumbnail ? (
                                                            <img
                                                                src={ad.thumbnail}
                                                                alt={ad.name}
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-105"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-slate-50">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <Eye className="h-8 w-8 opacity-20" />
                                                                    <span className="text-xs">Sem prévia</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Action Overlay */}
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                            {ad.link ? (
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="gap-2 font-medium"
                                                                    asChild
                                                                >
                                                                    <a href={ad.link} target="_blank" rel="noopener noreferrer">
                                                                        Ver no Instagram <ExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                </Button>
                                                            ) : (
                                                                <span className="text-white text-xs font-medium px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                                                                    Link indisponível
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                                        <h4 className="font-medium text-sm line-clamp-2 mb-3 h-10" title={ad.name}>
                                                            {ad.name}
                                                        </h4>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center text-xs border-b pb-2">
                                                                <span className="text-muted-foreground">Investimento</span>
                                                                <span className="font-bold text-blue-600">{currency(ad.spend)}</span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                                                                <div className="text-center">
                                                                    <span className="block text-muted-foreground text-[10px] uppercase">Cliques</span>
                                                                    <span className="font-semibold">{number(ad.clicks)}</span>
                                                                </div>
                                                                <div className="text-center border-l border-r">
                                                                    <span className="block text-muted-foreground text-[10px] uppercase">CTR</span>
                                                                    <span className={`${ad.ctr > 1 ? 'text-green-600' : 'text-foreground'} font-semibold`}>
                                                                        {percent(ad.ctr)}
                                                                    </span>
                                                                </div>
                                                                <div className="text-center">
                                                                    <span className="block text-muted-foreground text-[10px] uppercase">Alcance</span>
                                                                    <span className="font-semibold">{number(ad.reach)}</span>
                                                                </div>
                                                            </div>

                                                            {/* Video Metrics */}
                                                            {(ad.hookRate > 0 || ad.holdRate > 0) && (
                                                                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 mt-2 border-dashed">
                                                                    <div className="text-center">
                                                                        <span className="block text-muted-foreground text-[10px] uppercase" title="Plays de 3s / Impressões">Hook Rate</span>
                                                                        <span className="font-semibold text-purple-600">{percent(ad.hookRate)}</span>
                                                                    </div>
                                                                    <div className="text-center border-l border-dashed">
                                                                        <span className="block text-muted-foreground text-[10px] uppercase" title="Vídeos 75% / Alcance">Hold Rate</span>
                                                                        <span className="font-semibold text-purple-600">{percent(ad.holdRate)}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {filteredAds.length === 0 && (
                                            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                                                Nenhum anúncio encontrado para esta busca.
                                            </div>
                                        )}

                                        {/* Navigation Arrows */}
                                        {totalPages > 1 && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md bg-white border-slate-200 hidden md:flex disabled:opacity-0 transition-opacity z-10"
                                                    onClick={prevPage}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="absolute -right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md bg-white border-slate-200 hidden md:flex disabled:opacity-0 transition-opacity z-10"
                                                    onClick={nextPage}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>

                                    {/* Mobile Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-4 py-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={prevPage}
                                                disabled={currentPage === 1}
                                                className="gap-1"
                                            >
                                                <ChevronLeft className="h-4 w-4" /> Anterior
                                            </Button>
                                            <span className="text-xs text-muted-foreground">
                                                Página {currentPage} de {totalPages}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={nextPage}
                                                disabled={currentPage === totalPages}
                                                className="gap-1"
                                            >
                                                Próximo <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        {
                            adsList.length === 0 && !loading && (
                                <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                                    Nenhum anúncio com gasto registrado para este período.
                                </div>
                            )
                        }
                    </>
                )
            }
            <Dialog open={metricsConfigOpen} onOpenChange={setMetricsConfigOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Configurar Métricas</DialogTitle>
                    </DialogHeader>
                    <MetaMetricsConfig clientId={clientId} />
                    <div className="flex justify-end pt-4">
                        <Button onClick={() => {
                            setMetricsConfigOpen(false);
                            loadSettingsAndData();
                        }}>Fechar e Atualizar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
};
