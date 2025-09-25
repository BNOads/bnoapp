import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, Info, Settings, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
}

interface PeriodPreset {
  label: string;
  getValue: () => { start: Date; end: Date };
}

const periodPresets: PeriodPreset[] = [
  {
    label: "Hoje",
    getValue: () => ({ start: new Date(), end: new Date() })
  },
  {
    label: "Ontem", 
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { start: yesterday, end: yesterday };
    }
  },
  {
    label: "Últimos 7 dias",
    getValue: () => ({ start: subDays(new Date(), 6), end: new Date() })
  },
  {
    label: "Últimos 14 dias",
    getValue: () => ({ start: subDays(new Date(), 13), end: new Date() })
  },
  {
    label: "Últimos 30 dias",
    getValue: () => ({ start: subDays(new Date(), 29), end: new Date() })
  },
  {
    label: "Mês atual",
    getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
  }
];

export default function TrafficMetrics({ debriefingId, clienteId }: TrafficMetricsProps) {
  const [metrics, setMetrics] = useState<TrafficMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("Últimos 30 dias");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [attributionWindow, setAttributionWindow] = useState("7d_click_1d_view");
  const [showEditModal, setShowEditModal] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // Calcular datas do período
  const getPeriodDates = () => {
    if (selectedPeriod === "Intervalo personalizado") {
      return {
        start: customStartDate || new Date(),
        end: customEndDate || new Date()
      };
    }
    
    const preset = periodPresets.find(p => p.label === selectedPeriod);
    return preset?.getValue() || { start: new Date(), end: new Date() };
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  useEffect(() => {
    loadMetrics();
  }, [debriefingId, selectedPeriod, customStartDate, customEndDate, attributionWindow]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Simular dados de tráfego com valores calculados
      const baseData = {
        investimento: Math.random() * 50000 + 10000,
        leads: Math.floor(Math.random() * 500 + 100),
        impressoes: Math.floor(Math.random() * 100000 + 50000),
        cliques: Math.floor(Math.random() * 5000 + 1000),
        vendas: Math.floor(Math.random() * 50 + 10),
        conversoes_pagina: Math.floor(Math.random() * 300 + 50),
        visitas_pagina: Math.floor(Math.random() * 2000 + 500)
      };

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

      // Definir métricas com cálculos
      const metricsData: TrafficMetric[] = [
        {
          key: 'investimento',
          title: 'Investimento',
          value: overridesMap.investimento || baseData.investimento,
          tooltip: 'Gasto de mídia no período selecionado',
          format: 'currency',
          isEdited: !!overridesMap.investimento
        },
        {
          key: 'leads',
          title: 'Leads',
          value: overridesMap.leads || baseData.leads,
          tooltip: 'Ações "lead" captadas no período',
          format: 'number',
          isEdited: !!overridesMap.leads
        },
        {
          key: 'cpl',
          title: 'CPL',
          value: overridesMap.cpl || ((overridesMap.investimento || baseData.investimento) / (overridesMap.leads || baseData.leads)),
          formula: 'Investimento ÷ Leads',
          tooltip: 'Custo por Lead - investimento dividido por leads',
          format: 'currency',
          isEdited: !!overridesMap.cpl
        },
        {
          key: 'impressoes',
          title: 'Impressões',
          value: overridesMap.impressoes || baseData.impressoes,
          tooltip: 'Exibições de anúncios',
          format: 'number',
          isEdited: !!overridesMap.impressoes
        },
        {
          key: 'cpm',
          title: 'CPM',
          value: overridesMap.cpm || (((overridesMap.investimento || baseData.investimento) / (overridesMap.impressoes || baseData.impressoes)) * 1000),
          formula: '(Investimento ÷ Impressões) × 1000',
          tooltip: 'Custo por Mil Impressões',
          format: 'currency',
          isEdited: !!overridesMap.cpm
        },
        {
          key: 'cliques',
          title: 'Cliques no Link',
          value: overridesMap.cliques || baseData.cliques,
          tooltip: 'Cliques no link (link_clicks do Meta)',
          format: 'number',
          isEdited: !!overridesMap.cliques
        },
        {
          key: 'ctr',
          title: 'CTR (Link)',
          value: overridesMap.ctr || (((overridesMap.cliques || baseData.cliques) / (overridesMap.impressoes || baseData.impressoes)) * 100),
          formula: 'Cliques ÷ Impressões',
          tooltip: 'Taxa de cliques no link - cliques dividido por impressões',
          format: 'percentage',
          isEdited: !!overridesMap.ctr
        },
        {
          key: 'cpc',
          title: 'CPC',
          value: overridesMap.cpc || ((overridesMap.investimento || baseData.investimento) / (overridesMap.cliques || baseData.cliques)),
          formula: 'Investimento ÷ Cliques',
          tooltip: 'Custo por Clique - investimento dividido por cliques',
          format: 'currency',
          isEdited: !!overridesMap.cpc
        },
        {
          key: 'connect_rate',
          title: 'Connect Rate',
          value: overridesMap.connect_rate || (((overridesMap.leads || baseData.leads) / (overridesMap.cliques || baseData.cliques)) * 100),
          formula: 'Leads ÷ Cliques',
          tooltip: 'Taxa de conversão de cliques em leads (se Lead vem de link)',
          format: 'percentage',
          isEdited: !!overridesMap.connect_rate
        },
        {
          key: 'tx_conversao_pg',
          title: 'Tx. Conversão Pg',
          value: overridesMap.tx_conversao_pg || (((overridesMap.conversoes_pagina || baseData.conversoes_pagina) / (overridesMap.visitas_pagina || baseData.visitas_pagina)) * 100),
          formula: 'Conversões da página ÷ Visitas',
          tooltip: 'Taxa de conversão da página (opt-in/checkout) - conversões dividido por visitas',
          format: 'percentage',
          isEdited: !!overridesMap.tx_conversao_pg
        },
        {
          key: 'vendas',
          title: 'Vendas',
          value: overridesMap.vendas || baseData.vendas,
          tooltip: 'Número de compras confirmadas (se integrado a checkout/Meta purchase)',
          format: 'number',
          isEdited: !!overridesMap.vendas
        },
        {
          key: 'cac',
          title: 'CAC',
          value: overridesMap.cac || ((overridesMap.investimento || baseData.investimento) / (overridesMap.vendas || baseData.vendas)),
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

  const generateComparison = () => {
    // Simular comparação com período anterior
    const isPositive = Math.random() > 0.5;
    const percentage = Math.random() * 30 + 1;
    
    return {
      isPositive,
      percentage: percentage.toFixed(1)
    };
  };

  const handleExportPNG = async () => {
    try {
      // Implementar captura de tela da seção
      toast.info('Exportação PNG em desenvolvimento');
    } catch (error) {
      toast.error('Erro ao exportar PNG');
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
            periodo_hash: `${format(periodStart, 'yyyy-MM-dd')}_${format(periodEnd, 'yyyy-MM-dd')}`,
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar PNG
              </Button>
            </div>
          </div>
          
          {/* Controles de filtro */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Período:</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodPresets.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="Intervalo personalizado">
                    Intervalo personalizado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === "Intervalo personalizado" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "PPP", { locale: ptBR }) : "Data início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "PPP", { locale: ptBR }) : "Data fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Janela de atribuição:</label>
              <Select value={attributionWindow} onValueChange={setAttributionWindow}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d_click_1d_view">1d click / 1d view</SelectItem>
                  <SelectItem value="7d_click_1d_view">7d click / 1d view</SelectItem>
                  <SelectItem value="28d_click_1d_view">28d click / 1d view</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => {
              const comparison = generateComparison();
              
              return (
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
                      
                      <div className="flex items-center space-x-1">
                        {comparison.isPositive ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={cn(
                          "text-xs font-medium",
                          comparison.isPositive ? "text-green-500" : "text-red-500"
                        )}>
                          {comparison.isPositive ? "+" : "-"}{comparison.percentage}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          vs período anterior
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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