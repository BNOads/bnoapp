import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIAS_FUNIL, STATUS_ORCAMENTO, MESES, getCategoriaDescricao } from '@/lib/orcamentoConstants';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Orcamento {
  id: string;
  nome_funil: string;
  valor_investimento: number;
  valor_gasto: number;
  etapa_funil: string;
  periodo_mes: number;
  periodo_ano: number;
  status_orcamento: string;
  observacoes?: string;
  categoria_explicacao?: string;
}

interface EditOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: Orcamento | null;
  onSuccess?: () => void;
}

export const EditOrcamentoModal = ({ open, onOpenChange, orcamento, onSuccess }: EditOrcamentoModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_funil: '',
    etapa_funil: 'distribuicao_conteudo',
    valor_investimento: '',
    periodo_mes: new Date().getMonth() + 1,
    periodo_ano: new Date().getFullYear(),
    status_orcamento: 'ativo',
    observacoes: '',
    categoria_explicacao: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open && orcamento) {
      setFormData({
        nome_funil: orcamento.nome_funil || '',
        etapa_funil: orcamento.etapa_funil || 'distribuicao_conteudo',
        valor_investimento: orcamento.valor_investimento?.toString() || '',
        periodo_mes: orcamento.periodo_mes || new Date().getMonth() + 1,
        periodo_ano: orcamento.periodo_ano || new Date().getFullYear(),
        status_orcamento: orcamento.status_orcamento || 'ativo',
        observacoes: orcamento.observacoes || '',
        categoria_explicacao: orcamento.categoria_explicacao || ''
      });
    }
  }, [open, orcamento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orcamento || !formData.nome_funil || !formData.valor_investimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('orcamentos_funil')
        .update({
          nome_funil: formData.nome_funil,
          etapa_funil: formData.etapa_funil,
          valor_investimento: parseFloat(formData.valor_investimento),
          periodo_mes: formData.periodo_mes,
          periodo_ano: formData.periodo_ano,
          status_orcamento: formData.status_orcamento,
          observacoes: formData.observacoes || null,
          categoria_explicacao: formData.categoria_explicacao || null,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', orcamento.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento atualizado com sucesso"
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar orçamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!orcamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="nome_funil">Nome do Funil *</Label>
              <Input
                id="nome_funil"
                value={formData.nome_funil}
                onChange={(e) => setFormData({...formData, nome_funil: e.target.value})}
                placeholder="Ex: Facebook Ads"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="etapa_funil">Categoria *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{getCategoriaDescricao(formData.etapa_funil)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={formData.etapa_funil}
                onValueChange={(value) => setFormData({...formData, etapa_funil: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_FUNIL.map((categoria) => (
                    <SelectItem key={categoria.value} value={categoria.value}>
                      {categoria.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="valor_investimento">Valor Previsto (R$) *</Label>
            <Input
              id="valor_investimento"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor_investimento}
              onChange={(e) => setFormData({...formData, valor_investimento: e.target.value})}
              placeholder="0.00"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="periodo_mes">Mês *</Label>
              <Select
                value={formData.periodo_mes.toString()}
                onValueChange={(value) => setFormData({...formData, periodo_mes: Number(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="periodo_ano">Ano *</Label>
              <Select
                value={formData.periodo_ano.toString()}
                onValueChange={(value) => setFormData({...formData, periodo_ano: Number(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status_orcamento">Status *</Label>
              <Select
                value={formData.status_orcamento}
                onValueChange={(value) => setFormData({...formData, status_orcamento: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORCAMENTO.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Observações sobre o orçamento (opcional)"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="categoria_explicacao">Explicação da Categoria</Label>
            <Textarea
              id="categoria_explicacao"
              value={formData.categoria_explicacao}
              onChange={(e) => setFormData({...formData, categoria_explicacao: e.target.value})}
              placeholder={getCategoriaDescricao(formData.etapa_funil) || 'Adicione uma explicação personalizada para esta categoria...'}
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Personalize a explicação ou deixe em branco para usar a descrição padrão
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
