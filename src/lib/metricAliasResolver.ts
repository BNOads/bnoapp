// Metric alias resolver for normalizing traffic metrics from different sources
export interface MetricAliasMap {
  [standardName: string]: string[];
}

// Standard metric names mapping to their aliases
export const METRIC_ALIASES: MetricAliasMap = {
  investimento: ['spend', 'gasto', 'investimento_total', 'cost', 'amount_spent'],
  leads: ['leads', 'cadastros', 'registros', 'lead_form_submissions', 'registrations'],
  cpl: ['cpl', 'cost_per_lead', 'custo_por_lead'],
  impressoes: ['impressoes', 'impressions', 'reach', 'alcance'],
  cpm: ['cpm', 'cost_per_mille', 'cost_per_thousand', 'custo_por_mil'],
  cliques: ['cliques_link', 'link_clicks', 'clicks', 'cliques', 'click'],
  ctr: ['ctr_link', 'click_through_rate', 'taxa_cliques'],
  cpc: ['cpc', 'cost_per_click', 'custo_por_clique'],
  connect_rate: ['connect_rate', 'taxa_conexao', 'conversion_rate_clicks'],
  tx_conversao_pg: ['tx_conversao_pg', 'page_conv_rate', 'taxa_conversao_pagina'],
  vendas: ['vendas', 'sales', 'purchases', 'compras', 'orders'],
  cac: ['cac', 'cost_per_acquisition', 'custo_aquisicao_cliente'],
  conversoes_pagina: ['conversions', 'conversoes', 'page_conversions'],
  visitas_pagina: ['page_views', 'visitas', 'views', 'visualizacoes']
};

// Reverse mapping for faster lookups - alias to standard name
const ALIAS_TO_STANDARD: Record<string, string> = {};

// Build reverse mapping
Object.entries(METRIC_ALIASES).forEach(([standardName, aliases]) => {
  aliases.forEach(alias => {
    ALIAS_TO_STANDARD[alias.toLowerCase()] = standardName;
  });
  // Also map the standard name to itself
  ALIAS_TO_STANDARD[standardName.toLowerCase()] = standardName;
});

// Track unmatched aliases for debugging
const unmatchedAliases = new Set<string>();

/**
 * Normalizes a metric name to its standard Portuguese equivalent
 * @param metricName - The metric name to normalize
 * @returns The standard metric name or null if not found
 */
export function normalizeMetricName(metricName: string): string | null {
  if (!metricName) return null;
  
  const normalized = metricName.toLowerCase().trim();
  const standardName = ALIAS_TO_STANDARD[normalized];
  
  if (!standardName) {
    unmatchedAliases.add(metricName);
    console.warn(`Unmatched metric alias: ${metricName}`);
    return null;
  }
  
  return standardName;
}

/**
 * Normalizes a data object with metric aliases to standard metric names
 * @param data - Object with potentially aliased metric names
 * @returns Object with normalized metric names
 */
export function normalizeMetricData(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    const standardName = normalizeMetricName(key);
    if (standardName) {
      // If the standard name already exists, prefer the existing value
      if (!(standardName in normalized)) {
        normalized[standardName] = value;
      }
    } else {
      // Keep non-metric fields as they are
      normalized[key] = value;
    }
  });
  
  return normalized;
}

/**
 * Gets a list of all unmatched aliases for debugging
 * @returns Array of unmatched alias names
 */
export function getUnmatchedAliases(): string[] {
  return Array.from(unmatchedAliases);
}

/**
 * Clears the unmatched aliases list
 */
export function clearUnmatchedAliases(): void {
  unmatchedAliases.clear();
}

/**
 * Adds a new alias mapping dynamically
 * @param standardName - The standard metric name
 * @param alias - The alias to add
 */
export function addMetricAlias(standardName: string, alias: string): void {
  if (!METRIC_ALIASES[standardName]) {
    METRIC_ALIASES[standardName] = [];
  }
  
  if (!METRIC_ALIASES[standardName].includes(alias)) {
    METRIC_ALIASES[standardName].push(alias);
    ALIAS_TO_STANDARD[alias.toLowerCase()] = standardName;
  }
}

/**
 * Gets the standard metric title in Portuguese for display
 * @param metricName - The standard metric name
 * @returns The display title in Portuguese
 */
export function getMetricDisplayTitle(metricName: string): string {
  const titles: Record<string, string> = {
    investimento: 'Investimento',
    leads: 'Leads',
    cpl: 'CPL',
    impressoes: 'Impressões',
    cpm: 'CPM',
    cliques: 'Cliques no Link',
    ctr: 'CTR (Link)',
    cpc: 'CPC',
    connect_rate: 'Connect Rate',
    tx_conversao_pg: 'Tx. Conversão Pg',
    vendas: 'Vendas',
    cac: 'CAC',
    conversoes_pagina: 'Conversões da Página',
    visitas_pagina: 'Visitas da Página'
  };
  
  return titles[metricName] || metricName;
}
