import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/Auth/AuthContext';
import { Loader2, Calculator } from 'lucide-react';
import { PLATAFORMA_OPTIONS } from '@/types/traffic';
import { calculateMetrics, formatMetricValue } from '@/lib/trafficMetrics';
import { Card, CardContent } from '@/components/ui/card';

interface NovoTrafficCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Cliente {
  id: string;
  nome: string;
}

export default function NovoTrafficCampaignModal({
  open,
  onOpenChange,
  onSuccess,
}: NovoTrafficCampaignModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [formData, setFormData] = useState({
    nome: '',
    cliente_id: '',
    investimento: 0,
    impressoes: 0,
    cliques: 0,
    page_views: 0,
    checkouts: 0,
    vendas: 0,
    leads: 0,
    valor_total: 0,
    plataforma: 'meta_ads',
    periodo_inicio: new Date().toISOString().split('T')[0],
    periodo_fim: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      loadClientes();
    }
  }, [open]);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('etapa_atual', 'ativo')
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.nome.trim()) {
        throw new Error('Nome da campanha e obrigatorio');
      }

      if (!formData.cliente_id) {
        throw new Error('Selecione um cliente');
      }

      const { error } = await supabase.from('traffic_campaigns').insert({
        nome: formData.nome,
        cliente_id: formData.cliente_id,
        investimento: formData.investimento,
        impressoes: formData.impressoes,
        cliques: formData.cliques,
        page_views: formData.page_views,
        checkouts: formData.checkouts,
        vendas: formData.vendas,
        leads: formData.leads,
        valor_total: formData.valor_total,
        plataforma: formData.plataforma,
        periodo_inicio: formData.periodo_inicio,
        periodo_fim: formData.periodo_fim,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Campanha criada com sucesso!',
        description: `${formData.nome} foi adicionada.`,
      });

      // Reset form
      setFormData({
        nome: '',
        cliente_id: '',
        investimento: 0,
        impressoes: 0,
        cliques: 0,
        page_views: 0,
        checkouts: 0,
        vendas: 0,
        leads: 0,
        valor_total: 0,
        plataforma: 'meta_ads',
        periodo_inicio: new Date().toISOString().split('T')[0],
        periodo_fim: new Date().toISOString().split('T')[0],
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Erro ao criar campanha:', error);
      toast({
        title: 'Erro ao criar campanha',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    handleInputChange(field, numValue);
  };

  // Calculate preview metrics
  const previewMetrics = calculateMetrics({
    investimento: formData.investimento,
    impressoes: formData.impressoes,
    cliques: formData.cliques,
    pageViews: formData.page_views,
    checkouts: formData.checkouts,
    vendas: formData.vendas,
    leads: formData.leads,
    valorTotal: formData.valor_total,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Campanha de Trafego</DialogTitle>
          <DialogDescription>
            Preencha os dados da campanha para analise do funil de vendas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Campanha *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Ex: Lancamento Produto X - Janeiro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => handleInputChange('cliente_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plataforma">Plataforma</Label>
              <Select
                value={formData.plataforma}
                onValueChange={(value) => handleInputChange('plataforma', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATAFORMA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodo_inicio">Periodo</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={formData.periodo_inicio}
                  onChange={(e) => handleInputChange('periodo_inicio', e.target.value)}
                />
                <span className="text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={formData.periodo_fim}
                  onChange={(e) => handleInputChange('periodo_fim', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Financial Data */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Dados Financeiros</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investimento">Investimento (R$)</Label>
                <Input
                  id="investimento"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.investimento}
                  onChange={(e) => handleNumberChange('investimento', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_total">Receita Total (R$)</Label>
                <Input
                  id="valor_total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_total}
                  onChange={(e) => handleNumberChange('valor_total', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Funnel Data */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Dados do Funil</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="impressoes">Impressoes</Label>
                <Input
                  id="impressoes"
                  type="number"
                  min="0"
                  value={formData.impressoes}
                  onChange={(e) => handleNumberChange('impressoes', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliques">Cliques</Label>
                <Input
                  id="cliques"
                  type="number"
                  min="0"
                  value={formData.cliques}
                  onChange={(e) => handleNumberChange('cliques', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="page_views">Visualizacoes Pagina</Label>
                <Input
                  id="page_views"
                  type="number"
                  min="0"
                  value={formData.page_views}
                  onChange={(e) => handleNumberChange('page_views', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkouts">Checkouts</Label>
                <Input
                  id="checkouts"
                  type="number"
                  min="0"
                  value={formData.checkouts}
                  onChange={(e) => handleNumberChange('checkouts', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendas">Vendas</Label>
                <Input
                  id="vendas"
                  type="number"
                  min="0"
                  value={formData.vendas}
                  onChange={(e) => handleNumberChange('vendas', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leads">Leads</Label>
                <Input
                  id="leads"
                  type="number"
                  min="0"
                  value={formData.leads}
                  onChange={(e) => handleNumberChange('leads', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Preview Metrics */}
          {(formData.investimento > 0 || formData.impressoes > 0) && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Metricas Calculadas</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      {formatMetricValue(previewMetrics.cpm, 'currency')}
                    </p>
                    <p className="text-xs text-muted-foreground">CPM</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-600">
                      {formatMetricValue(previewMetrics.ctr, 'percentage')}
                    </p>
                    <p className="text-xs text-muted-foreground">CTR</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-600">
                      {formatMetricValue(previewMetrics.cpa, 'currency')}
                    </p>
                    <p className="text-xs text-muted-foreground">CPA</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">
                      {formatMetricValue(previewMetrics.roi, 'percentage')}
                    </p>
                    <p className="text-xs text-muted-foreground">ROI</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Campanha
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
