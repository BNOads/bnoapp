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
  onEdicaoConcluida: () => void;
}

const EdicaoMassaLancamentosModal: React.FC<EdicaoMassaLancamentosModalProps> = ({
  open,
  onOpenChange,
  selectedIds,
  onEdicaoConcluida
}) => {
  const [formData, setFormData] = useState({
    gestor_responsavel: '',
    cliente_id: '',
    status_lancamento: '',
    tipo_lancamento: ''
  });
  const [colaboradores, setColaboradores] = useState<Array<{id: string, nome: string}>>([]);
  const [clientes, setClientes] = useState<Array<{id: string, nome: string}>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchColaboradores();
      fetchClientes();
    }
  }, [open]);

  const fetchColaboradores = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
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

  const resetForm = () => {
    setFormData({
      gestor_responsavel: '',
      cliente_id: '',
      status_lancamento: '',
      tipo_lancamento: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filtrar apenas os campos que foram preenchidos
      const updateData: any = {};
      
      if (formData.gestor_responsavel) {
        updateData.gestor_responsavel = formData.gestor_responsavel;
      }
      if (formData.cliente_id) {
        updateData.cliente_id = formData.cliente_id;
      }
      if (formData.status_lancamento) {
        updateData.status_lancamento = formData.status_lancamento;
      }
      if (formData.tipo_lancamento) {
        updateData.tipo_lancamento = formData.tipo_lancamento;
      }

      // Se nenhum campo foi preenchido, não fazer nada
      if (Object.keys(updateData).length === 0) {
        toast({
          title: "Nenhum campo selecionado",
          description: "Selecione pelo menos um campo para atualizar.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar todos os lançamentos selecionados
      const { error } = await supabase
        .from('lancamentos')
        .update(updateData)
        .in('id', selectedIds);

      if (error) throw error;

      onEdicaoConcluida();
      resetForm();
      onOpenChange(false);
      
      toast({
        title: "Edição em massa concluída",
        description: `${selectedIds.length} lançamento(s) foram atualizados com sucesso.`,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edição em Massa</DialogTitle>
          <DialogDescription>
            Editar {selectedIds.length} lançamento(s) selecionado(s). 
            Deixe em branco os campos que não deseja alterar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gestor_responsavel">Gestor Responsável</Label>
            <Select
              value={formData.gestor_responsavel}
              onValueChange={(value) => handleInputChange('gestor_responsavel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Manter atual / Selecionar novo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Manter atual</SelectItem>
                {colaboradores.map((colaborador) => (
                  <SelectItem key={colaborador.id} value={colaborador.id}>
                    {colaborador.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente</Label>
            <Select
              value={formData.cliente_id}
              onValueChange={(value) => handleInputChange('cliente_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Manter atual / Selecionar novo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Manter atual</SelectItem>
                {clientes.map((cliente) => (
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
                <SelectValue placeholder="Manter atual / Selecionar novo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Manter atual</SelectItem>
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
            <Label htmlFor="tipo_lancamento">Tipo de Lançamento</Label>
            <Select
              value={formData.tipo_lancamento}
              onValueChange={(value) => handleInputChange('tipo_lancamento', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Manter atual / Selecionar novo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Manter atual</SelectItem>
                <SelectItem value="semente">Semente</SelectItem>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
                <SelectItem value="perpetuo">Perpétuo</SelectItem>
                <SelectItem value="flash">Flash</SelectItem>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || selectedIds.length === 0}>
              {loading ? 'Atualizando...' : 'Atualizar Selecionados'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EdicaoMassaLancamentosModal;