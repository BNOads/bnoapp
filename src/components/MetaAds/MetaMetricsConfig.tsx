import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MetaMetricsConfigProps {
    clientId: string;
}

const STANDARD_METRICS = [
    { key: 'spend', label: 'Investimento', type: 'currency' },
    { key: 'impressions', label: 'Impressões', type: 'number' },
    { key: 'clicks', label: 'Cliques (Todos)', type: 'number' },
    { key: 'reach', label: 'Alcance', type: 'number' },
    { key: 'ctr', label: 'CTR (Taxa de Cliques)', type: 'percentage' },
    { key: 'cpc', label: 'CPC (Custo por Clique)', type: 'currency' },
    { key: 'cpm', label: 'CPM (Custo por 1000 Impressões)', type: 'currency' },
    { key: 'frequency', label: 'Frequência', type: 'number' },
    { key: 'conversions', label: 'Conversões', type: 'number' },
];

export const MetaMetricsConfig = ({ clientId }: MetaMetricsConfigProps) => {
    const [config, setConfig] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadConfig();
    }, [clientId]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            // Fetch existing settings
            const { data, error } = await supabase
                .from('client_meta_settings')
                .select('*')
                .eq('cliente_id', clientId);

            if (error) throw error;

            // Map to key-boolean object
            const configMap: Record<string, boolean> = {};

            // Default all standard to TRUE if no setting exists yet? 
            // Or false? Usually default True is better for UX.
            STANDARD_METRICS.forEach(m => {
                configMap[m.key] = true; // Default visible
            });

            const hasConversionsSetting = data?.some((setting: any) => setting.metric_name === 'conversions');

            // Override with DB settings (supports legacy key "actions")
            data?.forEach((setting: any) => {
                if (setting.metric_name === 'actions') {
                    if (!hasConversionsSetting) {
                        configMap.conversions = setting.is_visible;
                    }
                    return;
                }

                configMap[setting.metric_name] = setting.is_visible;
            });

            setConfig(configMap);
        } catch (error) {
            console.error('Erro ao carregar configurações de métricas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (metricKey: string, checked: boolean) => {
        // Update State Optimistically
        setConfig(prev => ({ ...prev, [metricKey]: checked }));

        try {
            // Upsert to DB
            const { error } = await supabase
                .from('client_meta_settings')
                .upsert({
                    cliente_id: clientId,
                    metric_name: metricKey,
                    is_visible: checked,
                    metric_type: STANDARD_METRICS.find(m => m.key === metricKey)?.type
                }, {
                    onConflict: 'cliente_id,metric_name'
                });

            if (error) throw error;

        } catch (error: any) {
            console.error('Erro ao salvar métrica:', error);
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível atualizar a configuração.",
                variant: "destructive",
            });
            // Revert state
            setConfig(prev => ({ ...prev, [metricKey]: !checked }));
        }
    };

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Configuração de Métricas</h3>
                <p className="text-sm text-muted-foreground">
                    Selecione quais métricas devem aparecer no painel deste cliente.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STANDARD_METRICS.map((metric) => (
                    <div key={metric.key} className="flex items-center space-x-2 border p-3 rounded-md">
                        <Checkbox
                            id={`metric-${metric.key}`}
                            checked={config[metric.key]}
                            onCheckedChange={(checked) => handleToggle(metric.key, checked as boolean)}
                        />
                        <Label htmlFor={`metric-${metric.key}`} className="cursor-pointer flex-1">
                            {metric.label}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
    );
};
