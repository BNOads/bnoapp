// Traffic Campaign Metrics Calculations and Utilities

export interface RawTrafficData {
  investimento: number;
  impressoes: number;
  cliques: number;
  pageViews: number;
  checkouts: number;
  vendas: number;
  leads: number;
  valorTotal: number;
}

export interface TrafficMetrics extends RawTrafficData {
  // Calculated metrics
  cpm: number;           // Cost Per Mille (investimento / impressoes) * 1000
  ctr: number;           // Click Through Rate (cliques / impressoes) * 100
  cpc: number;           // Cost Per Click (investimento / cliques)
  cpl: number;           // Cost Per Lead (investimento / leads)
  cpa: number;           // Cost Per Acquisition (investimento / vendas)
  roi: number;           // Return on Investment ((valorTotal - investimento) / investimento) * 100
  roas: number;          // Return on Ad Spend (valorTotal / investimento)
  checkoutRate: number;  // Taxa de Checkout (checkouts / pageViews) * 100
  conversionRate: number; // Taxa de Conversao (vendas / cliques) * 100
  loadingRate: number;   // Taxa de Carregamento (pageViews / cliques) * 100
  ticketMedio: number;   // Ticket Medio (valorTotal / vendas)
}

export type PerformanceStatus = 'green' | 'yellow' | 'red';

export interface MetricThreshold {
  green: number;
  yellow: number;
  higherIsBetter: boolean;
}

// Default thresholds for each metric
export const METRIC_THRESHOLDS: Record<string, MetricThreshold> = {
  cpm: { green: 15, yellow: 25, higherIsBetter: false },      // CPM bom < R$15
  ctr: { green: 1.5, yellow: 0.8, higherIsBetter: true },     // CTR bom > 1.5%
  cpc: { green: 1.5, yellow: 3, higherIsBetter: false },      // CPC bom < R$1.50
  cpl: { green: 20, yellow: 50, higherIsBetter: false },      // CPL bom < R$20
  cpa: { green: 100, yellow: 200, higherIsBetter: false },    // CPA bom < R$100
  roi: { green: 100, yellow: 50, higherIsBetter: true },      // ROI bom > 100%
  roas: { green: 3, yellow: 2, higherIsBetter: true },        // ROAS bom > 3x
  checkoutRate: { green: 30, yellow: 15, higherIsBetter: true },  // Checkout > 30%
  conversionRate: { green: 3, yellow: 1.5, higherIsBetter: true }, // Conversao > 3%
  loadingRate: { green: 85, yellow: 70, higherIsBetter: true },    // Carregamento > 85%
};

// Funnel stages definition
export interface FunnelStage {
  key: string;
  label: string;
  description: string;
  icon: string;
  metrics: string[];
  primaryMetric: string;
  color: string;
}

export const FUNNEL_STAGES: FunnelStage[] = [
  {
    key: 'criativo',
    label: 'Criativo',
    description: 'Impressoes e alcance do anuncio',
    icon: 'Image',
    metrics: ['impressoes', 'cpm'],
    primaryMetric: 'impressoes',
    color: '#3B82F6', // blue
  },
  {
    key: 'publico',
    label: 'Publico',
    description: 'Cliques e interesse gerado',
    icon: 'Users',
    metrics: ['cliques', 'ctr', 'cpc'],
    primaryMetric: 'cliques',
    color: '#8B5CF6', // purple
  },
  {
    key: 'pagina',
    label: 'Pagina',
    description: 'Visualizacoes e carregamento',
    icon: 'Globe',
    metrics: ['pageViews', 'loadingRate'],
    primaryMetric: 'pageViews',
    color: '#F59E0B', // amber
  },
  {
    key: 'checkout',
    label: 'Checkout',
    description: 'Inicio do processo de compra',
    icon: 'ShoppingCart',
    metrics: ['checkouts', 'checkoutRate'],
    primaryMetric: 'checkouts',
    color: '#F97316', // orange
  },
  {
    key: 'conversao',
    label: 'Conversao',
    description: 'Vendas concluidas',
    icon: 'CheckCircle',
    metrics: ['vendas', 'conversionRate', 'roi', 'roas'],
    primaryMetric: 'vendas',
    color: '#10B981', // green
  },
];

/**
 * Calculate all traffic metrics from raw data
 */
export function calculateMetrics(data: RawTrafficData): TrafficMetrics {
  const safeDiv = (a: number, b: number, fallback = 0): number => {
    return b > 0 ? a / b : fallback;
  };

  return {
    ...data,
    cpm: safeDiv(data.investimento, data.impressoes) * 1000,
    ctr: safeDiv(data.cliques, data.impressoes) * 100,
    cpc: safeDiv(data.investimento, data.cliques),
    cpl: safeDiv(data.investimento, data.leads),
    cpa: safeDiv(data.investimento, data.vendas),
    roi: safeDiv(data.valorTotal - data.investimento, data.investimento) * 100,
    roas: safeDiv(data.valorTotal, data.investimento),
    checkoutRate: safeDiv(data.checkouts, data.pageViews) * 100,
    conversionRate: safeDiv(data.vendas, data.cliques) * 100,
    loadingRate: safeDiv(data.pageViews, data.cliques) * 100,
    ticketMedio: safeDiv(data.valorTotal, data.vendas),
  };
}

/**
 * Get performance status (green/yellow/red) for a metric
 */
export function getPerformanceStatus(
  metric: string,
  value: number,
  customThresholds?: Partial<Record<string, MetricThreshold>>
): PerformanceStatus {
  const thresholds = customThresholds?.[metric] || METRIC_THRESHOLDS[metric];

  if (!thresholds) {
    return 'green'; // Default to green if no threshold defined
  }

  if (thresholds.higherIsBetter) {
    if (value >= thresholds.green) return 'green';
    if (value >= thresholds.yellow) return 'yellow';
    return 'red';
  } else {
    if (value <= thresholds.green) return 'green';
    if (value <= thresholds.yellow) return 'yellow';
    return 'red';
  }
}

/**
 * Get color for performance status
 */
export function getStatusColor(status: PerformanceStatus): string {
  const colors = {
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
  };
  return colors[status];
}

/**
 * Get background color class for performance status
 */
export function getStatusBgClass(status: PerformanceStatus): string {
  const classes = {
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  return classes[status];
}

/**
 * Format metric value for display
 */
export function formatMetricValue(
  value: number | null | undefined,
  format: 'currency' | 'number' | 'percentage' | 'multiplier'
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'multiplier':
      return `${value.toFixed(2)}x`;
    case 'number':
    default:
      return new Intl.NumberFormat('pt-BR').format(Math.round(value));
  }
}

/**
 * Get format type for a metric
 */
export function getMetricFormat(metric: string): 'currency' | 'number' | 'percentage' | 'multiplier' {
  const currencyMetrics = ['investimento', 'valorTotal', 'cpm', 'cpc', 'cpl', 'cpa', 'ticketMedio'];
  const percentageMetrics = ['ctr', 'roi', 'checkoutRate', 'conversionRate', 'loadingRate'];
  const multiplierMetrics = ['roas'];

  if (currencyMetrics.includes(metric)) return 'currency';
  if (percentageMetrics.includes(metric)) return 'percentage';
  if (multiplierMetrics.includes(metric)) return 'multiplier';
  return 'number';
}

/**
 * Get metric label in Portuguese
 */
export function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    investimento: 'Investimento',
    impressoes: 'Impressoes',
    cliques: 'Cliques',
    pageViews: 'Visualizacoes de Pagina',
    checkouts: 'Checkouts',
    vendas: 'Vendas',
    leads: 'Leads',
    valorTotal: 'Valor Total',
    cpm: 'CPM',
    ctr: 'CTR',
    cpc: 'CPC',
    cpl: 'CPL',
    cpa: 'CPA',
    roi: 'ROI',
    roas: 'ROAS',
    checkoutRate: 'Taxa de Checkout',
    conversionRate: 'Taxa de Conversao',
    loadingRate: 'Taxa de Carregamento',
    ticketMedio: 'Ticket Medio',
  };
  return labels[metric] || metric;
}

/**
 * Get metric tooltip/description
 */
export function getMetricTooltip(metric: string): string {
  const tooltips: Record<string, string> = {
    investimento: 'Valor total investido em midia',
    impressoes: 'Numero de vezes que o anuncio foi exibido',
    cliques: 'Cliques no link do anuncio',
    pageViews: 'Visualizacoes da pagina de destino',
    checkouts: 'Usuarios que iniciaram o checkout',
    vendas: 'Numero de compras concluidas',
    leads: 'Leads captados (formularios, WhatsApp, etc)',
    valorTotal: 'Receita total gerada',
    cpm: 'Custo por Mil Impressoes (Investimento / Impressoes × 1000)',
    ctr: 'Taxa de Cliques (Cliques / Impressoes × 100)',
    cpc: 'Custo por Clique (Investimento / Cliques)',
    cpl: 'Custo por Lead (Investimento / Leads)',
    cpa: 'Custo por Aquisicao (Investimento / Vendas)',
    roi: 'Retorno sobre Investimento ((Receita - Investimento) / Investimento × 100)',
    roas: 'Retorno sobre Gasto com Anuncios (Receita / Investimento)',
    checkoutRate: 'Taxa de Checkout (Checkouts / Visualizacoes × 100)',
    conversionRate: 'Taxa de Conversao (Vendas / Cliques × 100)',
    loadingRate: 'Taxa de Carregamento da Pagina (Visualizacoes / Cliques × 100)',
    ticketMedio: 'Valor medio por venda (Receita / Vendas)',
  };
  return tooltips[metric] || '';
}

/**
 * Calculate funnel data for visualization
 */
export function calculateFunnelData(metrics: TrafficMetrics): {
  stage: FunnelStage;
  value: number;
  percentage: number;
  status: PerformanceStatus;
  dropRate: number;
}[] {
  const values = [
    metrics.impressoes,
    metrics.cliques,
    metrics.pageViews,
    metrics.checkouts,
    metrics.vendas,
  ];

  const maxValue = Math.max(...values.filter(v => v > 0), 1);

  return FUNNEL_STAGES.map((stage, index) => {
    const value = values[index];
    const previousValue = index > 0 ? values[index - 1] : value;
    const dropRate = previousValue > 0 ? ((previousValue - value) / previousValue) * 100 : 0;

    // Determine status based on the stage's conversion rate
    let status: PerformanceStatus = 'green';
    if (index > 0 && previousValue > 0) {
      const conversionRateAtStage = (value / previousValue) * 100;
      const expectedRates: Record<string, number> = {
        publico: 1.5,     // CTR esperado
        pagina: 85,       // Loading rate esperado
        checkout: 30,     // Checkout rate esperado
        conversao: 50,    // Conversion from checkout esperado
      };
      const expected = expectedRates[stage.key] || 50;
      if (conversionRateAtStage >= expected) status = 'green';
      else if (conversionRateAtStage >= expected * 0.5) status = 'yellow';
      else status = 'red';
    }

    return {
      stage,
      value,
      percentage: (value / maxValue) * 100,
      status,
      dropRate,
    };
  });
}

/**
 * Compare metrics between two periods
 */
export function compareMetrics(
  current: TrafficMetrics,
  previous: TrafficMetrics
): Record<string, { current: number; previous: number; change: number; changePercent: number }> {
  const metricsToCompare = [
    'investimento', 'impressoes', 'cliques', 'vendas', 'valorTotal',
    'cpm', 'ctr', 'cpc', 'cpa', 'roi', 'roas', 'conversionRate'
  ];

  const comparison: Record<string, any> = {};

  for (const metric of metricsToCompare) {
    const currentValue = current[metric as keyof TrafficMetrics] as number || 0;
    const previousValue = previous[metric as keyof TrafficMetrics] as number || 0;
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

    comparison[metric] = {
      current: currentValue,
      previous: previousValue,
      change,
      changePercent,
    };
  }

  return comparison;
}
