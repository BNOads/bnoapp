import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EdicaoMassaLancamentosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onEdicaoCompleta: () => void;
}

const EdicaoMassaLancamentosModal: React.FC<EdicaoMassaLancamentosModalProps> = ({
  open,
  onOpenChange,
  selectedIds,
  onEdicaoCompleta
}) => {
  const [formData, setFormData] = useState({
    cliente_id: 'none',
    status_lancamento: 'none',
    tipo_lancamento: 'none'
  });
  
  const [clientes, setClientes] = useState<Array<{id: string, nome: string}>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchClientes();
    }
  }, [open]);

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

  const resetForm = () => {
    setFormData({
      cliente_id: 'none',
      status_lancamento: 'none',
      tipo_lancamento: 'none'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar dados de atualização
      const updateData: any = {};
      
      if (formData.cliente_id && formData.cliente_id !== 'none') {
        updateData.cliente_id = formData.cliente_id;
      }
      if (formData.status_lancamento && formData.status_lancamento !== 'none') {
        updateData.status_lancamento = formData.status_lancamento;
      }
      if (formData.tipo_lancamento && formData.tipo_lancamento !== 'none') {
        updateData.tipo_lancamento = formData.tipo_lancamento;
      }

      // Só prosseguir se tiver algo para atualizar
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "Nenhum campo selecionado",
          description: "Selecione pelo menos um campo para atualizar.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar os lançamentos selecionados
      const { error } = await supabase
        .from('lancamentos')
        .update(updateData)
        .in('id', selectedIds);

      if (error) throw error;

      onEdicaoCompleta();
      resetForm();
      onOpenChange(false);
      
      toast({
        title: "Edição em massa concluída",
        description: `${selectedIds.length} lançamentos foram atualizados com sucesso.`,
      });

    } catch (error: any) {
      console.error('Erro na edição em massa:', error);
      toast({
        title: "Erro na edição em massa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edição em Massa</DialogTitle>
          <DialogDescription>
            Atualizar {selectedIds.length} lançamentos selecionados
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente</Label>
            <Select
              value={formData.cliente_id}
              onValueChange={(value) => handleInputChange('cliente_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alterar cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não alterar</SelectItem>
                {clientes
                  .filter(cliente => cliente.id && cliente.id.trim() !== '')
                  .map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status_lancamento">Status</Label>
            <Select
              value={formData.status_lancamento}
              onValueChange={(value) => handleInputChange('status_lancamento', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alterar status (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não alterar</SelectItem>
                <SelectItem value="em_captacao">Em Captação</SelectItem>
                <SelectItem value="cpl">CPL</SelectItem>
                <SelectItem value="remarketing">Remarketing</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_lancamento">Tipo</Label>
            <Select
              value={formData.tipo_lancamento}
              onValueChange={(value) => handleInputChange('tipo_lancamento', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alterar tipo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não alterar</SelectItem>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar Lançamentos'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EdicaoMassaLancamentosModal;