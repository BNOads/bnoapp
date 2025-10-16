import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checklist } from "./ChecklistCriativosView";

interface EditarChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklist: Checklist;
  onSuccess: () => void;
}

export const EditarChecklistModal = ({ open, onOpenChange, checklist, onSuccess }: EditarChecklistModalProps) => {
  const [funil, setFunil] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setFunil(checklist.funil);
      setResponsavelId(checklist.responsavel_id || "");
      loadColaboradores();
    }
  }, [open, checklist]);

  const loadColaboradores = async () => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, user_id')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funil.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o nome do funil",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('checklist_criativos')
        .update({
          funil: funil.trim(),
          responsavel_id: responsavelId || null,
        })
        .eq('id', checklist.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Checklist atualizado com sucesso"
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar checklist:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar checklist",
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
          <DialogTitle>Editar Checklist de Criativos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="funil">Nome do Funil *</Label>
            <Input
              id="funil"
              value={funil}
              onChange={(e) => setFunil(e.target.value)}
              placeholder="Ex: CPL Outubro, Lançamento Black Week"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável (opcional)</Label>
            <Select value={responsavelId || undefined} onValueChange={(value) => setResponsavelId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum responsável selecionado" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((colaborador) => (
                  <SelectItem key={colaborador.user_id} value={colaborador.user_id}>
                    {colaborador.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
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
