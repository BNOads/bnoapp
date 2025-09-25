// Traffic metrics component - updated to fix cache issue
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EditMetricsModal from "./EditMetricsModal";

interface TrafficMetric {
  key: string;
  title: string;
  value: number | null;
  formula?: string;
  tooltip: string;
  format: 'currency' | 'number' | 'percentage';
  isEdited?: boolean;
  editedBy?: string;
}

interface TrafficMetricsProps {
  debriefingId: string;
  clienteId?: string;
  dadosTrafego?: any[];
}

export default function TrafficMetrics({ debriefingId, dadosTrafego = [] }: TrafficMetricsProps) {
  const [metrics, setMetrics] = useState<TrafficMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    loadMetrics();
  }, [debriefingId, dadosTrafego]);

  const aggregateTrafficData = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        investimento: 0,
        leads: 0,
        impressoes: 0,
        cliques: 0,
        vendas: 0,
        conversoes_pagina: 0,
        visitas_pagina: 0
      };
    }

    return data.reduce((acc, item) => {
      // Somar valores de tráfego dos dados importados
      acc.investimento += parseFloat(item.spend || item.investimento || 0);
      acc.leads += parseInt(item.leads || 0);
      acc.impressoes += parseInt(item.impressions || item.impressoes || 0);
      acc.cliques += parseInt(item.link_clicks || item.cliques || 0);
      acc.vendas += parseInt(item.purchases || item.vendas || 0);
      acc.conversoes_pagina += parseInt(item.conversions || item.conversoes || 0);
      acc.visitas_pagina += parseInt(item.page_views || item.visitas || 0);
      return acc;
    }, {
      investimento: 0,
      leads: 0,
      impressoes: 0,
      cliques: 0,
      vendas: 0,
      conversoes_pagina: 0,
      visitas_pagina: 0
    });
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Agregar dados de tráfego reais
      const aggregatedData = aggregateTrafficData(dadosTrafego);

      // Carregar overrides
      const { data: overridesData } = await supabase
        .from('debrief_overrides')
        .select('*')
        .eq('debriefing_id', debriefingId);

      const overridesMap: Record<string, number> = {};
      overridesData?.forEach(override => {
        overridesMap[override.card_key] = override.valor;
      });
      setOverrides(overridesMap);

      // Definir métricas com cálculos baseados nos dados reais
      const metricsData: TrafficMetric[] = [
        {
          key: 'investimento',
          title: 'Investimento',
          value: overridesMap.investimento || aggregatedData.investimento,
          tooltip: 'Gasto de mídia no período selecionado',
          format: 'currency',
          isEdited: !!overridesMap.investimento
        },
        {
          key: 'leads',
          title: 'Leads',
          value: overridesMap.leads || aggregatedData.leads,
          tooltip: 'Ações "lead" captadas no período',
          format: 'number',
          isEdited: !!overridesMap.leads
        },
        {
          key: 'cpl',
          title: 'CPL',
          value: overridesMap.cpl || (aggregatedData.leads > 0 ? (overridesMap.investimento || aggregatedData.investimento) / (overridesMap.leads || aggregatedData.leads) : 0),
          formula: 'Investimento ÷ Leads',
          tooltip: 'Custo por Lead - investimento dividido por leads',
          format: 'currency',
          isEdited: !!overridesMap.cpl
        },
        {
          key: 'impressoes',
          title: 'Impressões',
          value: overridesMap.impressoes || aggregatedData.impressoes,
          tooltip: 'Exibições de anúncios',
          format: 'number',
          isEdited: !!overridesMap.impressoes
        },
        {
          key: 'cpm',
          title: 'CPM',
          value: overridesMap.cpm || (aggregatedData.impressoes > 0 ? ((overridesMap.investimento || aggregatedData.investimento) / (overridesMap.impressoes || aggregatedData.impressoes)) * 1000 : 0),
          formula: '(Investimento ÷ Impressões) × 1000',
          tooltip: 'Custo por Mil Impressões',
          format: 'currency',
          isEdited: !!overridesMap.cpm
        },
        {
          key: 'cliques',
          title: 'Cliques no Link',
          value: overridesMap.cliques || aggregatedData.cliques,
          tooltip: 'Cliques no link (link_clicks do Meta)',
          format: 'number',
          isEdited: !!overridesMap.cliques
        },
        {
          key: 'ctr',
          title: 'CTR (Link)',
          value: overridesMap.ctr || (aggregatedData.impressoes > 0 ? ((overridesMap.cliques || aggregatedData.cliques) / (overridesMap.impressoes || aggregatedData.impressoes)) * 100 : 0),
          formula: 'Cliques ÷ Impressões',
          tooltip: 'Taxa de cliques no link - cliques dividido por impressões',
          format: 'percentage',
          isEdited: !!overridesMap.ctr
        },
        {
          key: 'cpc',
          title: 'CPC',
          value: overridesMap.cpc || (aggregatedData.cliques > 0 ? (overridesMap.investimento || aggregatedData.investimento) / (overridesMap.cliques || aggregatedData.cliques) : 0),
          formula: 'Investimento ÷ Cliques',
          tooltip: 'Custo por Clique - investimento dividido por cliques',
          format: 'currency',
          isEdited: !!overridesMap.cpc
        },
        {
          key: 'connect_rate',
          title: 'Connect Rate',
          value: overridesMap.connect_rate || (aggregatedData.cliques > 0 ? ((overridesMap.leads || aggregatedData.leads) / (overridesMap.cliques || aggregatedData.cliques)) * 100 : 0),
          formula: 'Leads ÷ Cliques',
          tooltip: 'Taxa de conversão de cliques em leads (se Lead vem de link)',
          format: 'percentage',
          isEdited: !!overridesMap.connect_rate
        },
        {
          key: 'tx_conversao_pg',
          title: 'Tx. Conversão Pg',
          value: overridesMap.tx_conversao_pg || (aggregatedData.visitas_pagina > 0 ? ((overridesMap.conversoes_pagina || aggregatedData.conversoes_pagina) / (overridesMap.visitas_pagina || aggregatedData.visitas_pagina)) * 100 : null),
          formula: 'Conversões da página ÷ Visitas',
          tooltip: 'Taxa de conversão da página (opt-in/checkout) - conversões dividido por visitas',
          format: 'percentage',
          isEdited: !!overridesMap.tx_conversao_pg
        },
        {
          key: 'vendas',
          title: 'Vendas',
          value: overridesMap.vendas || aggregatedData.vendas || null,
          tooltip: 'Número de compras confirmadas (se integrado a checkout/Meta purchase)',
          format: 'number',
          isEdited: !!overridesMap.vendas
        },
        {
          key: 'cac',
          title: 'CAC',
          value: overridesMap.cac || (aggregatedData.vendas > 0 ? (overridesMap.investimento || aggregatedData.investimento) / (overridesMap.vendas || aggregatedData.vendas) : null),
          formula: 'Investimento ÷ Vendas',
          tooltip: 'Custo de Aquisição de Cliente - investimento dividido por vendas',
          format: 'currency',
          isEdited: !!overridesMap.cac
        }
      ];

      setMetrics(metricsData);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast.error('Erro ao carregar métricas de tráfego');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number | null, format: string): string => {
    if (value === null || value === undefined) return "—";
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return new Intl.NumberFormat('pt-BR').format(Math.round(value));
      default:
        return value.toString();
    }
  };

  const handleSaveOverrides = async (newOverrides: Record<string, number>) => {
    try {
      // Salvar overrides no banco
      for (const [key, value] of Object.entries(newOverrides)) {
        await supabase
          .from('debrief_overrides')
          .upsert({
            debriefing_id: debriefingId,
            periodo_hash: 'current',
            card_key: key,
            valor: value,
            autor_id: (await supabase.auth.getUser()).data.user?.id
          });
      }
      
      setOverrides({ ...overrides, ...newOverrides });
      await loadMetrics();
      toast.success('Valores salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar overrides:', error);
      toast.error('Erro ao salvar valores');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tráfego (Resumo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tráfego (Resumo)</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Editar valores
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.key} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {metric.title}
                      </h3>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            <p>{metric.tooltip}</p>
                            {metric.formula && (
                              <p className="text-xs mt-1 opacity-80">
                                Fórmula: {metric.formula}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    {metric.isEdited && (
                      <Badge variant="secondary" className="text-xs">
                        editado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      {formatValue(metric.value, metric.format)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <EditMetricsModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        metrics={metrics}
        onSave={handleSaveOverrides}
      />
    </TooltipProvider>
  );
}