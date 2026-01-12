import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CriativoSelector } from './CriativoSelector';

interface EditarLancamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento: any;
  onLancamentoAtualizado: () => void;
}

const EditarLancamentoModal: React.FC<EditarLancamentoModalProps> = ({
  open,
  onOpenChange,
  lancamento,
  onLancamentoAtualizado
}) => {
  const [formData, setFormData] = useState({
    nome_lancamento: '',
    descricao: '',
    cliente_id: '',
    status_lancamento: '',
    tipo_lancamento: '',
    data_inicio_captacao: '',
    data_fim_captacao: '',
    data_inicio_remarketing: '',
    data_fim_remarketing: '',
    investimento_total: '',
    meta_investimento: '',
    resultado_obtido: '',
    roi_percentual: '',
    link_dashboard: '',
    link_briefing: '',
    observacoes: ''
  });

  const [clientes, setClientes] = useState<Array<{ id: string, nome: string }>>([]);
  const [selectedCriativos, setSelectedCriativos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && lancamento) {
      setFormData({
        nome_lancamento: lancamento.nome_lancamento || '',
        descricao: lancamento.descricao || '',
        cliente_id: lancamento.cliente_id || '',
        status_lancamento: lancamento.status_lancamento || '',
        tipo_lancamento: lancamento.tipo_lancamento || '',
        data_inicio_captacao: lancamento.data_inicio_captacao || '',
        data_fim_captacao: lancamento.data_fim_captacao || '',
        data_inicio_remarketing: lancamento.data_inicio_remarketing || '',
        data_fim_remarketing: lancamento.data_fim_remarketing || '',
        investimento_total: lancamento.investimento_total?.toString() || '',
        meta_investimento: lancamento.meta_investimento?.toString() || '',
        resultado_obtido: lancamento.resultado_obtido?.toString() || '',
        roi_percentual: lancamento.roi_percentual?.toString() || '',
        link_dashboard: lancamento.link_dashboard || '',
        link_briefing: lancamento.link_briefing || '',
        observacoes: lancamento.observacoes || ''
      });
      fetchClientes();
      fetchCriativosVinculados();
    }
  }, [open, lancamento]);

  const fetchCriativosVinculados = async () => {
    try {
      const { data, error } = await supabase
        .from('lancamento_criativos')
        .select('folder_name')
        .eq('lancamento_id', lancamento.id);

      if (error) throw error;

      const ids = data.map(item => item.folder_name).filter(Boolean) as string[];
      setSelectedCriativos(ids);
    } catch (error) {
      console.error('Erro ao buscar criativos vinculados:', error);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        nome_lancamento: formData.nome_lancamento,
        descricao: formData.descricao || null,
        cliente_id: formData.cliente_id || null,
        status_lancamento: formData.status_lancamento as any,
        tipo_lancamento: formData.tipo_lancamento as any,
        data_inicio_captacao: formData.data_inicio_captacao,
        data_fim_captacao: formData.data_fim_captacao || null,
        data_inicio_remarketing: formData.data_inicio_remarketing || null,
        data_fim_remarketing: formData.data_fim_remarketing || null,
        investimento_total: parseFloat(formData.investimento_total) || 0,
        meta_investimento: formData.meta_investimento ? parseFloat(formData.meta_investimento) : null,
        resultado_obtido: formData.resultado_obtido ? parseFloat(formData.resultado_obtido) : null,
        roi_percentual: formData.roi_percentual ? parseFloat(formData.roi_percentual) : null,
        link_dashboard: formData.link_dashboard || null,
        link_briefing: formData.link_briefing || null,
        observacoes: formData.observacoes || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('lancamentos')
        .update(updateData)
        .eq('id', lancamento.id);

      if (error) throw error;

      // Atualizar vínculos de criativos
      const { error: deleteError } = await supabase
        .from('lancamento_criativos')
        .delete()
        .eq('lancamento_id', lancamento.id);

      if (deleteError) throw deleteError;

      if (selectedCriativos.length > 0) {
        const criativosLinks = selectedCriativos.map(folderName => ({
          lancamento_id: lancamento.id,
          folder_name: folderName
        }));

        const { error: insertError } = await supabase
          .from('lancamento_criativos')
          .insert(criativosLinks);

        if (insertError) throw insertError;
      }

      onLancamentoAtualizado();
      onOpenChange(false);

      toast({
        title: "Lançamento atualizado",
        description: "O lançamento e seus criativos foram atualizados com sucesso.",
      });

    } catch (error: any) {
      console.error('Erro ao atualizar lançamento:', error);
      toast({
        title: "Erro ao atualizar lançamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lançamento</DialogTitle>
          <DialogDescription>
            Atualize as informações do lançamento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="nome_lancamento">Nome do Lançamento *</Label>
              <Input
                id="nome_lancamento"
                value={formData.nome_lancamento}
                onChange={(e) => handleInputChange('nome_lancamento', e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="cliente_id">Cliente</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => handleInputChange('cliente_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
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

            {formData.cliente_id && (
              <div className="space-y-2 md:col-span-2 border-t pt-4 mt-2">
                <Label>Criativos deste Lançamento</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Gerencie as pastas de criativos deste lançamento.
                </div>
                <CriativoSelector
                  clienteId={formData.cliente_id}
                  selectedIds={selectedCriativos}
                  onSelectionChange={setSelectedCriativos}
                  className="max-h-[300px]"
                />
              </div>
            )}

            <div>
              <Label htmlFor="status_lancamento">Status *</Label>
              <Select
                value={formData.status_lancamento}
                onValueChange={(value) => handleInputChange('status_lancamento', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_captacao">Em Captação</SelectItem>
                  <SelectItem value="cpl">CPL</SelectItem>
                  <SelectItem value="remarketing">Remarketing</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo_lancamento">Tipo *</Label>
              <Select
                value={formData.tipo_lancamento}
                onValueChange={(value) => handleInputChange('tipo_lancamento', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semente">Semente</SelectItem>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                  <SelectItem value="perpetuo">Perpétuo</SelectItem>
                  <SelectItem value="flash">Flash</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="tradicional">Lançamento Tradicional</SelectItem>
                  <SelectItem value="captacao_simples">Captação simples</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="data_inicio_captacao">Data Início Captação *</Label>
              <Input
                id="data_inicio_captacao"
                type="date"
                value={formData.data_inicio_captacao}
                onChange={(e) => handleInputChange('data_inicio_captacao', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="data_fim_captacao">Data Fim Captação</Label>
              <Input
                id="data_fim_captacao"
                type="date"
                value={formData.data_fim_captacao}
                onChange={(e) => handleInputChange('data_fim_captacao', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="data_inicio_remarketing">Data Início Remarketing</Label>
              <Input
                id="data_inicio_remarketing"
                type="date"
                value={formData.data_inicio_remarketing}
                onChange={(e) => handleInputChange('data_inicio_remarketing', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="data_fim_remarketing">Data Fim Remarketing</Label>
              <Input
                id="data_fim_remarketing"
                type="date"
                value={formData.data_fim_remarketing}
                onChange={(e) => handleInputChange('data_fim_remarketing', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="investimento_total">Investimento Total *</Label>
              <Input
                id="investimento_total"
                type="number"
                step="0.01"
                min="0"
                value={formData.investimento_total}
                onChange={(e) => handleInputChange('investimento_total', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="meta_investimento">Meta de Investimento</Label>
              <Input
                id="meta_investimento"
                type="number"
                step="0.01"
                min="0"
                value={formData.meta_investimento}
                onChange={(e) => handleInputChange('meta_investimento', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="resultado_obtido">Resultado Obtido</Label>
              <Input
                id="resultado_obtido"
                type="number"
                step="0.01"
                value={formData.resultado_obtido}
                onChange={(e) => handleInputChange('resultado_obtido', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="roi_percentual">ROI (%)</Label>
              <Input
                id="roi_percentual"
                type="number"
                step="0.01"
                value={formData.roi_percentual}
                onChange={(e) => handleInputChange('roi_percentual', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="link_dashboard">Link Dashboard</Label>
              <Input
                id="link_dashboard"
                type="url"
                value={formData.link_dashboard}
                onChange={(e) => handleInputChange('link_dashboard', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="link_briefing">Link Briefing</Label>
              <Input
                id="link_briefing"
                type="url"
                value={formData.link_briefing}
                onChange={(e) => handleInputChange('link_briefing', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar Lançamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditarLancamentoModal;