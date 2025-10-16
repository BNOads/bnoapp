import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NovoChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onSuccess: () => void;
}

export const NovoChecklistModal = ({ open, onOpenChange, clienteId, onSuccess }: NovoChecklistModalProps) => {
  const [funil, setFunil] = useState("");
  const [funis, setFunis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadFunis();
      setFunil("");
    }
  }, [open, clienteId]);


  const loadFunis = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos_funil')
        .select('nome_funil')
        .eq('cliente_id', clienteId)
        .eq('active', true)
        .order('nome_funil');

      if (error) throw error;
      
      // Extrair nomes únicos dos funis
      const nomesUnicos = Array.from(new Set((data || []).map(item => item.nome_funil)));
      setFunis(nomesUnicos);
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funil) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um funil",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // Buscar o id do colaborador baseado no user_id
      const { data: colaborador, error: colaboradorError } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('user_id', user.data.user.id)
        .single();

      if (colaboradorError) throw colaboradorError;

      const { error } = await supabase
        .from('checklist_criativos')
        .insert({
          cliente_id: clienteId,
          funil: funil,
          responsavel_id: colaborador.id,
          created_by: user.data.user.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Checklist criado com sucesso"
      });
      
      setFunil("");
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar checklist:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar checklist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Checklist de Criativos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="funil">Funil *</Label>
            <Select value={funil} onValueChange={setFunil} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funil" />
              </SelectTrigger>
              <SelectContent>
                {funis.map((nome) => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Criando..." : "Criar Checklist"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
