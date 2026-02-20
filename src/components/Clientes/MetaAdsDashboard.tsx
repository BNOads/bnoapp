import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, DollarSign, MousePointer, Eye, Activity, RefreshCw, ExternalLink, ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown, LayoutGrid, List, Video, Image as ImageIcon, Images, Settings, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, subDays, format, subMonths, parseISO, compareAsc, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from 'date-fns-tz';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MetaMetricsConfig } from "@/components/MetaAds/MetaMetricsConfig";


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
    const [rawAdInsights, setRawAdInsights] = useState<any[]>([]); // New state for raw data
    const [groupByCreativeName, setGroupByCreativeName] = useState(false); // New state for toggle preference
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [campaignPage, setCampaignPage] = useState(1);
    const [funnels, setFunnels] = useState<any[]>([]);
    const [campaignSearch, setCampaignSearch] = useState("");
    const [onlyActiveCampaigns, setOnlyActiveCampaigns] = useState(true);
    const [selectedFunnel, setSelectedFunnel] = useState<string>("all");
    const [campaignSortCol, setCampaignSortCol] = useState<string>("spend");
    const [campaignSortDir, setCampaignSortDir] = useState<"asc" | "desc">("desc");
    const [metricsConfigOpen, setMetricsConfigOpen] = useState(false);
    const [togglingAds, setTogglingAds] = useState<Record<string, boolean>>({});

    // Ads Table Filters
    const [adCampaignSearch, setAdCampaignSearch] = useState("");
    const [adFunnelFilter, setAdFunnelFilter] = useState("all");

    // Features State
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortMetric, setSortMetric] = useState("spend"); // spend | clicks | reach | conversions | name
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [adsViewMode, setAdsViewMode] = useState<'grid' | 'table'>('grid');
    const adsPerPage = adsViewMode === 'grid' ? 3 : 10;

    const { toast } = useToast();

    useEffect(() => {
        loadSettingsAndData();
    }, [clientId, dateRange, selectedAccountId]);

    // Reset pagination when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortMetric, sortDirection, adsList]);

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

            const visibleKeys = settings?.map(s => {
                // Backward compatibility for old metric key persisted in DB.
                return s.metric_name === 'actions' ? 'conversions' : s.metric_name;
            }) || [];

            const baseMetrics = visibleKeys.length === 0
                ? ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions']
                : visibleKeys;

            // Keep conversions always visible in the top KPI cards.
            setVisibleMetrics(Array.from(new Set([...baseMetrics, 'conversions'])));

            // 2. Fetch Linked Accounts
            const { data: fetchedAccounts, error: accountsError } = await supabase
                .from('meta_client_ad_accounts')
                .select('id, account_name, ad_account_id, meta_ad_accounts(name, is_prepay_account, balance)')
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

            // 5. Fetch Funnels and Lancamentos for Association
            const { data: fetchedFunnels } = await supabase
                .from('orcamentos_funil')
                .select('id, nome_funil')
                .eq('cliente_id', clientId)
                .eq('ativo', true);

            const { data: fetchedLancamentos } = await supabase
                .from('lancamentos')
                .select('id, nome_lancamento')
                .eq('cliente_id', clientId)
                .eq('ativo', true)
                .in('status_lancamento', ['em_captacao', 'cpl', 'remarketing', 'pausado']);

            const combinedFunnels = [
                ...(fetchedFunnels || []).map(f => ({ id: f.id, nome_funil: f.nome_funil })),
                ...(fetchedLancamentos || []).map(l => ({ id: `lanc-${l.id}`, nome_funil: l.nome_lancamento }))
            ];

            setFunnels(combinedFunnels);

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

            const getConversionsFromActions = (actions: any[] | null | undefined) => {
                if (!Array.isArray(actions)) return 0;

                return actions.reduce((total, act) => {
                    const actionType = act?.action_type;
                    if (typeof actionType !== 'string') return total;

                    const isConversion = conversionTypes.some(t => actionType === t || actionType.includes(t));
                    if (!isConversion) return total;

                    return total + (Number(act?.value) || 0);
                }, 0);
            };

            insights?.forEach(item => {
                const spend = Number(item.spend) || 0;
                totals.spend += spend;
                totals.impressions += Number(item.impressions) || 0;
                totals.clicks += Number(item.clicks) || 0;
                totals.reach += Number(item.reach) || 0;

                // Conversion Logic
                const conversions = getConversionsFromActions(item.actions);
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
                // Store raw data to be processed by useEffect
                setRawAdInsights(adInsights || []);
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

    // New useEffect to handle data processing and aggregation
    useEffect(() => {
        if (!rawAdInsights.length) {
            setAdsList([]);
            return;
        }

        const conversionTypes = [
            'purchase', 'lead', 'contact', 'schedule', 'submit_application',
            'complete_registration', 'onsite_conversion.messaging_conversation_started_7d',
            'omn_level_complete', 'start_trial'
        ];

        const sumActionValues = (actions: any[] | null | undefined) => {
            if (!Array.isArray(actions)) return 0;
            return actions.reduce((total, act) => total + (Number(act?.value) || 0), 0);
        };

        const getConversionsFromActions = (actions: any[] | null | undefined) => {
            if (!Array.isArray(actions)) return 0;

            return actions.reduce((total, act) => {
                const actionType = act?.action_type;
                if (typeof actionType !== 'string') return total;

                const isConversion = conversionTypes.some(t => actionType === t || actionType.includes(t));
                if (!isConversion) return total;

                return total + (Number(act?.value) || 0);
            }, 0);
        };

        const adsMap: Record<string, any> = {};

        rawAdInsights.forEach((item: any) => {
            // Determine the key for aggregation
            const key = groupByCreativeName ? item.ad_name : item.ad_id;

            if (!adsMap[key]) {
                adsMap[key] = {
                    id: key, // Use name or ID as the unique key
                    ad_id: item.ad_id, // Keep original ID reference (first one found)
                    ad_ids: [item.ad_id], // Track all ad_ids for grouped toggles
                    name: item.ad_name,
                    status: item.status || 'ACTIVE', // Status from DB
                    effective_status: item.effective_status || 'ACTIVE',
                    _latestDate: item.date_start || '', // Track latest date to pick most recent status
                    thumbnail: item.creative_thumbnail_url || null,
                    creative_url: item.creative_url || null,
                    link: item.creative_url || null, // Ensure link property is set for UI compatibility
                    spend: 0,
                    impressions: 0,
                    clicks: 0,
                    reach: 0, // Added reach
                    conversions: 0, // Added conversions
                    leads: 0, // Added leads
                    campaigns: new Set(),
                    roas: 0,
                    ctr: 0,
                    cpc: 0,
                    cpm: 0,
                    actions: 0,
                    purchase_roas: 0,
                    revenue: 0,
                    purchases: 0,
                    cr: 0,
                    cpa: 0,
                    frequency: 0, // Will average later
                    count: 0, // To track how many items aggregated
                    _maxSpend: 0, // Track max spend to pick best creative
                    video_3sec: 0,
                    video_p75: 0,
                    video_thruplay: 0,
                    mediaType: item.media_type || 'image',
                };
            }

            const currentAd = adsMap[key];
            const itemSpend = Number(item.spend) || 0;

            if (item.campaign_name) currentAd.campaigns.add(item.campaign_name);

            // Update creative metadata if current item has higher spend AND valid data
            // Or if current ad has no data yet
            if (itemSpend > currentAd._maxSpend && (item.creative_url || item.creative_thumbnail_url)) {
                if (item.creative_url) {
                    currentAd.creative_url = item.creative_url;
                    currentAd.link = item.creative_url; // Update link as well
                }
                if (item.creative_thumbnail_url) currentAd.thumbnail = item.creative_thumbnail_url;
                if (item.media_type && item.media_type !== 'image') currentAd.mediaType = item.media_type;
                currentAd._maxSpend = itemSpend;
            } else if (!currentAd.creative_url && item.creative_url) {
                currentAd.creative_url = item.creative_url;
                currentAd.link = item.creative_url; // Update link as well
            } else if (!currentAd.thumbnail && item.creative_thumbnail_url) {
                currentAd.thumbnail = item.creative_thumbnail_url;
            }

            currentAd.count += 1;
            if (!currentAd.ad_ids.includes(item.ad_id)) {
                currentAd.ad_ids.push(item.ad_id);
            }

            // Always use the status from the most recent date row
            if (item.date_start && item.date_start > currentAd._latestDate) {
                currentAd._latestDate = item.date_start;
                if (item.status) currentAd.status = item.status;
                if (item.effective_status) currentAd.effective_status = item.effective_status;
            }
            currentAd.spend += itemSpend;
            currentAd.impressions += Number(item.impressions) || 0;
            currentAd.clicks += Number(item.clicks) || 0;
            currentAd.reach += Number(item.reach) || 0; // Sum reach
            currentAd.conversions += getConversionsFromActions(item.actions); // Sum conversions

            const getLeads = (actions: any[] | null | undefined) => {
                if (!Array.isArray(actions)) return 0;
                const leadTypes = ['lead', 'submit_application', 'complete_registration'];
                return actions.reduce((total, act) => {
                    const actionType = act?.action_type;
                    if (typeof actionType !== 'string') return total;
                    if (!leadTypes.some(t => actionType === t || actionType.includes(t))) return total;
                    return total + (Number(act?.value) || 0);
                }, 0);
            };
            currentAd.leads += getLeads(item.actions);

            // Frequency (weighted average or sum? usually standard average per ad set, but here maybe sum of impressions / reach? simple average for now)
            currentAd.frequency += Number(item.frequency) || 0;

            // Parse actions
            let revenue = 0;
            let purchases = 0;
            let video3sec = 0;
            let videoP75 = 0;
            let videoThruplay = 0;

            if (Array.isArray(item.action_values)) {
                const purchaseValue = item.action_values.find((a: any) => a.action_type === 'purchase')?.value;
                if (purchaseValue) revenue = Number(purchaseValue);
            }

            if (Array.isArray(item.actions)) {
                const purchaseCount = item.actions.find((a: any) => a.action_type === 'purchase')?.value;
                if (purchaseCount) purchases = Number(purchaseCount);
            }

            // Video Metrics
            // Priority: video_metrics column (if populated), otherwise actions column
            // Check if video_metrics has valid data, not just empty object from default
            const vm = item.video_metrics;
            const itemActions = Array.isArray(item.actions) ? item.actions : [];

            // 3-Second Plays / Video Views
            if (vm && Array.isArray(vm.video_3_sec_watched_actions) && vm.video_3_sec_watched_actions.length > 0) {
                video3sec = sumActionValues(vm.video_3_sec_watched_actions);
            } else {
                video3sec = sumActionValues(itemActions.filter((a: any) => ['video_view', 'video_3_sec_watched_actions'].includes(a.action_type)));
            }

            // 75% video views
            if (vm && Array.isArray(vm.video_p75_watched_actions) && vm.video_p75_watched_actions.length > 0) {
                videoP75 = sumActionValues(vm.video_p75_watched_actions);
            } else {
                videoP75 = sumActionValues(itemActions.filter((a: any) => ['video_p75_watched_actions'].includes(a.action_type)));
            }

            // ThruPlays (15s)
            if (vm && Array.isArray(vm.video_thruplay_watched_actions) && vm.video_thruplay_watched_actions.length > 0) {
                videoThruplay = sumActionValues(vm.video_thruplay_watched_actions);
            } else {
                videoThruplay = sumActionValues(itemActions.filter((a: any) => ['video_thruplay_watched_actions'].includes(a.action_type)));
            }

            currentAd.revenue += revenue;
            currentAd.purchases += purchases;
            currentAd.video_3sec += video3sec;
            currentAd.video_p75 += videoP75;
            currentAd.video_thruplay += videoThruplay;
        });

        // Calculate calculated metrics
        const finalAds = Object.values(adsMap)
            .filter((ad: any) => ad.spend > 0) // Only show ads with spend
            .map((ad: any) => {
                const roas = ad.spend > 0 ? ad.revenue / ad.spend : 0;
                const cpa = ad.conversions > 0 ? ad.spend / ad.conversions : 0; // Use conversions for CPA
                const cpc = ad.clicks > 0 ? ad.spend / ad.clicks : 0;
                const cpm = ad.impressions > 0 ? (ad.spend / ad.impressions) * 1000 : 0;
                const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
                const cr = ad.clicks > 0 ? (ad.purchases / ad.clicks) * 100 : 0;
                const frequency = ad.count > 0 ? ad.frequency / ad.count : 0; // Simple average of frequency

                // Hook Rate: 3-sec video views / Impressions
                const hookRate = ad.impressions > 0 ? (ad.video_3sec / ad.impressions) * 100 : 0;
                const cpl = ad.leads > 0 ? ad.spend / ad.leads : 0;

                // Determine best funnel based on campaigns
                let bestFunnel = null;
                let bestScore = 0;
                const campaignsArr = Array.from(ad.campaigns) as string[];

                if (funnels.length > 0 && campaignsArr.length > 0) {
                    funnels.forEach((f: any) => {
                        const words = f.nome_funil.toLowerCase().split(' ').filter((w: string) => w.length > 1);
                        const combinedCampaignNames = campaignsArr.join(' ').toLowerCase();

                        let score = 0;
                        words.forEach((word: string) => {
                            if (combinedCampaignNames.includes(word)) {
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
                    ...ad,
                    campaignNames: campaignsArr.join(', '), // For display/search
                    funnelName: bestFunnel ? (bestFunnel as any).nome_funil : null,
                    roas,
                    cpa,
                    cpc,
                    cpm,
                    ctr,
                    cr,
                    frequency,
                    hookRate,
                    cpl
                };
            });

        setAdsList(finalAds);

    }, [rawAdInsights, groupByCreativeName, funnels]);


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



    const handleAdStatusToggle = async (adId: string, currentStatus: string, adIds?: string[]) => {
        if (!adId) return;

        const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        // If multiple ad_ids provided (grouped mode), toggle all of them
        const idsToToggle = adIds && adIds.length > 1 ? adIds : [adId];
        console.log('Toggling Ads:', { idsToToggle, currentStatus, newStatus });

        // Set loading state for all ids
        setTogglingAds(prev => {
            const next = { ...prev };
            idsToToggle.forEach(id => { next[id] = true; });
            return next;
        });

        try {
            // Call Meta API for each ad in parallel
            const results = await Promise.all(
                idsToToggle.map(id =>
                    supabase.functions.invoke('meta-update-ad-status', {
                        body: { ad_id: id, status: newStatus }
                    })
                )
            );

            // Check for errors
            const errors = results.filter(r => r.error || (r.data && !r.data.success));
            if (errors.length > 0) {
                const firstError = errors[0];
                if (firstError.error) throw firstError.error;
                if (firstError.data && !firstError.data.success) {
                    console.error('Backend Error Details:', firstError.data.error_details);
                    throw new Error(firstError.data.error || 'Erro desconhecido ao atualizar status');
                }
            }

            const successCount = results.length - errors.length;
            toast({
                title: "Status atualizado",
                description: idsToToggle.length === 1
                    ? `O anúncio foi ${newStatus === 'ACTIVE' ? 'ativado' : 'pausado'} com sucesso.`
                    : `${successCount} anúncio(s) ${newStatus === 'ACTIVE' ? 'ativados' : 'pausados'} com sucesso.`,
            });

            // Optimistic update - update all toggled ad_ids
            const toggledSet = new Set(idsToToggle);
            setAdsList(prev => prev.map(ad => {
                if (toggledSet.has(ad.ad_id) || (ad.ad_ids && ad.ad_ids.some((id: string) => toggledSet.has(id)))) {
                    return { ...ad, status: newStatus, effective_status: newStatus };
                }
                return ad;
            }));

        } catch (error: any) {
            console.error('Erro ao atualizar status:', error);
            toast({
                title: "Erro ao atualizar",
                description: error.message || "Não foi possível atualizar o status do anúncio.",
                variant: "destructive",
            });
        } finally {
            setTogglingAds(prev => {
                const next = { ...prev };
                idsToToggle.forEach(id => { next[id] = false; });
                return next;
            });
        }
    };

    if (!metrics && !loading) return null;

    // Formatters
    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const number = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
    const percent = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100);

    const CARD_CONFIG: Record<string, any> = {
        spend: {
            label: 'Investimento',
            icon: DollarSign,
            fmt: currency,
            description: 'Total investido em mídia no período selecionado.',
            formula: 'Soma de todos os gastos (spend) das campanhas.',
        },
        impressions: {
            label: 'Impressões',
            icon: Eye,
            fmt: number,
            description: 'Quantidade de vezes que os anúncios foram exibidos.',
            formula: 'Soma das impressões das campanhas.',
        },
        clicks: {
            label: 'Cliques',
            icon: MousePointer,
            fmt: number,
            description: 'Quantidade total de cliques nos anúncios.',
            formula: 'Soma dos cliques das campanhas.',
        },
        conversions: {
            label: 'Conversões',
            icon: TrendingUp,
            fmt: number,
            description: 'Total de ações de conversão atribuídas pelo Meta Ads.',
            formula: 'Soma de ações do tipo purchase, lead, contact, schedule, submit_application, complete_registration, messaging_conversation_started_7d, omn_level_complete e start_trial.',
        },
        cpa: {
            label: 'Custo por Resultado',
            icon: DollarSign,
            fmt: currency,
            description: 'Quanto foi gasto, em média, por conversão.',
            formula: 'Investimento ÷ Conversões.',
        },
        reach: {
            label: 'Alcance (Est.)',
            icon: activityIcon,
            fmt: number,
            description: 'Quantidade estimada de pessoas únicas impactadas.',
            formula: 'Soma do alcance (reach) estimado das campanhas.',
        },
        ctr: {
            label: 'CTR',
            icon: (props: any) => <TrendingUp {...props} />,
            fmt: (v: number) => percent(v),
            description: 'Taxa de cliques em relação às impressões.',
            formula: '(Cliques ÷ Impressões) x 100.',
        },
        cpc: {
            label: 'CPC',
            icon: DollarSign,
            fmt: currency,
            description: 'Custo médio por clique.',
            formula: 'Investimento ÷ Cliques.',
        },
        cpm: {
            label: 'CPM',
            icon: DollarSign,
            fmt: currency,
            description: 'Custo para gerar mil impressões.',
            formula: '(Investimento ÷ Impressões) x 1.000.',
        },
    };

    function activityIcon() { return <Activity className="h-4 w-4 text-muted-foreground" /> }

    const stringSortFields = new Set(['name', 'mediaType']);
    const getDefaultSortDirection = (field: string) => (stringSortFields.has(field) ? 'asc' : 'desc');

    // --- Ads List Logic (Filter, Sort, Pagination) ---
    const filteredAds = adsList
        .filter(ad => {
            const matchesSearch = ad.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCampaign = adCampaignSearch ? (ad.campaignNames || '').toLowerCase().includes(adCampaignSearch.toLowerCase()) : true;
            const matchesFunnel = adFunnelFilter === 'all' ? true : adFunnelFilter === 'none' ? !ad.funnelName : ad.funnelName === adFunnelFilter;
            return matchesSearch && matchesCampaign && matchesFunnel;
        })
        .sort((a, b) => {
            if (stringSortFields.has(sortMetric)) {
                const aText = (a[sortMetric] || '').toString();
                const bText = (b[sortMetric] || '').toString();
                const comparison = aText.localeCompare(bText, 'pt-BR', { sensitivity: 'base' });
                return sortDirection === 'asc' ? comparison : -comparison;
            }

            const aValue = Number(a[sortMetric]) || 0;
            const bValue = Number(b[sortMetric]) || 0;
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });

    const totalPages = Math.ceil(filteredAds.length / adsPerPage);
    const startIndex = (currentPage - 1) * adsPerPage;
    const currentAds = filteredAds.slice(startIndex, startIndex + adsPerPage);

    const nextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
    const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

    const handleSortMetricChange = (value: string) => {
        setSortMetric(value);
        setSortDirection(getDefaultSortDirection(value));
    };

    const handleTableSort = (field: string) => {
        if (sortMetric === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortMetric(field);
            setSortDirection(getDefaultSortDirection(field));
        }
        setCurrentPage(1);
    };

    const getSortIndicator = (field: string) => {
        if (sortMetric !== field) return <ArrowDown className="h-3 w-3 opacity-30" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="h-3 w-3 text-blue-600" />
            : <ArrowDown className="h-3 w-3 text-blue-600" />;
    };

    const SortableAdHead = ({
        field,
        label,
        className = "",
        align = "left",
    }: {
        field: string;
        label: string;
        className?: string;
        align?: "left" | "center" | "right";
    }) => (
        <TableHead
            className={`cursor-pointer select-none hover:bg-muted/50 ${className}`}
            onClick={() => handleTableSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
                {label}
                {getSortIndicator(field)}
            </div>
        </TableHead>
    );

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
                                <span>Atualizado: {formatInTimeZone(lastSync, 'America/Sao_Paulo', "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                            </div>
                        )}
                        {selectedAccountId !== 'all' && (() => {
                            const selected = accounts.find(a => a.ad_account_id === selectedAccountId);
                            if (selected?.meta_ad_accounts?.is_prepay_account !== undefined) {
                                return (
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${selected.meta_ad_accounts.is_prepay_account ? 'border-blue-500 text-blue-500' : 'border-gray-500 text-gray-500'}`}>
                                            {selected.meta_ad_accounts.is_prepay_account ? 'Pré-pago' : 'Pós-pago'}
                                        </span>
                                        {selected.meta_ad_accounts.balance !== undefined && Number(selected.meta_ad_accounts.balance) !== 0 && (
                                            <span className="text-[10px] text-muted-foreground">
                                                Saldo: {selected.meta_ad_accounts.balance}
                                            </span>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}

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
                                        {acc.account_name || acc.meta_ad_accounts?.name || 'Conta sem nome'} {acc.meta_ad_accounts?.is_prepay_account ? '(Pré-pago)' : ''}
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


            <div className="space-y-6">
                {
                    loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-xl" />)}
                        </div>
                    ) : (
                        <>
                            {/* Metrics Cards */}
                            <TooltipProvider>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {Object.keys(CARD_CONFIG).map(key => {
                                        if (!visibleMetrics.includes(key)) return null;
                                        const conf = CARD_CONFIG[key];
                                        const Icon = conf.icon;
                                        return (
                                            <Card key={key}>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                                                        <span>{conf.label}</span>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button type="button" aria-label={`Legenda da métrica ${conf.label}`} className="text-muted-foreground hover:text-foreground transition-colors">
                                                                    <Info className="h-3.5 w-3.5" />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-72">
                                                                <p className="text-xs font-semibold">{conf.label}</p>
                                                                <p className="text-xs mt-1">{conf.description}</p>
                                                                <p className="text-xs mt-2 text-muted-foreground">
                                                                    <span className="font-semibold">Cálculo:</span> {conf.formula}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
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
                            </TooltipProvider>

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
                                                <RechartsTooltip
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
                                                        onChange={(e) => {
                                                            setSearchTerm(e.target.value);
                                                            setCurrentPage(1);
                                                        }}
                                                        className="pl-8"
                                                    />
                                                </div>
                                                <div className="relative w-full sm:w-48">
                                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Buscar campanha..."
                                                        value={adCampaignSearch}
                                                        onChange={(e) => {
                                                            setAdCampaignSearch(e.target.value);
                                                            setCurrentPage(1);
                                                        }}
                                                        className="pl-8"
                                                    />
                                                </div>
                                                {funnels.length > 0 && (
                                                    <Select value={adFunnelFilter} onValueChange={(v) => { setAdFunnelFilter(v); setCurrentPage(1); }}>
                                                        <SelectTrigger className="w-[140px]">
                                                            <SelectValue placeholder="Funil" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Todos</SelectItem>
                                                            <SelectItem value="none">Sem Funil</SelectItem>
                                                            {funnels.map(f => (
                                                                <SelectItem key={f.id} value={f.nome_funil}>{f.nome_funil}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <Select value={sortMetric} onValueChange={handleSortMetricChange}>
                                                    <SelectTrigger className="w-[160px]">
                                                        <SelectValue placeholder="Ordenar por" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="spend">Mais Gasto</SelectItem>
                                                        <SelectItem value="clicks">Mais Cliques</SelectItem>
                                                        <SelectItem value="conversions">Mais Conversões</SelectItem>
                                                        <SelectItem value="leads">Mais Leads</SelectItem>
                                                        <SelectItem value="cpl">Custo por Lead</SelectItem>
                                                        <SelectItem value="reach">Maior Alcance</SelectItem>
                                                        <SelectItem value="impressions">Mais Impressões</SelectItem>
                                                        <SelectItem value="hookRate">Maior Hook Rate</SelectItem>

                                                    </SelectContent>
                                                </Select>
                                                <div className="flex items-center border rounded-md bg-background">
                                                    <Button
                                                        variant={adsViewMode === 'grid' ? 'secondary' : 'ghost'}
                                                        size="icon"
                                                        className="h-8 w-8 rounded-none rounded-l-md"
                                                        onClick={() => { setAdsViewMode('grid'); setCurrentPage(1); }}
                                                    >
                                                        <LayoutGrid className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant={adsViewMode === 'table' ? 'secondary' : 'ghost'}
                                                        size="icon"
                                                        className="h-8 w-8 rounded-none rounded-r-md"
                                                        onClick={() => { setAdsViewMode('table'); setCurrentPage(1); }}
                                                    >
                                                        <List className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-sm ${!groupByCreativeName ? 'font-medium' : 'text-muted-foreground'}`}>Separar por ID</span>
                                                    <Switch
                                                        checked={groupByCreativeName}
                                                        onCheckedChange={setGroupByCreativeName}
                                                    />
                                                    <span className={`text-sm ${groupByCreativeName ? 'font-medium' : 'text-muted-foreground'}`}>Agrupar por Nome</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content Switcher */}
                                        {adsViewMode === 'grid' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {currentAds.map((ad) => (
                                                    <div key={ad.id} className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                                        <div className="aspect-square w-full bg-slate-100 relative group/image overflow-hidden">
                                                            {ad.thumbnail ? (
                                                                <>
                                                                    <img
                                                                        src={ad.thumbnail}
                                                                        alt={ad.name}
                                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-105"
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                    <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-md backdrop-blur-sm z-10 shadow-sm">
                                                                        {ad.mediaType === 'video' ? <Video className="h-3.5 w-3.5" /> :
                                                                            ad.mediaType === 'carousel' ? <Images className="h-3.5 w-3.5" /> :
                                                                                <ImageIcon className="h-3.5 w-3.5" />}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-slate-50">
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        <Eye className="h-8 w-8 opacity-20" />
                                                                        <span className="text-xs">Sem prévia</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                                            <h4 className="font-medium text-sm line-clamp-2 mb-3 h-10" title={ad.name}>
                                                                {ad.name}
                                                            </h4>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <Switch
                                                                        id={`switch-${ad.id}`}
                                                                        checked={ad.status === 'ACTIVE'}
                                                                        onCheckedChange={() => handleAdStatusToggle(ad.ad_id, ad.status, ad.ad_ids)}
                                                                        disabled={togglingAds[ad.ad_id]}
                                                                    />
                                                                    <label htmlFor={`switch-${ad.id}`} className="text-xs text-muted-foreground cursor-pointer select-none">
                                                                        {togglingAds[ad.ad_id] ? '...' : (ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado')}
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-center text-xs border-b pb-2">
                                                                    <span className="text-muted-foreground">Investimento</span>
                                                                    <span className="font-bold text-blue-600">{currency(ad.spend)}</span>
                                                                </div>
                                                                <div className="grid grid-cols-4 gap-2 text-xs pt-1">
                                                                    <div className="text-center">
                                                                        <span className="block text-muted-foreground text-[10px] uppercase">Cliques</span>
                                                                        <span className="font-semibold">{number(ad.clicks)}</span>
                                                                    </div>
                                                                    <div className="text-center border-l border-r">
                                                                        <span className="block text-muted-foreground text-[10px] uppercase">CPL</span>
                                                                        <span className="font-semibold">{currency(ad.cpl)}</span>
                                                                    </div>
                                                                    <div className="text-center border-r">
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
                                                                {ad.hookRate > 0 && (
                                                                    <div className="grid grid-cols-1 gap-2 text-xs border-t pt-2 mt-2 border-dashed">
                                                                        <div className="text-center">
                                                                            <span className="block text-muted-foreground text-[10px] uppercase" title="Plays de 3s / Impressões">Hook Rate</span>
                                                                            <span className="font-semibold text-purple-600">{percent(ad.hookRate)}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="pt-3 mt-auto">
                                                                {!groupByCreativeName && ad.link ? (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="w-full gap-2 text-xs"
                                                                        asChild
                                                                    >
                                                                        <a href={ad.link} target="_blank" rel="noopener noreferrer">
                                                                            <ExternalLink className="h-3 w-3" />
                                                                            Ver anúncio
                                                                        </a>
                                                                    </Button>
                                                                ) : (
                                                                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground cursor-not-allowed" disabled>
                                                                        <ExternalLink className="h-3 w-3 mr-2 opacity-50" />
                                                                        {groupByCreativeName ? "Agrupado (Link Oculto)" : "Link indisponível"}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <SortableAdHead field="mediaType" label="Tipo" className="w-[50px]" align="center" />
                                                            <SortableAdHead field="name" label="Criativo" className="w-[80px]" align="center" />
                                                            <SortableAdHead field="name" label="Nome e Link" />
                                                            <SortableAdHead field="spend" label="Invest." className="text-right" align="right" />
                                                            <SortableAdHead field="clicks" label="Cliques" className="text-right" align="right" />
                                                            <SortableAdHead field="conversions" label="Conversões" className="text-right" align="right" />
                                                            <SortableAdHead field="cpl" label="CPL" className="text-right" align="right" />
                                                            <SortableAdHead field="ctr" label="CTR" className="text-right" align="right" />
                                                            <SortableAdHead field="reach" label="Alcance" className="text-right" align="right" />
                                                            <SortableAdHead field="hookRate" label="Hook Rate" className="text-right" align="right" />

                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {currentAds.map((ad) => (
                                                            <TableRow key={ad.id}>
                                                                <TableCell className="text-center">
                                                                    <div className="flex justify-center text-muted-foreground">
                                                                        {ad.mediaType === 'video' ? <Video className="h-4 w-4" /> :
                                                                            ad.mediaType === 'carousel' ? <Images className="h-4 w-4" /> :
                                                                                <ImageIcon className="h-4 w-4" />}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="h-12 w-12 rounded bg-slate-100 overflow-hidden relative">
                                                                        {ad.thumbnail ? (
                                                                            <img
                                                                                src={ad.thumbnail}
                                                                                alt={ad.name}
                                                                                className="w-full h-full object-cover"
                                                                                referrerPolicy="no-referrer"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                                                <Eye className="h-4 w-4 opacity-20" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="font-medium text-xs sm:text-sm line-clamp-2" title={ad.name}>
                                                                            {ad.name}
                                                                        </span>
                                                                        {ad.link && (
                                                                            <a
                                                                                href={ad.link}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                            >
                                                                                Ver no Instagram <ExternalLink className="h-2 w-2" />
                                                                            </a>
                                                                        )}
                                                                        <div className="flex items-center space-x-2 mt-1">
                                                                            <Switch
                                                                                id={`switch-table-${ad.id}`}
                                                                                checked={ad.status === 'ACTIVE'}
                                                                                onCheckedChange={() => handleAdStatusToggle(ad.ad_id, ad.status, ad.ad_ids)}
                                                                                disabled={togglingAds[ad.ad_id]}
                                                                                className="scale-75 origin-left"
                                                                            />
                                                                            <label htmlFor={`switch-table-${ad.id}`} className="text-[10px] text-muted-foreground cursor-pointer select-none">
                                                                                {togglingAds[ad.ad_id] ? '...' : (ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado')}
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">{currency(ad.spend)}</TableCell>
                                                                <TableCell className="text-right">{number(ad.clicks)}</TableCell>
                                                                <TableCell className="text-right">{number(ad.conversions || 0)}</TableCell>
                                                                <TableCell className="text-right font-medium text-blue-600">{currency(ad.cpl)}</TableCell>
                                                                <TableCell className="text-right font-medium">{percent(ad.ctr)}</TableCell>
                                                                <TableCell className="text-right">{number(ad.reach)}</TableCell>
                                                                <TableCell className="text-right text-purple-600 font-medium">{percent(ad.hookRate)}</TableCell>

                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}

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
            </div>
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
