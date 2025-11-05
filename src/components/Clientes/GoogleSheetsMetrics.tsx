import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Metric {
  original_name: string;
  metric_key: string;
  recognized: boolean;
  value: any;
  formatted_value: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

interface GoogleSheetsMetricsProps {
  clienteId: string;
  showRefresh?: boolean;
}

export const GoogleSheetsMetrics = ({ clienteId, showRefresh = true }: GoogleSheetsMetricsProps) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [unrecognizedMetrics, setUnrecognizedMetrics] = useState<string[]>([]);

  const loadMetrics = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('google-sheets-cliente', {
        body: { cliente_id: clienteId, refresh: forceRefresh }
      });

      if (invokeError) throw invokeError;

      if (data.success) {
        setMetrics(data.metrics || []);
        setUnrecognizedMetrics(data.unrecognized_metrics || []);
        setLastSync(new Date().toLocaleString('pt-BR'));
        
        if (forceRefresh) {
          toast.success('Métricas atualizadas com sucesso!');
        }
      } else {
        throw new Error(data.error || 'Erro ao carregar métricas');
      }
    } catch (err: any) {
      console.error('Erro ao carregar métricas:', err);
      setError(err.message || 'Erro ao carregar métricas do Google Sheets');
      toast.error('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    
    // Auto-refresh a cada 15 minutos
    const interval = setInterval(() => {
      loadMetrics();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [clienteId]);

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'stable', percentage: number) => {
    if (Math.abs(percentage) < 5) return 'text-muted-foreground';
    return direction === 'up' ? 'text-success' : 'text-destructive';
  };

  const getMetricIcon = (metricKey: string) => {
    const icons: Record<string, string> = {
      'leads': '👥',
      'cpl': '💰',
      'ctr': '👆',
      'cpm': '📊',
      'investimento': '💸',
      'faturamento': '💵',
      'roi': '📈',
      'conversoes': '✅',
      'ticket_medio': '🎫',
      'impressoes': '👁️',
      'cliques': '🖱️',
      'cpc': '💲',
      'frequencia': '🔄'
    };
    
    return icons[metricKey] || '📊';
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Erro ao carregar métricas</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Nenhuma métrica disponível. Configure a planilha do Google Sheets para este cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Métricas do Cliente</h3>
          {lastSync && (
            <p className="text-sm text-muted-foreground">
              Última atualização: {lastSync}
            </p>
          )}
        </div>
        {showRefresh && (
          <Button
            onClick={() => loadMetrics(true)}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.filter(m => m.recognized).map((metric, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="text-2xl">{getMetricIcon(metric.metric_key)}</span>
                {metric.original_name}
                {metric.recognized && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Auto
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{metric.formatted_value}</p>
                {metric.trend && (
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(metric.trend.direction, metric.trend.percentage)}`}>
                    {getTrendIcon(metric.trend.direction)}
                    <span>
                      {metric.trend.percentage > 0 ? '+' : ''}
                      {metric.trend.percentage.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">vs. anterior</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {unrecognizedMetrics.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Métricas não reconhecidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unrecognizedMetrics.map((metric, index) => (
                <Badge key={index} variant="outline">
                  {metric}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Configure os aliases dessas métricas no painel de administração
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
