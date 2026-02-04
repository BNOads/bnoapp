import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  TrafficMetrics,
  FUNNEL_STAGES,
  getPerformanceStatus,
  getStatusBgClass,
  formatMetricValue,
  getMetricFormat,
  getMetricLabel,
  getMetricTooltip,
  PerformanceStatus,
} from '@/lib/trafficMetrics';

interface FunnelStageCardProps {
  stageKey: string;
  metrics: TrafficMetrics;
  previousMetrics?: TrafficMetrics;
  onOptimize?: () => void;
}

export default function FunnelStageCard({
  stageKey,
  metrics,
  previousMetrics,
  onOptimize,
}: FunnelStageCardProps) {
  const stage = FUNNEL_STAGES.find((s) => s.key === stageKey);

  if (!stage) return null;

  const getMetricValue = (metricKey: string): number => {
    return (metrics[metricKey as keyof TrafficMetrics] as number) || 0;
  };

  const getPreviousValue = (metricKey: string): number | undefined => {
    if (!previousMetrics) return undefined;
    return (previousMetrics[metricKey as keyof TrafficMetrics] as number) || 0;
  };

  const getChangeIndicator = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;

    if (Math.abs(change) < 1) {
      return (
        <div className="flex items-center text-muted-foreground">
          <Minus className="h-3 w-3 mr-1" />
          <span className="text-xs">0%</span>
        </div>
      );
    }

    if (change > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="h-3 w-3 mr-1" />
          <span className="text-xs">+{change.toFixed(1)}%</span>
        </div>
      );
    }

    return (
      <div className="flex items-center text-red-600">
        <TrendingDown className="h-3 w-3 mr-1" />
        <span className="text-xs">{change.toFixed(1)}%</span>
      </div>
    );
  };

  // Get overall stage status based on primary metric
  const primaryValue = getMetricValue(stage.primaryMetric);
  const stageStatus = getPerformanceStatus(stage.primaryMetric, primaryValue);

  return (
    <TooltipProvider>
      <Card className={`border-l-4`} style={{ borderLeftColor: stage.color }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: stage.color + '20' }}
              >
                <span style={{ color: stage.color }}>{stage.label}</span>
              </div>
            </CardTitle>
            <Badge variant="outline" className={getStatusBgClass(stageStatus)}>
              {stageStatus === 'green' ? 'Bom' : stageStatus === 'yellow' ? 'Atencao' : 'Critico'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{stage.description}</p>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Primary metric highlight */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {getMetricLabel(stage.primaryMetric)}
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getMetricTooltip(stage.primaryMetric)}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold">
                  {formatMetricValue(primaryValue, getMetricFormat(stage.primaryMetric))}
                </span>
                {getChangeIndicator(primaryValue, getPreviousValue(stage.primaryMetric))}
              </div>
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 gap-3">
              {stage.metrics
                .filter((m) => m !== stage.primaryMetric)
                .map((metricKey) => {
                  const value = getMetricValue(metricKey);
                  const previousValue = getPreviousValue(metricKey);
                  const status = getPerformanceStatus(metricKey, value);

                  return (
                    <div
                      key={metricKey}
                      className={`p-3 rounded-lg border ${getStatusBgClass(status)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {getMetricLabel(metricKey)}
                        </span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{getMetricTooltip(metricKey)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-bold">
                          {formatMetricValue(value, getMetricFormat(metricKey))}
                        </span>
                        {getChangeIndicator(value, previousValue)}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Optimization suggestions based on status */}
            {stageStatus !== 'green' && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Sugestao de Otimizacao
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  {getOptimizationSuggestion(stageKey, stageStatus)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function getOptimizationSuggestion(stageKey: string, status: PerformanceStatus): string {
  const suggestions: Record<string, Record<PerformanceStatus, string>> = {
    criativo: {
      yellow: 'Considere testar novos criativos ou ajustar a frequencia de exibicao.',
      red: 'Criativos com baixo desempenho. Teste novos formatos, imagens e copys.',
      green: '',
    },
    publico: {
      yellow: 'CTR pode melhorar. Revise a segmentacao do publico ou teste novos interesses.',
      red: 'CTR muito baixo. Reavalie completamente a segmentacao e o criativo.',
      green: '',
    },
    pagina: {
      yellow: 'Taxa de carregamento pode melhorar. Verifique a velocidade da pagina.',
      red: 'Muitos usuarios abandonando antes de carregar. Otimize a pagina urgentemente.',
      green: '',
    },
    checkout: {
      yellow: 'Taxa de checkout pode melhorar. Simplifique o processo ou adicione gatilhos.',
      red: 'Poucos usuarios iniciando checkout. Revise a oferta, preco ou urgencia.',
      green: '',
    },
    conversao: {
      yellow: 'Taxa de conversao pode melhorar. Revise o checkout ou adicione garantias.',
      red: 'Conversao critica. Verifique problemas tecnicos ou revise toda a estrategia.',
      green: '',
    },
  };

  return suggestions[stageKey]?.[status] || 'Analise os dados para identificar oportunidades.';
}
