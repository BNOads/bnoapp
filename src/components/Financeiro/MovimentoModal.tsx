import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MovimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimento?: any;
  mesReferencia: number;
  anoReferencia: number;
  onSuccess: () => void;
}

export const MovimentoModal = ({
  isOpen,
  onClose,
  movimento,
  mesReferencia,
  anoReferencia,
  onSuccess
}: MovimentoModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_prevista: '',
    movimento: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    classificacao: '',
    descricao: '',
    valor: '',
    status: 'previsto' as 'previsto' | 'realizado' | 'pago' | 'atrasado',
    observacoes: ''
  });

  useEffect(() => {
    if (movimento) {
      setFormData({
        data_prevista: movimento.data_prevista,
        movimento: movimento.movimento,
        tipo: movimento.tipo,
        classificacao: movimento.classificacao,
        descricao: movimento.descricao || '',
        valor: movimento.valor.toString(),
        status: movimento.status,
        observacoes: movimento.observacoes || ''
      });
    } else {
      setFormData({
        data_prevista: '',
        movimento: '',
        tipo: 'entrada',
        classificacao: '',
        descricao: '',
        valor: '',
        status: 'previsto',
        observacoes: ''
      });
    }
  }, [movimento, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const dados = {
        ...formData,
        valor: parseFloat(formData.valor),
        mes_referencia: mesReferencia,
        ano_referencia: anoReferencia,
        created_by: user?.id
      };

      if (movimento) {
        const { error } = await supabase
          .from('financeiro_movimentos')
          .update(dados)
          .eq('id', movimento.id);

        if (error) throw error;

        toast({
          title: "Movimento atualizado",
          description: "O movimento foi atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('financeiro_movimentos')
          .insert(dados);

        if (error) throw error;

        toast({
          title: "Movimento criado",
          description: "O movimento foi criado com sucesso."
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar movimento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o movimento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{movimento ? 'Editar Movimento' : 'Novo Movimento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_prevista">Data Prevista *</Label>
              <Input
                id="data_prevista"
                type="date"
                value={formData.data_prevista}
                onChange={(e) => setFormData({ ...formData, data_prevista: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="movimento">Movimento *</Label>
              <Input
                id="movimento"
                value={formData.movimento}
                onChange={(e) => setFormData({ ...formData, movimento: e.target.value })}
                placeholder="Nome do movimento"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v: any) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classificacao">Classificação *</Label>
              <Input
                id="classificacao"
                value={formData.classificacao}
                onChange={(e) => setFormData({ ...formData, classificacao: e.target.value })}
                placeholder="Ex: Receita, Despesa, Parceiro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previsto">Previsto</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição do movimento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : movimento ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
