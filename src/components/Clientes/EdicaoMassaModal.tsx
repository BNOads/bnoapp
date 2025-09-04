import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EdicaoMassaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientesSelecionados: any[];
}

export const EdicaoMassaModal = ({ isOpen, onClose, onSuccess, clientesSelecionados }: EdicaoMassaModalProps) => {
  const [categoria, setCategoria] = useState<string>('');
  const [nicho, setNicho] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {};
      
      if (categoria && categoria !== 'no_change') {
        updates.categoria = categoria;
      }
      
      if (nicho && nicho !== 'no_change') {
        updates.nicho = nicho;
      }
      
      if (status && status !== 'no_change') {
        updates.status_cliente = status;
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "Nenhuma alteração",
          description: "Selecione pelo menos um campo para atualizar.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar todos os clientes selecionados
      const clienteIds = clientesSelecionados.map(c => c.id);
      
      const { error } = await supabase
        .from('clientes')
        .update(updates)
        .in('id', clienteIds);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${clientesSelecionados.length} cliente(s) atualizados com sucesso.`,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategoria('');
    setNicho('');
    setStatus('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edição em Massa</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Editando {clientesSelecionados.length} cliente(s) selecionado(s)
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">Não alterar</SelectItem>
                <SelectItem value="negocio_local">Negócio Local</SelectItem>
                <SelectItem value="infoproduto">Infoproduto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nicho">Nicho</Label>
            <Select value={nicho} onValueChange={setNicho}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um nicho (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">Não alterar</SelectItem>
                <SelectItem value="Serie A">Série A</SelectItem>
                <SelectItem value="Serie B">Série B</SelectItem>
                <SelectItem value="Serie C">Série C</SelectItem>
                <SelectItem value="Serie D">Série D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">Não alterar</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="implantacao">Implantação</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
                <SelectItem value="pausa">Em Pausa</SelectItem>
                <SelectItem value="prospeccao">Prospecção</SelectItem>
                <SelectItem value="apresentacao">Apresentação</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar Clientes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};