import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DollarSign,
  TrendingUp,
  Target,
  MousePointer,
  Eye,
  ShoppingCart,
  Users,
  Info,
} from 'lucide-react';
import {
  TrafficMetrics,
  formatMetricValue,
  getPerformanceStatus,
  getStatusBgClass,
  getMetricTooltip,
} from '@/lib/trafficMetrics';
import { TrafficGoal } from '@/types/traffic';

interface TrafficKPICardsProps {
  metrics: TrafficMetrics;
  goals?: TrafficGoal;
  previousMetrics?: TrafficMetrics;
}

interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'number' | 'percentage' | 'multiplier';
  icon: React.ReactNode;
  tooltip: string;
  goal?: number;
  previousValue?: number;
  status?: 'green' | 'yellow' | 'red';
  colorClass?: string;
}

function KPICard({
  title,
  value,
  format,
  icon,
  tooltip,
  goal,
  previousValue,
  status,
  colorClass = 'text-primary',
}: KPICardProps) {
  const formattedValue = formatMetricValue(value, format);
  const statusClass = status ? getStatusBgClass(status) : '';
  const progressPercent = goal && goal > 0 ? Math.min((value / goal) * 100, 100) : null;

  const change =
    previousValue !== undefined && previousValue > 0
      ? ((value - previousValue) / previousValue) * 100
      : null;

  return (
    <TooltipProvider>
      <Card className={statusClass}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={colorClass}>{icon}</div>
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-end justify-between">
            <div className={`text-2xl font-bold ${colorClass}`}>{formattedValue}</div>
            {change !== null && (
              <div
                className={`text-xs font-medium ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}%
              </div>
            )}
          </div>

          {goal !== undefined && progressPercent !== null && (
            <div className="mt-2">
              <Progress value={progressPercent} className="h-1.5" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  Meta: {formatMetricValue(goal, format)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default function TrafficKPICards({
  metrics,
  goals,
  previousMetrics,
}: TrafficKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Investimento */}
      <KPICard
        title="Investimento"
        value={metrics.investimento}
        format="currency"
        icon={<DollarSign className="h-4 w-4" />}
        tooltip={getMetricTooltip('investimento')}
        previousValue={previousMetrics?.investimento}
        colorClass="text-red-500"
      />

      {/* Receita/Valor Total */}
      <KPICard
        title="Receita"
        value={metrics.valorTotal}
        format="currency"
        icon={<DollarSign className="h-4 w-4" />}
        tooltip={getMetricTooltip('valorTotal')}
        previousValue={previousMetrics?.valorTotal}
        colorClass="text-green-500"
      />

      {/* ROI */}
      <KPICard
        title="ROI"
        value={metrics.roi}
        format="percentage"
        icon={<TrendingUp className="h-4 w-4" />}
        tooltip={getMetricTooltip('roi')}
        goal={goals?.meta_roi}
        previousValue={previousMetrics?.roi}
        status={getPerformanceStatus('roi', metrics.roi)}
        colorClass="text-purple-500"
      />

      {/* ROAS */}
      <KPICard
        title="ROAS"
        value={metrics.roas}
        format="multiplier"
        icon={<Target className="h-4 w-4" />}
        tooltip={getMetricTooltip('roas')}
        previousValue={previousMetrics?.roas}
        status={getPerformanceStatus('roas', metrics.roas)}
        colorClass="text-orange-500"
      />

      {/* CTR */}
      <KPICard
        title="CTR"
        value={metrics.ctr}
        format="percentage"
        icon={<MousePointer className="h-4 w-4" />}
        tooltip={getMetricTooltip('ctr')}
        goal={goals?.meta_ctr}
        previousValue={previousMetrics?.ctr}
        status={getPerformanceStatus('ctr', metrics.ctr)}
        colorClass="text-blue-500"
      />

      {/* CPM */}
      <KPICard
        title="CPM"
        value={metrics.cpm}
        format="currency"
        icon={<Eye className="h-4 w-4" />}
        tooltip={getMetricTooltip('cpm')}
        goal={goals?.meta_cpm}
        previousValue={previousMetrics?.cpm}
        status={getPerformanceStatus('cpm', metrics.cpm)}
        colorClass="text-cyan-500"
      />

      {/* CPA */}
      <KPICard
        title="CPA"
        value={metrics.cpa}
        format="currency"
        icon={<ShoppingCart className="h-4 w-4" />}
        tooltip={getMetricTooltip('cpa')}
        goal={goals?.meta_cpa}
        previousValue={previousMetrics?.cpa}
        status={getPerformanceStatus('cpa', metrics.cpa)}
        colorClass="text-amber-500"
      />

      {/* Taxa de Conversao */}
      <KPICard
        title="Conversao"
        value={metrics.conversionRate}
        format="percentage"
        icon={<Users className="h-4 w-4" />}
        tooltip={getMetricTooltip('conversionRate')}
        goal={goals?.meta_conversao}
        previousValue={previousMetrics?.conversionRate}
        status={getPerformanceStatus('conversionRate', metrics.conversionRate)}
        colorClass="text-emerald-500"
      />
    </div>
  );
}
