import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Check, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CampaignStageValidatorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mappings: CampaignStageMapping[]) => void;
  trafegoData: any[];
  clienteId?: string;
}

interface CampaignStageMapping {
  campaign_name: string;
  stage: string;
  investment: number;
  isManuallyEdited?: boolean;
}

const STAGE_ALIASES = {
  'captacao': ['capta', 'captacao', 'c1', 'topo', 'top', 'awareness'],
  'aquecimento': ['aquec', 'warm', 'c2', 'consideration', 'interesse'],
  'cpl': ['cpl', 'conteudo', 'c3', 'content', 'meio'],
  'lembrete': ['lembr', 'ultimo', 'c4', 'reminder', 'retargeting', 'fundo'],
  'vendas': ['venda', 'sale', 'conversion', 'checkout', 'compra']
};

const STAGE_LABELS = {
  'captacao': 'Captação',
  'aquecimento': 'Aquecimento', 
  'cpl': 'CPL/Conteúdo',
  'lembrete': 'Lembrete',
  'vendas': 'Vendas',
  'nao_classificada': 'Não Classificada'
};

const STAGE_COLORS = {
  'captacao': 'bg-blue-100 text-blue-800',
  'aquecimento': 'bg-green-100 text-green-800',
  'cpl': 'bg-purple-100 text-purple-800',
  'lembrete': 'bg-orange-100 text-orange-800',
  'vendas': 'bg-red-100 text-red-800',
  'nao_classificada': 'bg-gray-100 text-gray-800'
};

export default function CampaignStageValidator({ 
  isOpen, 
  onClose, 
  onConfirm, 
  trafegoData, 
  clienteId 
}: CampaignStageValidatorProps) {
  const [mappings, setMappings] = useState<CampaignStageMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingMappings, setExistingMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && trafegoData.length > 0) {
      initializeMappings();
    }
  }, [isOpen, trafegoData]);

  const initializeMappings = async () => {
    setLoading(true);
    try {
      // Buscar mapeamentos salvos anteriormente
      let savedMappings: Record<string, string> = {};
      if (clienteId) {
        const { data } = await supabase
          .from('campaign_stage_mappings')
          .select('campaign_name, stage')
          .eq('cliente_id', clienteId);
        
        if (data) {
          savedMappings = data.reduce((acc, item) => {
            acc[item.campaign_name] = item.stage;
            return acc;
          }, {} as Record<string, string>);
        }
      }
      
      setExistingMappings(savedMappings);

      // Agrupar campanhas e calcular investimento total
      const campaignGroups = trafegoData.reduce((acc, item) => {
        const campaignName = item['Campaign Name'] || item.campanha || 'Campanha sem nome';
        const investment = parseFloat(String(item['Spend (Cost, Amount Spent)'] || item.gasto || '0'));
        
        if (!acc[campaignName]) {
          acc[campaignName] = 0;
        }
        acc[campaignName] += investment;
        return acc;
      }, {} as Record<string, number>);

      // Criar mapeamentos iniciais
      const initialMappings: CampaignStageMapping[] = Object.entries(campaignGroups).map(([campaignName, investment]) => {
        // Verificar se já existe mapeamento salvo
        const savedStage = savedMappings[campaignName];
        if (savedStage) {
          return {
            campaign_name: campaignName,
            stage: savedStage,
            investment: investment as number,
            isManuallyEdited: false
          };
        }

        // Detectar etapa automaticamente pelos aliases
        const detectedStage = detectStageFromCampaignName(campaignName);
        return {
          campaign_name: campaignName,
          stage: detectedStage,
          investment: investment as number,
          isManuallyEdited: false
        };
      });

      setMappings(initialMappings);
    } catch (error) {
      console.error('Erro ao inicializar mapeamentos:', error);
      toast.error('Erro ao carregar mapeamentos salvos');
    } finally {
      setLoading(false);
    }
  };

  const detectStageFromCampaignName = (campaignName: string): string => {
    const lowerName = campaignName.toLowerCase();
    
    for (const [stage, aliases] of Object.entries(STAGE_ALIASES)) {
      if (aliases.some(alias => lowerName.includes(alias))) {
        return stage;
      }
    }
    
    return 'nao_classificada';
  };

  const handleStageChange = (campaignName: string, newStage: string) => {
    setMappings(prev => prev.map(mapping => 
      mapping.campaign_name === campaignName 
        ? { ...mapping, stage: newStage, isManuallyEdited: true }
        : mapping
    ));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Salvar mapeamentos editados manualmente
      if (clienteId) {
        const manualMappings = mappings.filter(m => m.isManuallyEdited);
        
        for (const mapping of manualMappings) {
          await supabase
            .from('campaign_stage_mappings')
            .upsert({
              cliente_id: clienteId,
              campaign_name: mapping.campaign_name,
              stage: mapping.stage
            }, {
              onConflict: 'cliente_id,campaign_name'
            });
        }
      }

      onConfirm(mappings);
      toast.success('Etapas confirmadas e salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar mapeamentos:', error);
      toast.error('Erro ao salvar mapeamentos');
    } finally {
      setLoading(false);
    }
  };

  const getStageDistribution = () => {
    const distribution = mappings.reduce((acc, mapping) => {
      if (!acc[mapping.stage]) {
        acc[mapping.stage] = { investment: 0, count: 0 };
      }
      acc[mapping.stage].investment += mapping.investment;
      acc[mapping.stage].count += 1;
      return acc;
    }, {} as Record<string, { investment: number; count: number }>);

    const totalInvestment = Object.values(distribution).reduce((sum, item) => sum + item.investment, 0);

    return Object.entries(distribution).map(([stage, data]) => ({
      stage,
      investment: data.investment,
      count: data.count,
      percentage: totalInvestment > 0 ? (data.investment / totalInvestment) * 100 : 0
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const unclassifiedCount = mappings.filter(m => m.stage === 'nao_classificada').length;
  const stageDistribution = getStageDistribution();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Validação de Etapas das Campanhas
          </DialogTitle>
          <DialogDescription>
            Verifique se todas as campanhas estão atribuídas corretamente às etapas. Ajuste se necessário antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumo da Distribuição */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Distribuição</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {stageDistribution.map(({ stage, investment, count, percentage }) => (
                    <div key={stage} className="text-center p-3 border rounded-lg">
                      <Badge className={STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || STAGE_COLORS.nao_classificada}>
                        {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage}
                      </Badge>
                      <div className="mt-2">
                        <div className="font-bold text-lg">{formatCurrency(investment)}</div>
                        <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">{count} campanhas</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerta para campanhas não classificadas */}
            {unclassifiedCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">
                      {unclassifiedCount} campanhas não classificadas
                    </h4>
                    <p className="text-sm text-yellow-700">
                      Algumas campanhas não foram reconhecidas automaticamente. Classifique-as manualmente abaixo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Campanhas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campanhas Detectadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mappings.map((mapping, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{mapping.campaign_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(mapping.investment)}
                          {existingMappings[mapping.campaign_name] && !mapping.isManuallyEdited && (
                            <Badge variant="outline" className="ml-2">Mapeamento salvo</Badge>
                          )}
                          {mapping.isManuallyEdited && (
                            <Badge variant="outline" className="ml-2">Editado</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select
                          value={mapping.stage}
                          onValueChange={(value) => handleStageChange(mapping.campaign_name, value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white z-50">
                            {Object.entries(STAGE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded ${STAGE_COLORS[value as keyof typeof STAGE_COLORS]?.split(' ')[0] || 'bg-gray-100'}`}></div>
                                  {label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {mapping.stage !== 'nao_classificada' && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || unclassifiedCount > 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? 'Salvando...' : 'Confirmar Etapas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}