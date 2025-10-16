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
  const [funis, setFunis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setFunil(checklist.funil);
      setResponsavelId(checklist.responsavel_id || "");
      loadColaboradores();
      loadFunis();
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

  const loadFunis = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos_funil')
        .select('nome_funil')
        .eq('cliente_id', checklist.cliente_id)
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
      const { error } = await supabase
        .from('checklist_criativos')
        .update({
          funil: funil,
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
