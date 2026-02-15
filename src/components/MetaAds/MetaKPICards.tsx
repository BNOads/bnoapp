import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, Target, ShoppingCart, Users, BarChart3 } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trend?: number;
}

const KPICard = ({ label, value, icon, trend }: KPICardProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className="text-xl font-bold">{value}</p>
      {trend !== undefined && trend !== 0 && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </CardContent>
  </Card>
);

const METRIC_ICONS: Record<string, React.ReactNode> = {
  investimento: <DollarSign className="h-4 w-4" />,
  impressoes: <Eye className="h-4 w-4" />,
  alcance: <Users className="h-4 w-4" />,
  cliques: <MousePointer className="h-4 w-4" />,
  ctr: <BarChart3 className="h-4 w-4" />,
  cpc: <DollarSign className="h-4 w-4" />,
  cpm: <DollarSign className="h-4 w-4" />,
  conversoes: <Target className="h-4 w-4" />,
  cpa: <DollarSign className="h-4 w-4" />,
  roas: <TrendingUp className="h-4 w-4" />,
  vendas: <ShoppingCart className="h-4 w-4" />,
  leads: <Users className="h-4 w-4" />,
  checkouts: <ShoppingCart className="h-4 w-4" />,
};

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

interface MetaKPICardsProps {
  metrics: ConsolidatedMetrics;
  isMetricVisible: (name: string) => boolean;
  customMetrics?: Array<{ metric_name: string; metric_label: string | null; metric_type: string; metric_event: string | null }>;
  getCustomMetricTotal?: (actionType: string) => number;
  getCustomMetricValueTotal?: (actionType: string) => number;
}

function formatValue(value: number, type: string): string {
  if (type === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  if (type === 'percentage') {
    return `${value.toFixed(2)}%`;
  }
  if (type === 'multiplier') {
    return `${value.toFixed(2)}x`;
  }
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

const METRIC_CONFIGS: Array<{ key: keyof ConsolidatedMetrics; label: string; type: string }> = [
  { key: 'investimento', label: 'Investimento', type: 'currency' },
  { key: 'impressoes', label: 'Impressões', type: 'number' },
  { key: 'alcance', label: 'Alcance', type: 'number' },
  { key: 'cliques', label: 'Cliques', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'percentage' },
  { key: 'cpc', label: 'CPC', type: 'currency' },
  { key: 'cpm', label: 'CPM', type: 'currency' },
  { key: 'conversoes', label: 'Conversões', type: 'number' },
  { key: 'cpa', label: 'CPA', type: 'currency' },
  { key: 'roas', label: 'ROAS', type: 'multiplier' },
  { key: 'vendas', label: 'Vendas', type: 'number' },
  { key: 'leads', label: 'Leads', type: 'number' },
  { key: 'checkouts', label: 'Checkouts', type: 'number' },
];

export const MetaKPICards = ({ metrics, isMetricVisible, customMetrics, getCustomMetricTotal, getCustomMetricValueTotal }: MetaKPICardsProps) => {
  const visibleCards = METRIC_CONFIGS.filter(m => isMetricVisible(m.key));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {visibleCards.map(({ key, label, type }) => (
        <KPICard
          key={key}
          label={label}
          value={formatValue(metrics[key], type)}
          icon={METRIC_ICONS[key]}
        />
      ))}

      {/* Custom metrics */}
      {customMetrics?.filter(m => m.metric_event).map((custom) => {
        const total = custom.metric_type === 'currency'
          ? getCustomMetricValueTotal?.(custom.metric_event!) || 0
          : getCustomMetricTotal?.(custom.metric_event!) || 0;

        return (
          <KPICard
            key={custom.metric_name}
            label={custom.metric_label || custom.metric_name}
            value={formatValue(total, custom.metric_type)}
            icon={<Target className="h-4 w-4" />}
          />
        );
      })}
    </div>
  );
};
