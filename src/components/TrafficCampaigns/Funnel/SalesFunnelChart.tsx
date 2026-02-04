import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Image, Users, Globe, ShoppingCart, CheckCircle, TrendingDown, ArrowDown } from 'lucide-react';
import {
  TrafficMetrics,
  FUNNEL_STAGES,
  calculateFunnelData,
  formatMetricValue,
  getStatusColor,
  getStatusBgClass,
  PerformanceStatus,
} from '@/lib/trafficMetrics';

interface SalesFunnelChartProps {
  metrics: TrafficMetrics;
  onStageClick?: (stageKey: string) => void;
  showDropRates?: boolean;
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  criativo: <Image className="h-5 w-5" />,
  publico: <Users className="h-5 w-5" />,
  pagina: <Globe className="h-5 w-5" />,
  checkout: <ShoppingCart className="h-5 w-5" />,
  conversao: <CheckCircle className="h-5 w-5" />,
};

export default function SalesFunnelChart({
  metrics,
  onStageClick,
  showDropRates = true,
}: SalesFunnelChartProps) {
  const funnelData = useMemo(() => calculateFunnelData(metrics), [metrics]);

  const getStatusBadge = (status: PerformanceStatus) => {
    const labels = {
      green: 'Bom',
      yellow: 'Atencao',
      red: 'Critico',
    };
    return (
      <Badge variant="outline" className={getStatusBgClass(status)}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* SVG Funnel */}
            <svg
              viewBox="0 0 400 300"
              className="w-full h-auto"
              style={{ maxHeight: '400px' }}
            >
              <defs>
                {funnelData.map((item, index) => (
                  <linearGradient
                    key={`gradient-${item.stage.key}`}
                    id={`gradient-${item.stage.key}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor={getStatusColor(item.status)}
                      stopOpacity="0.8"
                    />
                    <stop
                      offset="100%"
                      stopColor={getStatusColor(item.status)}
                      stopOpacity="0.6"
                    />
                  </linearGradient>
                ))}
              </defs>

              {funnelData.map((item, index) => {
                const totalStages = funnelData.length;
                const stageHeight = 50;
                const gap = 5;
                const y = index * (stageHeight + gap) + 10;

                // Calculate trapezoid widths based on percentage
                const maxWidth = 380;
                const minWidth = 80;
                const topWidthRatio = index === 0 ? 1 : funnelData[index - 1].percentage / 100;
                const bottomWidthRatio = item.percentage / 100;

                const topWidth = minWidth + (maxWidth - minWidth) * topWidthRatio;
                const bottomWidth = minWidth + (maxWidth - minWidth) * bottomWidthRatio;

                const centerX = 200;
                const topLeft = centerX - topWidth / 2;
                const topRight = centerX + topWidth / 2;
                const bottomLeft = centerX - bottomWidth / 2;
                const bottomRight = centerX + bottomWidth / 2;

                const path = `
                  M ${topLeft} ${y}
                  L ${topRight} ${y}
                  L ${bottomRight} ${y + stageHeight}
                  L ${bottomLeft} ${y + stageHeight}
                  Z
                `;

                return (
                  <g key={item.stage.key}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <path
                          d={path}
                          fill={`url(#gradient-${item.stage.key})`}
                          stroke={getStatusColor(item.status)}
                          strokeWidth="2"
                          className="cursor-pointer transition-all hover:opacity-80"
                          onClick={() => onStageClick?.(item.stage.key)}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">{item.stage.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.stage.description}
                          </p>
                          <p className="text-lg font-bold">
                            {formatMetricValue(item.value, 'number')}
                          </p>
                          {index > 0 && (
                            <p className="text-sm text-red-500">
                              Perda: {item.dropRate.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Stage label */}
                    <text
                      x={centerX}
                      y={y + stageHeight / 2 + 5}
                      textAnchor="middle"
                      className="fill-white font-semibold text-sm pointer-events-none"
                      style={{ fontSize: '12px' }}
                    >
                      {item.stage.label}: {formatMetricValue(item.value, 'number')}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Drop rate indicators */}
            {showDropRates && (
              <div className="absolute right-0 top-0 h-full flex flex-col justify-around py-4 pr-2">
                {funnelData.slice(1).map((item, index) => (
                  <div
                    key={`drop-${item.stage.key}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <ArrowDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-500 font-medium">
                      -{item.dropRate.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-6">
            {funnelData.map((item) => (
              <div
                key={`card-${item.stage.key}`}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getStatusBgClass(
                  item.status
                )}`}
                onClick={() => onStageClick?.(item.stage.key)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="p-1.5 rounded"
                    style={{ backgroundColor: item.stage.color + '20' }}
                  >
                    {STAGE_ICONS[item.stage.key]}
                  </div>
                  <span className="text-xs font-medium">{item.stage.label}</span>
                </div>
                <p className="text-lg font-bold">
                  {formatMetricValue(item.value, 'number')}
                </p>
                <div className="mt-1">{getStatusBadge(item.status)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
