import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ClientMetaSetting {
  id: string;
  cliente_id: string;
  metric_name: string;
  metric_event: string | null;
  metric_type: string;
  metric_label: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
}

export const DEFAULT_METRICS = [
  { name: 'investimento', label: 'Investimento', type: 'currency' },
  { name: 'impressoes', label: 'Impressões', type: 'number' },
  { name: 'alcance', label: 'Alcance', type: 'number' },
  { name: 'ctr', label: 'CTR', type: 'percentage' },
  { name: 'cpc', label: 'CPC', type: 'currency' },
  { name: 'cpm', label: 'CPM', type: 'currency' },
  { name: 'conversoes', label: 'Conversões', type: 'number' },
  { name: 'cpa', label: 'CPA', type: 'currency' },
  { name: 'roas', label: 'ROAS', type: 'number' },
  { name: 'vendas', label: 'Vendas', type: 'number' },
  { name: 'leads', label: 'Leads', type: 'number' },
  { name: 'checkouts', label: 'Checkouts', type: 'number' },
];

export const useClientMetaSettings = (clienteId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['client-meta-settings', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];

      const { data, error } = await supabase
        .from('client_meta_settings')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as ClientMetaSetting[];
    },
    enabled: !!clienteId,
  });

  const isMetricVisible = (metricName: string): boolean => {
    if (!settings || settings.length === 0) return true; // Default: all visible
    const setting = settings.find(s => s.metric_name === metricName);
    return setting ? setting.is_visible : false;
  };

  const visibleMetrics = settings?.filter(s => s.is_visible) || [];
  const customMetrics = settings?.filter(s => s.metric_event) || [];

  const toggleMetricMutation = useMutation({
    mutationFn: async ({ metricName, isVisible }: { metricName: string; isVisible: boolean }) => {
      if (!clienteId) throw new Error('clienteId required');

      const existingSetting = settings?.find(s => s.metric_name === metricName);

      if (existingSetting) {
        const { error } = await supabase
          .from('client_meta_settings')
          .update({ is_visible: isVisible })
          .eq('id', existingSetting.id);
        if (error) throw error;
      } else {
        const defaultMetric = DEFAULT_METRICS.find(m => m.name === metricName);
        const { error } = await supabase
          .from('client_meta_settings')
          .insert({
            cliente_id: clienteId,
            metric_name: metricName,
            metric_label: defaultMetric?.label || metricName,
            metric_type: defaultMetric?.type || 'number',
            is_visible: isVisible,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-meta-settings', clienteId] });
    },
  });

  const addCustomMetricMutation = useMutation({
    mutationFn: async ({
      metricLabel,
      metricEvent,
      metricType,
    }: {
      metricLabel: string;
      metricEvent: string;
      metricType: string;
    }) => {
      if (!clienteId) throw new Error('clienteId required');

      const metricName = `custom_${metricEvent}`;

      const { data, error } = await supabase
        .from('client_meta_settings')
        .insert({
          cliente_id: clienteId,
          metric_name: metricName,
          metric_event: metricEvent,
          metric_type: metricType,
          metric_label: metricLabel,
          is_visible: true,
          sort_order: (settings?.length || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-meta-settings', clienteId] });
    },
  });

  const removeCustomMetricMutation = useMutation({
    mutationFn: async (settingId: string) => {
      const { error } = await supabase
        .from('client_meta_settings')
        .delete()
        .eq('id', settingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-meta-settings', clienteId] });
    },
  });

  const saveAllMetricsMutation = useMutation({
    mutationFn: async (metrics: Array<{ name: string; isVisible: boolean }>) => {
      if (!clienteId) throw new Error('clienteId required');

      for (const metric of metrics) {
        const existingSetting = settings?.find(s => s.metric_name === metric.name);
        const defaultMetric = DEFAULT_METRICS.find(m => m.name === metric.name);

        if (existingSetting) {
          await supabase
            .from('client_meta_settings')
            .update({ is_visible: metric.isVisible })
            .eq('id', existingSetting.id);
        } else {
          await supabase
            .from('client_meta_settings')
            .insert({
              cliente_id: clienteId,
              metric_name: metric.name,
              metric_label: defaultMetric?.label || metric.name,
              metric_type: defaultMetric?.type || 'number',
              is_visible: metric.isVisible,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-meta-settings', clienteId] });
    },
  });

  return {
    settings: settings || [],
    isLoading,
    error,
    isMetricVisible,
    visibleMetrics,
    customMetrics,
    toggleMetric: toggleMetricMutation.mutateAsync,
    addCustomMetric: addCustomMetricMutation.mutateAsync,
    removeCustomMetric: removeCustomMetricMutation.mutateAsync,
    saveAllMetrics: saveAllMetricsMutation.mutateAsync,
    isSaving: toggleMetricMutation.isPending || saveAllMetricsMutation.isPending,
  };
};
