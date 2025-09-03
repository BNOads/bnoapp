import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/Auth/AuthContext";
import { Loader2 } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  funis_trabalhando: string[];
}

interface NovoOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const NovoOrcamentoModal = ({ open, onOpenChange, onSuccess }: NovoOrcamentoModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [formData, setFormData] = useState({
    nome_funil: "",
    valor_investimento: "",
    observacoes: "",
    data_inicio: "",
    data_fim: ""
  });

  const funisPadrao = [
    "Awareness", "Interesse", "Consideração", "Conversão", "Retenção",
    "Tráfego Pago", "Orgânico", "Email Marketing", "Social Media"
  ];

  useEffect(() => {
    if (open) {
      loadClientes();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedCliente("");
    setFormData({
      nome_funil: "",
      valor_investimento: "",
      observacoes: "",
      data_inicio: "",
      data_fim: ""
    });
  };

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, funis_trabalhando')
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar clientes:', error);
        return;
      }

      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedCliente || !formData.nome_funil || !formData.valor_investimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('orcamentos_funil')
        .insert({
          cliente_id: selectedCliente,
          nome_funil: formData.nome_funil,
          valor_investimento: parseFloat(formData.valor_investimento),
          observacoes: formData.observacoes || null,
          created_by: user.id
        });

      if (error) {
        console.error('Erro ao criar orçamento:', error);
        toast({
          title: "Erro",
          description: "Erro ao criar orçamento. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso!",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar orçamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clienteSelecionado = clientes.find(c => c.id === selectedCliente);
  const funisDiponiveis = clienteSelecionado?.funis_trabalhando?.length 
    ? clienteSelecionado.funis_trabalhando 
    : funisPadrao;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Orçamento por Funil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
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

            {/* Funil */}
            <div className="space-y-2">
              <Label htmlFor="funil">Funil *</Label>
              <Select 
                value={formData.nome_funil} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, nome_funil: value }))}
                disabled={!selectedCliente}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funil" />
                </SelectTrigger>
                <SelectContent>
                  {funisDiponiveis.map((funil) => (
                    <SelectItem key={funil} value={funil}>
                      {funil}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor do Orçamento */}
            <div className="space-y-2">
              <Label htmlFor="valor">Valor do Orçamento (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valor_investimento}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_investimento: e.target.value }))}
                required
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações sobre o orçamento..."
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
              Criar Orçamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};