import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditarClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: any | null;
  onSuccess?: () => void;
}

export const EditarClienteModal = ({ open, onOpenChange, cliente, onSuccess }: EditarClienteModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'negocio_local' as 'negocio_local' | 'infoproduto',
    nicho: '',
    etapa_atual: '',
    pasta_drive_url: '',
    link_painel: '',
    observacoes: '',
    progresso_etapa: 0,
    status_cliente: 'ativo'
  });

  useEffect(() => {
    if (cliente && open) {
      setFormData({
        nome: cliente.nome || '',
        categoria: cliente.categoria || 'negocio_local',
        nicho: cliente.nicho || '',
        etapa_atual: cliente.etapa_atual || '',
        pasta_drive_url: cliente.pasta_drive_url || '',
        link_painel: cliente.link_painel || '',
        observacoes: cliente.observacoes || '',
        progresso_etapa: cliente.progresso_etapa || 0,
        status_cliente: cliente.status_cliente || 'ativo'
      });
    }
  }, [cliente, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clientes')
        .update(formData)
        .eq('id', cliente.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As informações do cliente foram atualizadas.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Cliente *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Digite o nome do cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select 
                value={formData.categoria} 
                onValueChange={(value) => handleInputChange('categoria', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="negocio_local">Negócio Local</SelectItem>
                  <SelectItem value="infoproduto">Infoproduto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nicho">Nicho</Label>
              <Input
                id="nicho"
                value={formData.nicho}
                onChange={(e) => handleInputChange('nicho', e.target.value)}
                placeholder="Ex: E-commerce, Saúde, Educação"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="etapa_atual">Etapa Atual</Label>
              <Select 
                value={formData.etapa_atual} 
                onValueChange={(value) => handleInputChange('etapa_atual', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecção">Prospecção</SelectItem>
                  <SelectItem value="apresentacao">Apresentação</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                  <SelectItem value="implantacao">Implantação</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausa">Em Pausa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="progresso_etapa">Progresso (%)</Label>
              <Input
                id="progresso_etapa"
                type="number"
                min="0"
                max="100"
                value={formData.progresso_etapa}
                onChange={(e) => handleInputChange('progresso_etapa', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_cliente">Status do Cliente</Label>
              <Select 
                value={formData.status_cliente} 
                onValueChange={(value) => handleInputChange('status_cliente', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pasta_drive_url">Link da Pasta do Google Drive</Label>
            <Input
              id="pasta_drive_url"
              value={formData.pasta_drive_url}
              onChange={(e) => handleInputChange('pasta_drive_url', e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_painel">Link do Painel</Label>
            <Input
              id="link_painel"
              value={formData.link_painel}
              onChange={(e) => handleInputChange('link_painel', e.target.value)}
              placeholder="URL do painel personalizado"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações gerais sobre o cliente"
              rows={3}
            />
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
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};