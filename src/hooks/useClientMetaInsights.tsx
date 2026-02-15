import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { calculateMetrics, type RawTrafficData } from '@/lib/trafficMetrics';

interface MetaInsightDaily {
  id: string;
  ad_account_id: string;
  entity_id: string;
  level: string;
  date: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  frequency: number | null;
  unique_clicks: number | null;
  actions: any;
  action_values: any;
  cost_per_action: any;
  conversions: number | null;
  conversion_values: number | null;
  video_views: number | null;
  raw_data: any;
}

interface ConsolidatedMetrics {
  investimento: number;
  impressoes: number;
  cliques: number;
  alcance: number;
  ctr: number;
  cpm: number;
  cpc: number;
  conversoes: number;
  valorConversoes: number;
  cpa: number;
  roas: number;
  frequencia: number;
  videoViews: number;
  leads: number;
  vendas: number;
  checkouts: number;
}

function extractActionValue(actions: any[], actionType: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const action = actions.find((a: any) => a.action_type === actionType);
  return action ? Number(action.value) : 0;
}

function extractActionMoneyValue(actionValues: any[], actionType: string): number {
  if (!actionValues || !Array.isArray(actionValues)) return 0;
  const action = actionValues.find((a: any) => a.action_type === actionType);
  return action ? Number(action.value) : 0;
}

export const useClientMetaInsights = (
  clienteId: string | undefined,
  dateFrom?: string,
  dateTo?: string
) => {
  const today = new Date();
  const defaultDateFrom = dateFrom || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultDateTo = dateTo || today.toISOString().split('T')[0];

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-meta-insights', clienteId, defaultDateFrom, defaultDateTo],
    queryFn: async () => {
      if (!clienteId) return null;

      // 1. Get ad account IDs for this client
      const { data: clientAccounts, error: accErr } = await supabase
        .from('meta_client_ad_accounts')
        .select('ad_account_id')
        .eq('cliente_id', clienteId);

      if (accErr) throw accErr;
      if (!clientAccounts || clientAccounts.length === 0) return null;

      const accountIds = clientAccounts.map(a => a.ad_account_id);

      // 2. Fetch daily insights for these accounts
      const { data: insights, error: insErr } = await supabase
        .from('meta_insights_daily')
        .select('*')
        .in('ad_account_id', accountIds)
        .eq('level', 'account')
        .gte('date', defaultDateFrom)
        .lte('date', defaultDateTo)
        .order('date', { ascending: true });

      if (insErr) throw insErr;

      // 3. Fetch campaigns for these accounts
      const { data: campaigns } = await supabase
        .from('meta_campaigns')
        .select('*')
        .in('ad_account_id', accountIds)
        .order('name');

      return {
        insights: insights || [],
        campaigns: campaigns || [],
        accountIds,
      };
    },
    enabled: !!clienteId,
  });

  // Consolidate metrics across all accounts
  const consolidated: ConsolidatedMetrics | null = data?.insights
    ? (() => {
        const insights = data.insights as MetaInsightDaily[];
        let totalSpend = 0;
        let totalImpressions = 0;
        let totalClicks = 0;
        let totalReach = 0;
        let totalConversions = 0;
        let totalConversionValues = 0;
        let totalVideoViews = 0;
        let totalLeads = 0;
        let totalPurchases = 0;
        let totalCheckouts = 0;

        for (const insight of insights) {
          totalSpend += insight.spend || 0;
          totalImpressions += insight.impressions || 0;
          totalClicks += insight.clicks || 0;
          totalReach += insight.reach || 0;
          totalConversions += insight.conversions || 0;
          totalConversionValues += insight.conversion_values || 0;
          totalVideoViews += insight.video_views || 0;
          totalLeads += extractActionValue(insight.actions, 'lead');
          totalPurchases += extractActionValue(insight.actions, 'purchase');
          totalCheckouts += extractActionValue(insight.actions, 'initiate_checkout');
        }

        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
        const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
        const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
        const roas = totalSpend > 0 ? totalConversionValues / totalSpend : 0;
        const frequencia = totalReach > 0 ? totalImpressions / totalReach : 0;

        return {
          investimento: totalSpend,
          impressoes: totalImpressions,
          cliques: totalClicks,
          alcance: totalReach,
          ctr,
          cpm,
          cpc,
          conversoes: totalConversions,
          valorConversoes: totalConversionValues,
          cpa,
          roas,
          frequencia,
          videoViews: totalVideoViews,
          leads: totalLeads,
          vendas: totalPurchases,
          checkouts: totalCheckouts,
        };
      })()
    : null;

  // Group insights by date for trend chart
  const dailyData = data?.insights
    ? (() => {
        const byDate: Record<string, { date: string; spend: number; impressions: number; clicks: number; conversions: number; conversion_values: number }> = {};

        for (const insight of data.insights as MetaInsightDaily[]) {
          if (!byDate[insight.date]) {
            byDate[insight.date] = { date: insight.date, spend: 0, impressions: 0, clicks: 0, conversions: 0, conversion_values: 0 };
          }
          byDate[insight.date].spend += insight.spend || 0;
          byDate[insight.date].impressions += insight.impressions || 0;
          byDate[insight.date].clicks += insight.clicks || 0;
          byDate[insight.date].conversions += insight.conversions || 0;
          byDate[insight.date].conversion_values += insight.conversion_values || 0;
        }

        return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
      })()
    : [];

  // Group insights by account for drill-down
  const byAccount = data?.insights
    ? (() => {
        const grouped: Record<string, MetaInsightDaily[]> = {};
        for (const insight of data.insights as MetaInsightDaily[]) {
          if (!grouped[insight.ad_account_id]) {
            grouped[insight.ad_account_id] = [];
          }
          grouped[insight.ad_account_id].push(insight);
        }
        return grouped;
      })()
    : {};

  // Extract custom action values for custom metrics
  const getCustomMetricTotal = (actionType: string): number => {
    if (!data?.insights) return 0;
    let total = 0;
    for (const insight of data.insights as MetaInsightDaily[]) {
      total += extractActionValue(insight.actions, actionType);
    }
    return total;
  };

  const getCustomMetricValueTotal = (actionType: string): number => {
    if (!data?.insights) return 0;
    let total = 0;
    for (const insight of data.insights as MetaInsightDaily[]) {
      total += extractActionMoneyValue(insight.action_values, actionType);
    }
    return total;
  };

  return {
    consolidated,
    dailyData,
    byAccount,
    campaigns: data?.campaigns || [],
    rawInsights: data?.insights || [],
    isLoading,
    error,
    hasData: !!data && data.insights.length > 0,
    getCustomMetricTotal,
    getCustomMetricValueTotal,
  };
};
