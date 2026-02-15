import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BarChart3 } from "lucide-react";
import { useClientMetaInsights } from "@/hooks/useClientMetaInsights";
import { useClientMetaSettings } from "@/hooks/useClientMetaSettings";
import { MetaKPICards } from "./MetaKPICards";
import { MetaTrendChart } from "./MetaTrendChart";
import { MetaAccountDrilldown } from "./MetaAccountDrilldown";

interface ClienteAnunciosDashboardProps {
  clienteId: string;
}

type PeriodOption = '7d' | '14d' | '30d' | '90d' | 'month';

function getDateRange(period: PeriodOption): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().split('T')[0];

  if (period === 'month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: firstDay.toISOString().split('T')[0], to };
  }

  const days = period === '7d' ? 7 : period === '14d' ? 14 : period === '90d' ? 90 : 30;
  const from = new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { from, to };
}

export const ClienteAnunciosDashboard = ({ clienteId }: ClienteAnunciosDashboardProps) => {
  const [period, setPeriod] = useState<PeriodOption>('30d');
  const { from, to } = getDateRange(period);

  const {
    consolidated,
    dailyData,
    byAccount,
    campaigns,
    isLoading,
    hasData,
    getCustomMetricTotal,
    getCustomMetricValueTotal,
  } = useClientMetaInsights(clienteId, from, to);

  const {
    isMetricVisible,
    customMetrics,
    isLoading: settingsLoading,
  } = useClientMetaSettings(clienteId);

  // Get account IDs from byAccount
  const accountIds = Object.keys(byAccount);

  if (isLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando dados de anúncios...</span>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum dado de anúncio disponível para este cliente.</p>
        <p className="text-xs mt-1">Vincule contas de anúncio e sincronize os dados em Ferramentas → Integrações Meta Ads.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Anúncios Meta Ads
        </h3>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="14d">Últimos 14 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="month">Mês atual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {consolidated && (
        <MetaKPICards
          metrics={consolidated}
          isMetricVisible={isMetricVisible}
          customMetrics={customMetrics}
          getCustomMetricTotal={getCustomMetricTotal}
          getCustomMetricValueTotal={getCustomMetricValueTotal}
        />
      )}

      {/* Trend Chart */}
      <MetaTrendChart data={dailyData} />

      {/* Account Drilldown / Campaigns */}
      <MetaAccountDrilldown
        accountIds={accountIds}
        byAccount={byAccount}
        campaigns={campaigns}
      />
    </div>
  );
};
