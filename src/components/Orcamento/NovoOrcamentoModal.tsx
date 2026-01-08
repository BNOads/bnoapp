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
    etapa_funil: 'distribuicao_conteudo',
    valor_investimento: '',
    valor_gasto: '0',
    periodo_mes: new Date().getMonth() + 1,
    periodo_ano: new Date().getFullYear(),
    status_orcamento: 'ativo',
    observacoes: '',
    categoria_explicacao: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadClientes();
      // Reset form data when opening
      setFormData({
        cliente_id: '',
        nome_funil: '',
        etapa_funil: 'distribuicao_conteudo',
        valor_investimento: '',
        valor_gasto: '0',
        periodo_mes: new Date().getMonth() + 1,
        periodo_ano: new Date().getFullYear(),
        status_orcamento: 'ativo',
        observacoes: '',
        categoria_explicacao: ''
      });
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
          etapa_funil: formData.etapa_funil,
          valor_investimento: parseFloat(formData.valor_investimento),
          valor_gasto: parseFloat(formData.valor_gasto),
          periodo_mes: formData.periodo_mes,
          periodo_ano: formData.periodo_ano,
          status_orcamento: formData.status_orcamento,
          observacoes: formData.observacoes || null,
          categoria_explicacao: formData.categoria_explicacao || null,
          created_by: user.user.id
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso"
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
  const funisDisponiveis = (clienteSelecionado?.funis_trabalhando || [
    'Captação Facebook/Instagram',
    'Captação Google Ads', 
    'Remarketing',
    'E-mail Marketing',
    'Vendas Diretas',
    'Upsell/Cross-sell'
  ]).filter(funil => funil && funil.trim() !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Orçamento por Funil</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                onValueChange={(value) => setFormData({...formData, etapa_funil: value, categoria_explicacao: ''})}
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
            <Label htmlFor="nome_funil">Nome do Funil *</Label>
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

          <div className="grid gap-4 md:grid-cols-2">
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

            <div>
              <Label htmlFor="valor_gasto">Valor Gasto (R$)</Label>
              <Input
                id="valor_gasto"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_gasto}
                onChange={(e) => setFormData({...formData, valor_gasto: e.target.value})}
                placeholder="0.00"
              />
            </div>
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
                  {[2024, 2025, 2026].map((ano) => (
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
              rows={3}
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
              {loading ? 'Criando...' : 'Criar Orçamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};