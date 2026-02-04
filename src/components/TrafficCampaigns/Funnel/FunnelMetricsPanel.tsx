import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, DollarSign, Target, TrendingUp, BarChart3 } from 'lucide-react';
import {
  TrafficMetrics,
  formatMetricValue,
  getMetricFormat,
  getMetricLabel,
  getMetricTooltip,
  getPerformanceStatus,
  getStatusBgClass,
} from '@/lib/trafficMetrics';

interface FunnelMetricsPanelProps {
  metrics: TrafficMetrics;
}

interface MetricDisplayProps {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percentage' | 'multiplier';
  tooltip: string;
  status?: 'green' | 'yellow' | 'red';
  icon?: React.ReactNode;
}

function MetricDisplay({ label, value, format, tooltip, status, icon }: MetricDisplayProps) {
  const statusClass = status ? getStatusBgClass(status) : '';

  return (
    <TooltipProvider>
      <div className={`p-3 rounded-lg border ${statusClass || 'bg-muted/30'}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xl font-bold">{formatMetricValue(value, format)}</p>
      </div>
    </TooltipProvider>
  );
}

export default function FunnelMetricsPanel({ metrics }: FunnelMetricsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Metricas Principais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Investment & Revenue */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MetricDisplay
              label="Investimento"
              value={metrics.investimento}
              format="currency"
              tooltip={getMetricTooltip('investimento')}
              icon={<DollarSign className="h-3 w-3 text-red-500" />}
            />
            <MetricDisplay
              label="Receita"
              value={metrics.valorTotal}
              format="currency"
              tooltip={getMetricTooltip('valorTotal')}
              icon={<DollarSign className="h-3 w-3 text-green-500" />}
            />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MetricDisplay
              label="ROI"
              value={metrics.roi}
              format="percentage"
              tooltip={getMetricTooltip('roi')}
              status={getPerformanceStatus('roi', metrics.roi)}
            />
            <MetricDisplay
              label="ROAS"
              value={metrics.roas}
              format="multiplier"
              tooltip={getMetricTooltip('roas')}
              status={getPerformanceStatus('roas', metrics.roas)}
            />
          </div>
        </div>

        {/* Cost Metrics */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            Custos
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MetricDisplay
              label="CPM"
              value={metrics.cpm}
              format="currency"
              tooltip={getMetricTooltip('cpm')}
              status={getPerformanceStatus('cpm', metrics.cpm)}
            />
            <MetricDisplay
              label="CPC"
              value={metrics.cpc}
              format="currency"
              tooltip={getMetricTooltip('cpc')}
              status={getPerformanceStatus('cpc', metrics.cpc)}
            />
            <MetricDisplay
              label="CPL"
              value={metrics.cpl}
              format="currency"
              tooltip={getMetricTooltip('cpl')}
              status={getPerformanceStatus('cpl', metrics.cpl)}
            />
            <MetricDisplay
              label="CPA"
              value={metrics.cpa}
              format="currency"
              tooltip={getMetricTooltip('cpa')}
              status={getPerformanceStatus('cpa', metrics.cpa)}
            />
          </div>
        </div>

        {/* Rates */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Taxas</h4>
          <div className="grid grid-cols-2 gap-2">
            <MetricDisplay
              label="CTR"
              value={metrics.ctr}
              format="percentage"
              tooltip={getMetricTooltip('ctr')}
              status={getPerformanceStatus('ctr', metrics.ctr)}
            />
            <MetricDisplay
              label="Conversao"
              value={metrics.conversionRate}
              format="percentage"
              tooltip={getMetricTooltip('conversionRate')}
              status={getPerformanceStatus('conversionRate', metrics.conversionRate)}
            />
            <MetricDisplay
              label="Carregamento"
              value={metrics.loadingRate}
              format="percentage"
              tooltip={getMetricTooltip('loadingRate')}
              status={getPerformanceStatus('loadingRate', metrics.loadingRate)}
            />
            <MetricDisplay
              label="Checkout"
              value={metrics.checkoutRate}
              format="percentage"
              tooltip={getMetricTooltip('checkoutRate')}
              status={getPerformanceStatus('checkoutRate', metrics.checkoutRate)}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {formatMetricValue(metrics.impressoes, 'number')}
              </p>
              <p className="text-xs text-muted-foreground">Impressoes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {formatMetricValue(metrics.cliques, 'number')}
              </p>
              <p className="text-xs text-muted-foreground">Cliques</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {formatMetricValue(metrics.vendas, 'number')}
              </p>
              <p className="text-xs text-muted-foreground">Vendas</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
