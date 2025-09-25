// Examples of metric alias normalization for testing and documentation

import { normalizeMetricData, normalizeMetricName } from './metricAliasResolver';

// Example 1: Meta Ads data with English field names including landing page views
export const metaAdsExample = {
  spend: 1500.50,
  impressions: 125000,
  link_clicks: 890,
  action_landing_page_view: 756, // Landing page visits
  leads: 45,
  purchases: 12,
  conversions: 67, // Page conversions
  campaign_name: "Campanha de Verão"
};

// Example 2: Google Ads data with different naming
export const googleAdsExample = {
  cost: 2300.75,
  impressions: 98000,
  clicks: 650,
  landing_page_views: 580, // Page visits
  registrations: 38,
  sales: 8,
  page_conversions: 52,
  campaign_id: "12345"
};

// Example 3: Manual data entry in Portuguese
export const manualDataExample = {
  investimento: 1800.00,
  impressoes: 110000,
  cliques_link: 720,
  visitas: 612, // Page visits in Portuguese
  cadastros: 42,
  vendas: 10,
  conversoes: 58,
  cliente: "Empresa XYZ"
};

// Example 4: Mixed data with some aliases including action_landing_page_view
export const mixedDataExample = {
  spend: 950.25,
  leads: 28,
  impressoes: 67000,
  link_clicks: 445,
  action_landing_page_view: 398, // Meta-style landing page views
  action_conversion: 35, // Meta-style conversions
  compras: 6,
  reach: 35000
};

// Function to test normalization
export function testNormalization() {
  console.log('=== Testing Metric Alias Normalization ===\n');
  
  const examples = [
    { name: 'Meta Ads Example', data: metaAdsExample },
    { name: 'Google Ads Example', data: googleAdsExample },
    { name: 'Manual Data Example', data: manualDataExample },
    { name: 'Mixed Data Example', data: mixedDataExample }
  ];
  
  examples.forEach(({ name, data }) => {
    console.log(`${name}:`);
    console.log('Original:', data);
    console.log('Normalized:', normalizeMetricData(data));
    console.log('---');
  });
  
  // Test individual metric name normalization
  console.log('\n=== Individual Metric Name Tests ===');
  const testMetrics = [
    'spend', 'investimento', 'COST', 'gasto',
    'leads', 'LEADS', 'cadastros', 'registrations',
    'impressions', 'impressoes', 'REACH',
    'link_clicks', 'cliques', 'clicks',
    'action_landing_page_view', 'landing_page_views', 'visitas',
    'action_conversion', 'conversions', 'conversoes',
    'unknown_metric', 'weird_field_name'
  ];
  
  testMetrics.forEach(metric => {
    const normalized = normalizeMetricName(metric);
    console.log(`${metric} -> ${normalized || 'NOT FOUND'}`);
  });
}

// Export for usage in components
export {
  normalizeMetricData,
  normalizeMetricName
};