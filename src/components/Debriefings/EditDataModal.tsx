import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EditDataModalProps {
  debriefingId: string;
  debriefingData: any;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function EditDataModal({ debriefingId, debriefingData, isOpen, onClose, onComplete }: EditDataModalProps) {
  const [metrics, setMetrics] = useState({
    leads_total: 0,
    vendas_total: 0,
    investimento_total: 0,
    faturamento_total: 0,
    faturamento_bruto: 0,
    roas: 0,
    cpl: 0,
    ticket_medio: 0,
    conversao_lead_venda: 0
  });
  
  const [insights, setInsights] = useState({
    o_que_funcionou: [] as string[],
    o_que_ajustar: [] as string[],
    proximos_passos: [] as string[]
  });

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (debriefingData) {
      setMetrics({
        leads_total: debriefingData.leads_total || 0,
        vendas_total: debriefingData.vendas_total || 0,
        investimento_total: debriefingData.investimento_total || 0,
        faturamento_total: debriefingData.faturamento_total || 0,
        faturamento_bruto: debriefingData.faturamento_bruto || 0,
        roas: debriefingData.roas || 0,
        cpl: debriefingData.cpl || 0,
        ticket_medio: debriefingData.ticket_medio || 0,
        conversao_lead_venda: debriefingData.conversao_lead_venda || 0
      });

      setInsights({
        o_que_funcionou: debriefingData.o_que_funcionou || [],
        o_que_ajustar: debriefingData.o_que_ajustar || [],
        proximos_passos: debriefingData.proximos_passos || []
      });
    }
  }, [debriefingData]);

  const handleMetricChange = (key: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setMetrics(prev => ({
      ...prev,
      [key]: numericValue
    }));
  };

  const addInsightItem = (category: keyof typeof insights) => {
    setInsights(prev => ({
      ...prev,
      [category]: [...prev[category], '']
    }));
  };

  const updateInsightItem = (category: keyof typeof insights, index: number, value: string) => {
    setInsights(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) => i === index ? value : item)
    }));
  };

  const removeInsightItem = (category: keyof typeof insights, index: number) => {
    setInsights(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const calculateDerivedMetrics = () => {
    const { leads_total, vendas_total, investimento_total, faturamento_total, faturamento_bruto } = metrics;
    
    const newMetrics = { ...metrics };
    
    // Calcular CPL
    if (leads_total > 0 && investimento_total > 0) {
      newMetrics.cpl = investimento_total / leads_total;
    }
    
    // Calcular ROAS (preferir faturamento_bruto se disponível)
    const faturamentoParaCalculo = faturamento_bruto > 0 ? faturamento_bruto : faturamento_total;
    if (investimento_total > 0 && faturamentoParaCalculo > 0) {
      newMetrics.roas = faturamentoParaCalculo / investimento_total;
    }
    
    // Calcular Ticket Médio (preferir faturamento_bruto se disponível)
    if (vendas_total > 0 && faturamentoParaCalculo > 0) {
      newMetrics.ticket_medio = faturamentoParaCalculo / vendas_total;
    }
    
    // Calcular Conversão Lead-Venda
    if (leads_total > 0 && vendas_total > 0) {
      newMetrics.conversao_lead_venda = vendas_total / leads_total;
    }
    
    setMetrics(newMetrics);
  };

  const handleSave = async () => {
    setProcessing(true);
    
    try {
      const updateData = {
        ...metrics,
        ...insights,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('debriefings')
        .update(updateData)
        .eq('id', debriefingId);

      if (error) throw error;

      toast.success('Dados atualizados com sucesso!');
      onComplete();
      onClose();
      
    } catch (error: any) {
      console.error('Erro ao salvar dados:', error);
      toast.error(`Erro ao salvar dados: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar Dados do Debriefing
          </DialogTitle>
          <DialogDescription>
            Edite as métricas e insights do debriefing. As métricas calculadas serão atualizadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Métricas Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leads_total">Total de Leads</Label>
                    <Input
                      id="leads_total"
                      type="number"
                      value={metrics.leads_total}
                      onChange={(e) => handleMetricChange('leads_total', e.target.value)}
                      onBlur={calculateDerivedMetrics}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="vendas_total">Total de Vendas</Label>
                    <Input
                      id="vendas_total"
                      type="number"
                      value={metrics.vendas_total}
                      onChange={(e) => handleMetricChange('vendas_total', e.target.value)}
                      onBlur={calculateDerivedMetrics}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="investimento_total">Investimento Total (R$)</Label>
                    <Input
                      id="investimento_total"
                      type="number"
                      step="0.01"
                      value={metrics.investimento_total}
                      onChange={(e) => handleMetricChange('investimento_total', e.target.value)}
                      onBlur={calculateDerivedMetrics}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="faturamento_total">Faturamento Líquido (R$)</Label>
                    <Input
                      id="faturamento_total"
                      type="number"
                      step="0.01"
                      value={metrics.faturamento_total}
                      onChange={(e) => handleMetricChange('faturamento_total', e.target.value)}
                      onBlur={calculateDerivedMetrics}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="faturamento_bruto">Faturamento Bruto (R$)</Label>
                    <Input
                      id="faturamento_bruto"
                      type="number"
                      step="0.01"
                      value={metrics.faturamento_bruto}
                      onChange={(e) => handleMetricChange('faturamento_bruto', e.target.value)}
                      onBlur={calculateDerivedMetrics}
                      placeholder="Campo opcional - usado prioritariamente nos cálculos"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Calculadas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Estas métricas são calculadas automaticamente baseadas nos valores principais
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CPL (Custo por Lead)</Label>
                    <div className="p-2 bg-muted rounded border">
                      {formatCurrency(metrics.cpl)}
                    </div>
                  </div>
                  
                  <div>
                    <Label>ROAS (Return on Ad Spend)</Label>
                    <div className="p-2 bg-muted rounded border">
                      {metrics.roas.toFixed(2)}x
                    </div>
                  </div>
                  
                  <div>
                    <Label>Ticket Médio</Label>
                    <div className="p-2 bg-muted rounded border">
                      {formatCurrency(metrics.ticket_medio)}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Conversão Lead → Venda</Label>
                    <div className="p-2 bg-muted rounded border">
                      {(metrics.conversao_lead_venda * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* O que funcionou */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  O que funcionou
                  <Button size="sm" onClick={() => addInsightItem('o_que_funcionou')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.o_que_funcionou.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateInsightItem('o_que_funcionou', index, e.target.value)}
                      placeholder="Ex: Público de lookalike teve boa performance..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeInsightItem('o_que_funcionou', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* O que ajustar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  O que ajustar
                  <Button size="sm" onClick={() => addInsightItem('o_que_ajustar')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.o_que_ajustar.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateInsightItem('o_que_ajustar', index, e.target.value)}
                      placeholder="Ex: Criativo X com alta frequência..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeInsightItem('o_que_ajustar', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Próximos passos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Próximos passos
                  <Button size="sm" onClick={() => addInsightItem('proximos_passos')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights.proximos_passos.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateInsightItem('proximos_passos', index, e.target.value)}
                      placeholder="Ex: Testar novo público de interesse..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeInsightItem('proximos_passos', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botões de ação */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={processing}>
            {processing ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}