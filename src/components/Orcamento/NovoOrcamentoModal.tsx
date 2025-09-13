import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Cliente {
  id: string;
  nome: string;
  funis_trabalhando?: string[];
}

interface NovoOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const NovoOrcamentoModal = ({ open, onOpenChange, onSuccess }: NovoOrcamentoModalProps) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    nome_funil: '',
    valor_investimento: '',
    observacoes: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadClientes();
    }
  }, [open]);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, funis_trabalhando')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id || !formData.nome_funil || !formData.valor_investimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('orcamentos_funil')
        .insert([{
          cliente_id: formData.cliente_id,
          nome_funil: formData.nome_funil,
          valor_investimento: parseFloat(formData.valor_investimento),
          observacoes: formData.observacoes || null,
          created_by: user.user.id
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso"
      });

      setFormData({
        cliente_id: '',
        nome_funil: '',
        valor_investimento: '',
        observacoes: ''
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar orçamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const clienteSelecionado = clientes.find(c => c.id === formData.cliente_id);
  const funisDisponiveis = clienteSelecionado?.funis_trabalhando || [
    'Captação Facebook/Instagram',
    'Captação Google Ads',
    'Remarketing',
    'E-mail Marketing',
    'Vendas Diretas',
    'Upsell/Cross-sell'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Orçamento por Funil</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cliente">Cliente *</Label>
            <Select 
              value={formData.cliente_id} 
              onValueChange={(value) => setFormData({...formData, cliente_id: value, nome_funil: ''})}
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

          <div>
            <Label htmlFor="nome_funil">Funil *</Label>
            <Select 
              value={formData.nome_funil} 
              onValueChange={(value) => setFormData({...formData, nome_funil: value})}
              disabled={!formData.cliente_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione ou digite o funil" />
              </SelectTrigger>
              <SelectContent>
                {funisDisponiveis.map((funil) => (
                  <SelectItem key={funil} value={funil}>
                    {funil}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-2"
              placeholder="Ou digite um nome personalizado"
              value={formData.nome_funil}
              onChange={(e) => setFormData({...formData, nome_funil: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="valor_investimento">Valor do Investimento (R$) *</Label>
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

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Observações sobre o orçamento (opcional)"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Orçamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};