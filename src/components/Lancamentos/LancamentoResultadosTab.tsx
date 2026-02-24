
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, PieChart, Pie, Cell, RadialBarChart, RadialBar, LineChart } from 'recharts';
import { Loader2, TrendingUp, DollarSign, Users, MousePointerClick, Eye, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, Pencil, Check, Plus, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Link as LinkIcon, AlertCircle, ArrowDownUp } from 'lucide-react';
import { toast } from 'sonner';
import { SheetAnalysis } from './SheetAnalysis';
import { CruzamentoDadosTab } from './CruzamentoDadosTab';
import { CompradoresTab } from './CompradoresTab';
import { MetaDatePicker } from '@/components/ui/date-picker-meta';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

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

const normalizeText = (value: unknown): string => {
    return typeof value === 'string' ? value.toLowerCase() : '';
};

const safeCampaignName = (value: unknown): string => {
    return typeof value === 'string' && value.trim().length > 0
        ? value
        : 'Campanha sem nome';
};

const normalizeForMatch = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
};

const tokenizeForMatch = (value: unknown): string[] => {
    const normalized = normalizeForMatch(value);
    if (!normalized) return [];
    return normalized.split(' ').filter(Boolean);
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const extractStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
};

const getLaunchCodeTokens = (value: unknown): string[] => {
    return uniqueStrings(
        tokenizeForMatch(value).filter((token) => token.length >= 3 && /[a-z]/.test(token) && /\d/.test(token))
    );
};

type LaunchMatchContext = {
    launchName: string;
    launchAliases: string[];
    launchCodes: string[];
};

const buildLaunchMatchContext = (lancamento: any, clientData?: any): LaunchMatchContext => {
    const launchName = typeof lancamento?.nome_lancamento === 'string' ? lancamento.nome_lancamento : '';
    const clientAliases = extractStringArray(clientData?.aliases);
    const baseAliases = [
        launchName,
        typeof clientData?.slug === 'string' ? clientData.slug : '',
        typeof clientData?.nome === 'string' ? clientData.nome : '',
        ...clientAliases,
    ];

    // Optional future-proof aliases/codes if these fields are added on lancamentos.
    const optionalLaunchAliases = extractStringArray((lancamento as any)?.aliases_lancamento);
    const optionalCodes = [
        (lancamento as any)?.codigo_lancamento,
        (lancamento as any)?.cod_lancamento,
        (lancamento as any)?.codigo,
        (lancamento as any)?.slug,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    const launchAliases = uniqueStrings([
        ...baseAliases,
        ...optionalLaunchAliases,
        ...optionalCodes,
    ])
        .map((alias) => normalizeForMatch(alias))
        .filter((alias) => alias.length >= 3);

    const launchCodes = uniqueStrings([
        ...getLaunchCodeTokens(launchName),
        ...optionalCodes.flatMap((code) => getLaunchCodeTokens(code)),
    ]);

    return {
        launchName: normalizeForMatch(launchName),
        launchAliases,
        launchCodes,
    };
};

const campaignMatchesLaunch = (campaignName: unknown, context: LaunchMatchContext): boolean => {
    const campaign = normalizeForMatch(campaignName);
    if (!campaign) return false;

    const campaignTokens = tokenizeForMatch(campaign);
    const campaignTokenSet = new Set(campaignTokens);

    if (context.launchName && campaign.includes(context.launchName)) {
        return true;
    }

    const longAliases = context.launchAliases.filter((alias) => alias.length >= 4);
    if (longAliases.some((alias) => campaign.includes(alias))) {
        return true;
    }

    if (context.launchCodes.some((code) => campaignTokenSet.has(code))) {
        return true;
    }

    const launchTokens = tokenizeForMatch(context.launchName).filter((token) => token.length >= 3);
    if (launchTokens.length === 0) return false;

    let overlapScore = 0;
    launchTokens.forEach((token) => {
        if (campaignTokenSet.has(token)) {
            overlapScore += token.length >= 6 ? 2 : 1;
        }
    });

    const minScore = launchTokens.length >= 4 ? 3 : 2;
    return overlapScore >= minScore;
};

// Priority-ordered list: pick the FIRST matching action type to avoid duplicating conversions
const LEAD_ACTION_PRIORITY = ['lead', 'complete_registration', 'fb_mobile_complete_registration', 'submit_application', 'contact', 'schedule', 'd2_leads'];

const getLeadsFromActions = (actions: any): number => {
    if (!actions) return 0;
    // Handle JSON string
    let parsed = actions;
    if (typeof actions === 'string') {
        try { parsed = JSON.parse(actions); } catch { return 0; }
    }
    if (!Array.isArray(parsed)) return 0;

    // Pick only the highest-priority action type to avoid double counting
    for (const actionType of LEAD_ACTION_PRIORITY) {
        const match = parsed.find((a: any) => a.action_type === actionType);
        if (match) return Number(match.value || 0);
    }
    return 0;
};

const getCampaignTemperature = (name: string) => {
    const n = normalizeText(name);
    if (n.includes('quente') || n.includes('hot') || n.includes('rmkt') || n.includes('remarketing') || n.includes('checkout') || n.includes('lista') || n.includes('carrinho')) return 'hot';
    if (n.includes('morno') || n.includes('warm') || n.includes('envolvimento') || n.includes('video') || n.includes('ig') || n.includes('fb') || n.includes('instagram') || n.includes('facebook') || n.includes('social')) return 'warm';
    return 'cold';
};

const isHttpUrl = (value: unknown): value is string => {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
};

const isLikelyImageUrl = (value: unknown): boolean => {
    if (!isHttpUrl(value)) return false;
    const lower = value.toLowerCase();
    const path = lower.split('?')[0];
    return (
        /\.(jpg|jpeg|png|gif|webp|bmp|avif|svg)$/i.test(path) ||
        lower.includes('thumbnail') ||
        lower.includes('image') ||
        lower.includes('/picture') ||
        lower.includes('scontent')
    );
};

const isLikelyIframePreviewUrl = (value: unknown): boolean => {
    if (!isHttpUrl(value)) return false;
    const lower = value.toLowerCase();
    return (
        lower.includes('/ads/iframe') ||
        lower.includes('facebook.com/ads') ||
        lower.includes('instagram.com/p/')
    );
};

const getCreativeAccessUrl = (creative: any): string | null => {
    if (isHttpUrl(creative?.url)) return creative.url;
    if (isHttpUrl(creative?.thumbnail) && !isLikelyImageUrl(creative.thumbnail)) return creative.thumbnail;
    return null;
};

const PAGINATION_PAGE_SIZE = 1000;
const CAMPAIGN_CATALOG_SENTINEL_DATE = '1970-01-01';
const LAUNCH_START_DATE_FIELDS = ['data_inicio_aquecimento', 'data_inicio_captacao', 'data_inicio_cpl', 'data_inicio_lembrete', 'data_inicio_carrinho'];
const LAUNCH_END_DATE_FIELDS = ['data_fechamento', 'data_fim_carrinho', 'data_fim_lembrete', 'data_fim_cpl', 'data_fim_aquecimento', 'data_fim_captacao'];

const parseLocalDateOnly = (value: unknown): Date | undefined => {
    if (typeof value !== 'string' || value.trim().length === 0) return undefined;
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
    return new Date(year, month - 1, day);
};

const normalizeDateRange = (range?: DateRange): DateRange | undefined => {
    if (!range?.from && !range?.to) return undefined;
    const from = range?.from || range?.to;
    const to = range?.to || range?.from;
    if (!from && !to) return undefined;
    if (from && to && from.getTime() > to.getTime()) {
        return { from: to, to: from };
    }
    return { from, to };
};

const getLaunchDateRange = (lancamento: any): DateRange | undefined => {
    const startDates = LAUNCH_START_DATE_FIELDS
        .map((field) => parseLocalDateOnly(lancamento?.[field]))
        .filter((date): date is Date => Boolean(date));

    const endDates = LAUNCH_END_DATE_FIELDS
        .map((field) => parseLocalDateOnly(lancamento?.[field]))
        .filter((date): date is Date => Boolean(date));

    const allDates = [...startDates, ...endDates];
    if (allDates.length === 0) return undefined;

    const from = startDates.length > 0
        ? new Date(Math.min(...startDates.map((date) => date.getTime())))
        : new Date(Math.min(...allDates.map((date) => date.getTime())));

    const to = endDates.length > 0
        ? new Date(Math.max(...endDates.map((date) => date.getTime())))
        : new Date(Math.max(...allDates.map((date) => date.getTime())));

    return normalizeDateRange({ from, to });
};

const resolveInsightsDateRange = (selectedRange: DateRange | undefined): DateRange | undefined => {
    return normalizeDateRange(selectedRange);
};

const fetchAllPages = async <T,>(
    fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> => {
    const rows: T[] = [];
    let from = 0;

    while (true) {
        const to = from + PAGINATION_PAGE_SIZE - 1;
        const { data, error } = await fetchPage(from, to);
        if (error) throw error;

        const page = data || [];
        rows.push(...page);

        if (page.length < PAGINATION_PAGE_SIZE) {
            break;
        }
        from += PAGINATION_PAGE_SIZE;
    }

    return rows;
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
    const [creativeSearch, setCreativeSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: 'spend', direction: 'desc' });
    const [creativeSortConfig, setCreativeSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: 'spend', direction: 'desc' });
    const [temperatureMetrics, setTemperatureMetrics] = useState({
        cold: { spend: 0, leads: 0 },
        warm: { spend: 0, leads: 0 },
        hot: { spend: 0, leads: 0 }
    });
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [lastMetaSyncAt, setLastMetaSyncAt] = useState<string | null>(null);

    const handleSort = (key: string, currentConfig: any, setConfig: any) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (currentConfig.key === key && currentConfig.direction === 'desc') {
            direction = 'asc';
        }
        setConfig({ key, direction });
    };

    const sortData = (data: any[], config: any) => {
        if (!config.key) return data;
        return [...data].sort((a, b) => {
            if (a[config.key] < b[config.key]) return config.direction === 'asc' ? -1 : 1;
            if (a[config.key] > b[config.key]) return config.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    useEffect(() => {
        setDateRange(getLaunchDateRange(lancamento));
    }, [lancamento?.id]);

    useEffect(() => {
        fetchData();
    }, [lancamento, dateRange]);

    const handleSync = async () => {
        if (!lancamento?.cliente_id) return;

        try {
            setSyncing(true);
            toast.info("Iniciando sincronização com Meta Ads...");

            const resolvedRange = resolveInsightsDateRange(dateRange) || getLaunchDateRange(lancamento);
            const fallbackStart = new Date();
            fallbackStart.setDate(fallbackStart.getDate() - 90);

            let startDate = resolvedRange?.from ? new Date(resolvedRange.from) : fallbackStart;
            let endDate = resolvedRange?.to ? new Date(resolvedRange.to) : new Date();
            if (startDate.getTime() > endDate.getTime()) {
                [startDate, endDate] = [endDate, startDate];
            }

            const currentCampaignIds = manualCampaignIds.length > 0 ? manualCampaignIds : autoLinkedIds;

            const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
                body: {
                    client_id: lancamento.cliente_id,
                    trigger_source: 'manual_launch_tab',
                    date_start: format(startDate, 'yyyy-MM-dd'),
                    date_stop: format(endDate, 'yyyy-MM-dd'),
                    campaign_ids: currentCampaignIds.length > 0 ? currentCampaignIds : undefined
                }
            });

            if (error) {
                console.error('Supabase Function Error:', error);
                throw new Error(error.message || 'Erro ao comunicar com o servidor');
            }

            toast.success("Sincronização concluída com sucesso!");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(`Erro ao sincronizar dados: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setSyncing(false);
        }
    };

    const loadAvailableCampaigns = async () => {
        if (!lancamento?.cliente_id || !lancamento?.nome_lancamento) return;

        try {
            setSelectionLoading(true);
            const { data: clientData } = await supabase
                .from('clientes')
                .select('nome, slug, aliases')
                .eq('id', lancamento.cliente_id)
                .maybeSingle();
            const matchContext = buildLaunchMatchContext(lancamento, clientData);

            // Get Ad Accounts
            const { data: accounts } = await supabase
                .from('meta_client_ad_accounts')
                .select('id, ad_account_id')
                .eq('cliente_id', lancamento.cliente_id);

            const accountIds = accounts?.map(a => a.id) || [];
            if (accountIds.length === 0) return;

            const data = await fetchAllPages<any>(async (from, to) => {
                const query = supabase
                    .from('meta_campaign_insights')
                    .select('campaign_id, campaign_name, date_start')
                    .in('ad_account_id', accountIds)
                    .order('date_start', { ascending: false })
                    .order('campaign_id', { ascending: true })
                    .range(from, to);
                return query;
            });

            // Deduplicate by ID
            const unique = new Map();
            data.forEach((c: any) => {
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
                const autoIds = allCamps
                    .filter((campaign) => campaignMatchesLaunch(campaign.campaign_name, matchContext))
                    .map((campaign) => campaign.campaign_id);
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
        if (!lancamento?.cliente_id || !lancamento?.nome_lancamento) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            // Reset state for clean render
            setCampaigns([]);
            setChartData([]);
            setTopCreatives([]);
            setMetrics({ spend: 0, impressions: 0, clicks: 0, leads: 0, cpc: 0, ctr: 0, cpl: 0, cpm: 0 });

            // 0. Fetch latest manual_campaign_ids
            const { data: lancamentoData } = await supabase
                .from('lancamentos')
                .select('manual_campaign_ids')
                .eq('id', lancamento.id)
                .single();

            const currentManualIds = (lancamentoData?.manual_campaign_ids as string[]) || [];
            setManualCampaignIds(currentManualIds);

            const { data: clientData } = await supabase
                .from('clientes')
                .select('nome, slug, aliases')
                .eq('id', lancamento.cliente_id)
                .maybeSingle();
            const matchContext = buildLaunchMatchContext(lancamento, clientData);

            // 1. Get Ad Accounts for Client
            const { data: accounts } = await supabase
                .from('meta_client_ad_accounts')
                .select('id, ad_account_id, meta_ad_accounts(last_synced_at)')
                .eq('cliente_id', lancamento.cliente_id);

            const accountIds = accounts?.map(a => a.id) || [];
            const syncDates = (accounts || [])
                .map((account: any) => {
                    const raw = Array.isArray(account?.meta_ad_accounts)
                        ? account.meta_ad_accounts[0]?.last_synced_at
                        : account?.meta_ad_accounts?.last_synced_at;
                    return typeof raw === 'string' ? raw : null;
                })
                .filter((value: string | null): value is string => Boolean(value));

            if (syncDates.length > 0) {
                const latest = syncDates.reduce((max, curr) => {
                    if (!max) return curr;
                    return new Date(curr).getTime() > new Date(max).getTime() ? curr : max;
                }, syncDates[0]);
                setLastMetaSyncAt(latest);
            } else {
                setLastMetaSyncAt(null);
            }

            if (accountIds.length === 0) {
                setLastMetaSyncAt(null);
                setLoading(false);
                return;
            }

            // 2. Build campaign catalog from all synced rows (no date filter).
            // This lets us include paused campaigns that may have zero metrics in the selected range.
            const campaignCatalogRows = await fetchAllPages<any>(async (from, to) => {
                const query = supabase
                    .from('meta_campaign_insights')
                    .select('campaign_id, campaign_name, date_start')
                    .in('ad_account_id', accountIds)
                    .order('date_start', { ascending: false })
                    .order('campaign_id', { ascending: true })
                    .range(from, to);
                return query;
            });

            const campaignCatalogMap = new Map<string, any>();
            campaignCatalogRows.forEach((campaign: any) => {
                if (campaign?.campaign_id && !campaignCatalogMap.has(campaign.campaign_id)) {
                    campaignCatalogMap.set(campaign.campaign_id, campaign);
                }
            });
            const campaignCatalog = Array.from(campaignCatalogMap.values());

            // If manual_campaign_ids has values, use it as SOURCE OF TRUTH.
            // Otherwise, auto-link using launch name + aliases + code tokens.
            const relevantCampaignIds = currentManualIds.length > 0
                ? uniqueStrings(currentManualIds)
                : campaignCatalog
                    .filter((campaign) => campaignMatchesLaunch(campaign.campaign_name, matchContext))
                    .map((campaign) => campaign.campaign_id);

            // Track auto-linked IDs for the edit dialog
            if (currentManualIds.length === 0) {
                setAutoLinkedIds(relevantCampaignIds);
            } else {
                setAutoLinkedIds([]);
            }

            if (relevantCampaignIds.length === 0) {
                setLoading(false);
                return;
            }

            // 3. Fetch insights only for relevant campaigns in the selected range.
            const effectiveRange = resolveInsightsDateRange(dateRange);
            const rangeStart = effectiveRange?.from ? format(effectiveRange.from, 'yyyy-MM-dd') : undefined;
            const rangeEnd = effectiveRange?.to ? format(effectiveRange.to, 'yyyy-MM-dd') : undefined;

            const relevantCampaigns = await fetchAllPages<any>(async (from, to) => {
                let query = supabase
                    .from('meta_campaign_insights')
                    .select('*')
                    .in('ad_account_id', accountIds)
                    .in('campaign_id', relevantCampaignIds)
                    .gt('date_start', CAMPAIGN_CATALOG_SENTINEL_DATE)
                    .order('date_start', { ascending: true })
                    .order('campaign_id', { ascending: true })
                    .range(from, to);

                if (rangeStart) {
                    query = query.gte('date_start', rangeStart);
                }
                if (rangeEnd) {
                    query = query.lte('date_start', rangeEnd);
                }
                return query;
            });

            // Aggregate Metrics
            const totalMetrics = {
                spend: 0,
                impressions: 0,
                clicks: 0,
                leads: 0,
                link_clicks: 0
            };

            const dailyMap = new Map();
            const campaignMap = new Map<string, any>();
            const campaignIds = new Set<string>(relevantCampaignIds);
            const tempBreakdown: Record<string, { spend: number; leads: number }> = {
                cold: { spend: 0, leads: 0 },
                warm: { spend: 0, leads: 0 },
                hot: { spend: 0, leads: 0 }
            };

            // Initialize campaign list with every relevant campaign (including paused/zero spend).
            relevantCampaignIds.forEach((campaignId) => {
                const catalogCampaign = campaignCatalogMap.get(campaignId);
                campaignMap.set(campaignId, {
                    id: campaignId,
                    name: safeCampaignName(catalogCampaign?.campaign_name),
                    spend: 0,
                    impressions: 0,
                    clicks: 0,
                    leads: 0,
                });
            });

            relevantCampaigns.forEach((item: any) => {
                const spend = Number(item.spend || 0);
                const impressions = Number(item.impressions || 0);
                const clicks = Number(item.clicks || 0);
                const leads = getLeadsFromActions(item.actions);

                // Extract additional metrics
                const link_clicks = Number(item.actions?.find((a: any) => a.action_type === 'link_click')?.value || 0);
                const landing_page_views = Number(item.actions?.find((a: any) => a.action_type === 'landing_page_view')?.value || 0);

                totalMetrics.spend += spend;
                totalMetrics.impressions += impressions;
                totalMetrics.clicks += clicks;
                totalMetrics.leads += leads;

                // Temperature breakdown
                const temp = getCampaignTemperature(safeCampaignName(item.campaign_name));
                if (tempBreakdown[temp]) {
                    tempBreakdown[temp].spend += spend;
                    tempBreakdown[temp].leads += leads;
                }

                // Daily aggregation for chart
                const date = item.date_start;
                if (!dailyMap.has(date)) {
                    dailyMap.set(date, {
                        date,
                        spend: 0,
                        leads: 0,
                        impressions: 0,
                        clicks: 0,
                        link_clicks: 0,
                        landing_page_views: 0
                    });
                }
                const day = dailyMap.get(date);
                day.spend += spend;
                day.leads += leads;
                day.impressions += impressions;
                day.clicks += clicks;
                day.link_clicks += link_clicks;
                day.landing_page_views += landing_page_views;

                // Campaign aggregation
                if (!campaignMap.has(item.campaign_id)) {
                    campaignMap.set(item.campaign_id, {
                        id: item.campaign_id,
                        name: safeCampaignName(item.campaign_name),
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

            setTemperatureMetrics(tempBreakdown as any);

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
            const sortedDaily = Array.from(dailyMap.values())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((day: any) => ({
                    ...day,
                    cpl: day.leads > 0 ? day.spend / day.leads : 0,
                    ctr: day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0,
                    cpm: day.impressions > 0 ? (day.spend / day.impressions) * 1000 : 0,
                    loading_rate: day.link_clicks > 0 ? (day.landing_page_views / day.link_clicks) * 100 : 0,
                    conversion_rate: day.landing_page_views > 0 ? (day.leads / day.landing_page_views) * 100 : 0
                }));

            console.log('DEBUG: relevantCampaigns', relevantCampaigns);
            console.log('DEBUG: dailyMap', Object.fromEntries(dailyMap));
            console.log('DEBUG: sortedDaily Chart Data', sortedDaily);

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

            const adInsights = await fetchAllPages<any>(async (from, to) => {
                let query = supabase
                    .from('meta_ad_insights')
                    .select('*')
                    .in('campaign_id', campaignsIdArray)
                    .order('date_start', { ascending: true })
                    .order('ad_id', { ascending: true })
                    .range(from, to);

                if (rangeStart) {
                    query = query.gte('date_start', rangeStart);
                }
                if (rangeEnd) {
                    query = query.lte('date_start', rangeEnd);
                }
                return query;
            });

            if (adInsights.length > 0) {
                const adMap = new Map<string, any>();

                adInsights.forEach((ad: any) => {
                    const rawName = typeof ad.ad_name === 'string' ? ad.ad_name.trim() : '';
                    const groupKey = rawName.length > 0
                        ? `name:${rawName.toLowerCase()}`
                        : `id:${ad.ad_id}`;

                    if (!adMap.has(groupKey)) {
                        adMap.set(groupKey, {
                            group_key: groupKey,
                            ad_id: ad.ad_id,
                            ad_name: rawName || 'Criativo sem nome',
                            thumbnail: ad.creative_thumbnail_url,
                            url: ad.creative_url,
                            spend: 0,
                            leads: 0,
                            impressions: 0,
                            clicks: 0,
                            video_3s_views: 0
                        });
                    }

                    const item = adMap.get(groupKey);
                    const spend = Number(ad.spend || 0);
                    const leads = getLeadsFromActions(ad.actions);

                    if (ad.creative_thumbnail_url) {
                        if (!item.thumbnail) {
                            item.thumbnail = ad.creative_thumbnail_url;
                        } else if (!isLikelyImageUrl(item.thumbnail) && isLikelyImageUrl(ad.creative_thumbnail_url)) {
                            // Prefer image-like preview when available.
                            item.thumbnail = ad.creative_thumbnail_url;
                        }
                    }
                    if (!item.url && ad.creative_url) {
                        item.url = ad.creative_url;
                    }

                    item.spend += spend;
                    item.leads += leads;
                    item.impressions += Number(ad.impressions || 0);
                    item.clicks += Number(ad.clicks || 0);
                    item.video_3s_views += Number(ad.video_3s_views || 0);
                });

                const sortedAds = Array.from(adMap.values())
                    .map((ad: any) => ({
                        ...ad,
                        access_url: getCreativeAccessUrl(ad),
                        cpl: ad.leads > 0 ? ad.spend / ad.leads : 0,
                        ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
                        hook_rate: ad.impressions > 0 ? (ad.video_3s_views / ad.impressions) * 100 : 0
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

    const investTotal = Number(lancamento.investimento_total || 0);
    const investProgress = investTotal > 0 ? (metrics.spend / investTotal) * 100 : 0;
    const investRemaining = Math.max(0, investTotal - metrics.spend);

    const temperatureColors = {
        cold: '#3b82f6', // blue-500
        warm: '#f59e0b', // amber-500
        hot: '#ef4444'   // red-500
    };

    const tempSpendData = [
        { name: 'Frio', value: temperatureMetrics.cold.spend, fill: temperatureColors.cold },
        { name: 'Morno', value: temperatureMetrics.warm.spend, fill: temperatureColors.warm },
        { name: 'Quente', value: temperatureMetrics.hot.spend, fill: temperatureColors.hot },
    ].filter(d => d.value > 0);

    const tempLeadsData = [
        { name: 'Frio', value: temperatureMetrics.cold.leads, fill: temperatureColors.cold },
        { name: 'Morno', value: temperatureMetrics.warm.leads, fill: temperatureColors.warm },
        { name: 'Quente', value: temperatureMetrics.hot.leads, fill: temperatureColors.hot },
    ].filter(d => d.value > 0);

    const checkColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899'];
    const creativeLeadsData = topCreatives
        .filter(c => c.leads > 0)
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5)
        .map((c, index) => ({
            name: c.ad_name.length > 15 ? c.ad_name.substring(0, 15) + '...' : c.ad_name,
            fullName: c.ad_name,
            value: c.leads,
            fill: checkColors[index % checkColors.length]
        }));

    const hasCampaignData = campaigns.length > 0;
    const formattedLastMetaSync = (() => {
        if (!lastMetaSyncAt) return null;
        const parsed = new Date(lastMetaSyncAt);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleString('pt-BR');
    })();

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-medium hidden sm:block">Resultados do Lançamento</h3>
                <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                        <MetaDatePicker
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                            disabled={loading || syncing}
                        />
                        {dateRange && (
                            <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                                Limpar
                            </Button>
                        )}
                    </div>
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
                        <DialogContent className="max-w-2xl h-[80vh] max-h-[80vh] flex flex-col min-h-0">
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

                            <div className="flex-1 min-h-0 overflow-y-auto border rounded-md p-2">
                                {selectionLoading ? (
                                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : (
                                    <div className="space-y-1">
                                        {availableCampaigns
                                            .filter(c => normalizeText(c.campaign_name).includes(normalizeText(manualSearch)))
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
                                                            <div className="font-medium">{safeCampaignName(campaign.campaign_name)}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                ID: {campaign.campaign_id} • {campaign.date_start ? new Date(campaign.date_start).toLocaleDateString() : '-'}
                                                            </div>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        {availableCampaigns.length === 0 && !selectionLoading && (
                                            <div className="text-center p-4 text-muted-foreground">Nenhuma campanha encontrada.</div>
                                        )}
                                        {/* Helper to ensure scroll detection */}
                                        <div className="h-1"></div>
                                    </div>
                                )}
                            </div>

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
                    <span className="text-xs text-muted-foreground">
                        Última sincronização com a Meta: {formattedLastMetaSync || 'nunca'}
                    </span>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="details">Detalhamento de Métricas</TabsTrigger>
                    <TabsTrigger value="leads">Leads</TabsTrigger>
                    <TabsTrigger value="pesquisa">Pesquisa</TabsTrigger>
                    <TabsTrigger value="cruzamento">Cruzamento de dados</TabsTrigger>
                    {lancamento?.status_lancamento === 'finalizado' && (
                        <TabsTrigger value="compradores">Compradores</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {!hasCampaignData ? (
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
                        <>
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

                            {/* Charts Row: Gauge & Pies */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Investment Gauge */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-center">Meta de Investimento</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center justify-center relative h-[250px]">
                                        {investTotal > 0 ? (
                                            <>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: 'Investido', value: metrics.spend },
                                                                { name: 'Restante', value: investRemaining }
                                                            ]}
                                                            cx="50%"
                                                            cy="70%"
                                                            startAngle={180}
                                                            endAngle={0}
                                                            innerRadius={60}
                                                            outerRadius={85}
                                                            paddingAngle={0}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            <Cell fill={investProgress > 100 ? '#ef4444' : '#22c55e'} />
                                                            <Cell fill="#e5e7eb" />
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute top-[60%] left-0 right-0 text-center pointer-events-none">
                                                    <div className="text-3xl font-bold">{investProgress.toFixed(1)}%</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {formatCurrency(metrics.spend)} / {formatCurrency(investTotal)}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Target className="h-8 w-8 opacity-50" />
                                                <span className="text-sm">Meta n&atilde;o definida</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Spend Pie */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-center">Investimento por Temperatura</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[250px]">
                                        {tempSpendData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={tempSpendData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        stroke="none"
                                                        label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                                                        labelLine={false}
                                                    >
                                                        {tempSpendData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                                Sem dados de temperatura
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Leads Pie */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-center">Leads por Temperatura</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[250px]">
                                        {tempLeadsData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={tempLeadsData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        stroke="none"
                                                        label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                                                        labelLine={false}
                                                    >
                                                        {tempLeadsData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                                Sem dados de temperatura
                                            </div>
                                        )}
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
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    stroke="#82ca9d"
                                                    tickFormatter={(value) => `R$ ${value}`}
                                                />
                                                <Tooltip
                                                    labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                                                    formatter={(value: any, name: any) => {
                                                        if (name === 'Custo por Lead' || name === 'Investimento') return formatCurrency(value);
                                                        return value;
                                                    }}
                                                />
                                                <Legend />
                                                <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                                <Bar yAxisId="right" dataKey="spend" name="Investimento" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                                <Line yAxisId="right" type="monotone" dataKey="cpl" name="Custo por Lead" stroke="#f97316" strokeWidth={2} />
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
                                                        <TableHead>
                                                            <div
                                                                className="flex items-center space-x-1 cursor-pointer hover:text-foreground transition-colors"
                                                                onClick={() => handleSort('name', sortConfig, setSortConfig)}
                                                            >
                                                                <span>Campanha</span>
                                                                {sortConfig.key === 'name' ? (
                                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            <div
                                                                className="flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground transition-colors"
                                                                onClick={() => handleSort('spend', sortConfig, setSortConfig)}
                                                            >
                                                                <span>Investimento</span>
                                                                {sortConfig.key === 'spend' ? (
                                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            <div
                                                                className="flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground transition-colors"
                                                                onClick={() => handleSort('leads', sortConfig, setSortConfig)}
                                                            >
                                                                <span>Leads</span>
                                                                {sortConfig.key === 'leads' ? (
                                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            <div
                                                                className="flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground transition-colors"
                                                                onClick={() => handleSort('cpl', sortConfig, setSortConfig)}
                                                            >
                                                                <span>Custo por lead</span>
                                                                {sortConfig.key === 'cpl' ? (
                                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sortData(campaigns, sortConfig).map((campaign) => (
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

                                {/* Creative Leads Pie */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-center">% Leads por Criativo</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[250px]">
                                        {creativeLeadsData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={creativeLeadsData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {creativeLeadsData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number, name: any, item: any) => [formatNumber(value), item.payload.fullName]} />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                                Sem dados de leads
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                {/* Top Creatives */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle>Top criativos (gasto)</CardTitle>
                                        <div className="relative w-40 sm:w-60">
                                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar criativo..."
                                                value={creativeSearch}
                                                onChange={(e) => setCreativeSearch(e.target.value)}
                                                className="pl-8 h-8 text-xs"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="max-h-[400px] overflow-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            <div
                                                                className="flex items-center space-x-1 cursor-pointer hover:text-foreground transition-colors"
                                                                onClick={() => handleSort('ad_name', creativeSortConfig, setCreativeSortConfig)}
                                                            >
                                                                <span>Criativo</span>
                                                                {creativeSortConfig.key === 'ad_name' ? (
                                                                    creativeSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            <div
                                                                className="flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground transition-colors"
                                                                onClick={() => handleSort('spend', creativeSortConfig, setCreativeSortConfig)}
                                                            >
                                                                <span>Investimento</span>
                                                                {creativeSortConfig.key === 'spend' ? (
                                                                    creativeSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            <div
                                                                className="flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground transition-colors"
                                                                onClick={() => handleSort('leads', creativeSortConfig, setCreativeSortConfig)}
                                                            >
                                                                <span>Leads</span>
                                                                {creativeSortConfig.key === 'leads' ? (
                                                                    creativeSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-right">
                                                            <div
                                                                className="flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground transition-colors"
                                                                onClick={() => handleSort('cpl', creativeSortConfig, setCreativeSortConfig)}
                                                            >
                                                                <span>Custo por lead</span>
                                                                {creativeSortConfig.key === 'cpl' ? (
                                                                    creativeSortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sortData(
                                                        topCreatives.filter(c => normalizeText(c.ad_name).includes(normalizeText(creativeSearch))),
                                                        creativeSortConfig
                                                    ).map((creative) => (
                                                        <TableRow key={creative.group_key || creative.ad_id}>
                                                            <TableCell className="flex items-center gap-2">
                                                                {creative.thumbnail ? (
                                                                    <div className="h-10 w-10 relative overflow-hidden rounded group cursor-pointer">
                                                                        {isLikelyImageUrl(creative.thumbnail) ? (
                                                                            <img src={creative.thumbnail} alt={creative.ad_name} className="h-full w-full object-cover" />
                                                                        ) : isLikelyIframePreviewUrl(creative.thumbnail) ? (
                                                                            <iframe
                                                                                src={creative.thumbnail}
                                                                                title={`Prévia de ${creative.ad_name}`}
                                                                                className="h-full w-full border-0"
                                                                                loading="lazy"
                                                                            />
                                                                        ) : (
                                                                            <div className="h-full w-full bg-muted flex items-center justify-center">
                                                                                <Target className="h-4 w-4 text-muted-foreground" />
                                                                            </div>
                                                                        )}
                                                                        {creative.access_url && (
                                                                            <a href={creative.access_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                                <Eye className="h-4 w-4 text-white" />
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                                                                        <Target className="h-4 w-4 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-xs font-medium whitespace-normal break-words leading-4">{creative.ad_name}</span>
                                                                    {creative.access_url ? (
                                                                        <a
                                                                            href={creative.access_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-[11px] text-primary hover:underline mt-1 inline-flex items-center gap-1"
                                                                        >
                                                                            <LinkIcon className="h-3 w-3" />
                                                                            Abrir criativo
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-[11px] text-muted-foreground mt-1">Link indisponível</span>
                                                                    )}
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
                        </>
                    )}
                </TabsContent>

                <TabsContent value="details" className="space-y-6">
                    {!hasCampaignData ? (
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Daily Results CTR */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resultados Diário CTR</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                                                    minTickGap={30}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => `${value.toFixed(2)}%`}
                                                />
                                                <Tooltip
                                                    labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                                                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'CTR']}
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="ctr" name="CTR" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Daily Results Loading % */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resultados Diário % Carregamento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                                                    minTickGap={30}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                                                />
                                                <Tooltip
                                                    labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                                                    formatter={(value: number) => [`${value.toFixed(2)}%`, '% Carregamento']}
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="loading_rate" name="% Carregamento" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Daily Results CPM */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resultados Diário CPM</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                                                    minTickGap={30}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => `R$ ${value}`}
                                                />
                                                <Tooltip
                                                    labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                                                    formatter={(value: number) => [formatCurrency(value), 'CPM']}
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="cpm" name="CPM" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Daily Results Page Conversion % */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resultados Diário % Conversão Página</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                                                    minTickGap={30}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                                                />
                                                <Tooltip
                                                    labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                                                    formatter={(value: number) => [`${value.toFixed(2)}%`, '% Conversão']}
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="conversion_rate" name="% Conversão" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="leads" className="space-y-6">
                    <GoogleSheetTab
                        type="leads"
                        lancamentoId={lancamento.id}
                        linkName="Planilha de Leads"
                    />
                </TabsContent>

                <TabsContent value="pesquisa" className="space-y-6">
                    <GoogleSheetTab
                        type="pesquisa"
                        lancamentoId={lancamento.id}
                        linkName="Planilha de Pesquisa"
                    />
                </TabsContent>

                <TabsContent value="cruzamento" className="space-y-6">
                    <CruzamentoDadosTab lancamentoId={lancamento.id} />
                </TabsContent>

                {lancamento?.status_lancamento === 'finalizado' && (
                    <TabsContent value="compradores" className="space-y-6">
                        <CompradoresTab lancamento={lancamento} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

// Internal Component for Google Sheets Tab to avoid duplication
const GoogleSheetTab = ({ type, lancamentoId, linkName }: { type: 'leads' | 'pesquisa', lancamentoId: string, linkName: string }) => {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<'none' | 'connecting' | 'validated' | 'error'>('none');
    const [data, setData] = useState<any[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [linkId, setLinkId] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    useEffect(() => {
        fetchLink();
    }, [lancamentoId, linkName]);

    const fetchLink = async () => {
        try {
            setLoading(true);
            const { data: links, error } = await supabase
                .from('lancamento_links')
                .select('*')
                .eq('lancamento_id', lancamentoId)
                .eq('nome', linkName)
                .maybeSingle();

            if (links) {
                setUrl(links.url);
                setLinkId(links.id);
                setLastSync(links.last_sync_at);

                if (links.cached_data && Array.isArray(links.cached_data)) {
                    setData(links.cached_data);
                    setStatus('validated');
                } else if (links.url) {
                    // Has URL but no data, maybe first load or cleared
                    setStatus('none');
                }
            }
        } catch (error) {
            console.error('Error fetching link:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredData = data.filter(row => {
        if (!searchTerm) return true;
        return Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig.key) return 0;

        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === valB) return 0;

        // Try numeric sort
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        // String sort
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    const triggerSync = async (currentLinkId: string) => {
        if (!currentLinkId) return;

        setStatus('connecting');
        setErrorMsg(null);

        try {
            toast.info('Iniciando sincronização...');
            const { data: result, error } = await supabase.functions.invoke('sync-launch-sheets', {
                body: { link_id: currentLinkId }
            });

            if (error) throw error;

            // Check result for specific link status
            if (result?.results?.[0]?.status === 'error') {
                throw new Error(result.results[0].message);
            }

            toast.success('Sincronização concluída!');
            await fetchLink(); // Reload data from DB

        } catch (error: any) {
            console.error('Sync error:', error);
            setStatus('error');
            setErrorMsg(error.message || 'Erro ao sincronizar planilha.');
            toast.error('Erro ao sincronizar.');
        } finally {
            // fetchLink sets loading false, but if we errored we might need to reset UI state
            if (status === 'connecting') setStatus(data.length > 0 ? 'validated' : 'error');
        }
    };

    const saveAndConnect = async () => {
        if (!url) return;
        setStatus('connecting');

        try {
            const { data: userData } = await supabase.auth.getUser();

            const payload = {
                lancamento_id: lancamentoId,
                nome: linkName,
                url: url,
                ordem: 99,
                criado_por: userData.user?.id
            };

            let currentId = linkId;
            let error;

            if (linkId) {
                const { error: updateError } = await supabase
                    .from('lancamento_links')
                    .update({ url: url })
                    .eq('id', linkId);
                error = updateError;
            } else {
                const { data: newLink, error: insertError } = await supabase
                    .from('lancamento_links')
                    .insert(payload)
                    .select()
                    .single();

                if (newLink) {
                    setLinkId(newLink.id);
                    currentId = newLink.id;
                }
                error = insertError;
            }

            if (error) throw error;

            if (currentId) {
                await triggerSync(currentId);
            }

        } catch (error: any) {
            console.error('Error saving link:', error);
            setStatus('error');
            setErrorMsg(error.message);
            toast.error('Erro ao salvar e conectar.');
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    {linkName}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {lastSync && (
                        <span className="text-xs text-muted-foreground mr-2">
                            Atualizado: {new Date(lastSync).toLocaleString()}
                        </span>
                    )}
                    {status === 'validated' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {data.length} registros
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Tabs defaultValue="lista" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="lista">Lista</TabsTrigger>
                        <TabsTrigger value="analise">Análise</TabsTrigger>
                    </TabsList>

                    <TabsContent value="lista" className="space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">

                                <div className="absolute left-2.5 top-2.5 text-muted-foreground">
                                    <LinkIcon className="h-4 w-4" />
                                </div>
                                <Input
                                    placeholder="Cole a URL do Google Sheets aqui..."
                                    className="pl-9"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={saveAndConnect}
                                disabled={status === 'connecting' || !url}
                            >
                                {status === 'connecting' ? (
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                {linkId ? 'Sincronizar' : 'Conectar'}
                            </Button>
                        </div>

                        {/* Error State */}
                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                                <AlertCircle className="h-4 w-4" />
                                {errorMsg}
                            </div>
                        )}

                        {/* Search & Table */}
                        {(status === 'validated' || data.length > 0) && (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar nos dados..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                <div className="border rounded-md overflow-hidden">
                                    <div className="max-h-[500px] overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {Object.keys(data[0] || {}).map((header, i) => (
                                                        <TableHead
                                                            key={i}
                                                            className="whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                                                            onClick={() => handleSort(header)}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                {header}
                                                                {sortConfig.key === header ? (
                                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                                                                )}
                                                            </div>
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedData.length > 0 ? (
                                                    sortedData.map((row, i) => (
                                                        <TableRow key={i}>
                                                            {Object.keys(data[0] || {}).map((header, j) => (
                                                                <TableCell key={j} className="whitespace-nowrap">
                                                                    {String(row[header]).length > 50
                                                                        ? String(row[header]).substring(0, 50) + '...'
                                                                        : row[header]}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={Object.keys(data[0] || {}).length} className="text-center py-8 text-muted-foreground">
                                                            Nenhum resultado encontrado para "{searchTerm}"
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="bg-muted/30 p-2 text-xs text-muted-foreground text-center border-t">
                                        Mostrando {sortedData.length} de {data.length} registros
                                    </div>
                                </div>
                            </>
                        )}

                        {status === 'validated' && data.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                Planilha conectada, mas nenhum dado encontrado.
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                            <p className="font-semibold mb-1">Como configurar:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>A planilha deve ser <strong>Pública</strong> ou acessível para "Qualquer pessoa com o link".</li>
                                <li>A primeira linha deve conter os cabeçalhos das colunas.</li>
                                <li><strong>Importante:</strong> O sistema sempre buscará dados da <strong>primeira aba/página</strong> da planilha. Certifique-se de que os dados desejados estejam nela.</li>
                                <li>Os dados são atualizados automaticamente todos os dias. Você pode forçar a atualização clicando em "Sincronizar".</li>
                            </ul>
                        </div>
                    </TabsContent>

                    <TabsContent value="analise">
                        <SheetAnalysis data={data} title={`Análise de ${linkName}`} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};
