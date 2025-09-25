// Examples of metric alias normalization for testing and documentation

import { normalizeMetricData, normalizeMetricName } from './metricAliasResolver';

// Example 1: Meta Ads data with English field names
export const metaAdsExample = {
  spend: 1500.50,
  impressions: 125000,
  link_clicks: 890,
  leads: 45,
  purchases: 12,
  campaign_name: "Campanha de Verão"
};

// Example 2: Google Ads data with different naming
export const googleAdsExample = {
  cost: 2300.75,
  impressions: 98000,
  clicks: 650,
  registrations: 38,
  sales: 8,
  campaign_id: "12345"
};

// Example 3: Manual data entry in Portuguese
export const manualDataExample = {
  investimento: 1800.00,
  impressoes: 110000,
  cliques_link: 720,
  cadastros: 42,
  vendas: 10,
  cliente: "Empresa XYZ"
};

// Example 4: Mixed data with some aliases
export const mixedDataExample = {
  spend: 950.25,
  leads: 28,
  impressoes: 67000,
  link_clicks: 445,
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