import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChecklistItem } from "./ChecklistCriativosView";

interface EditarItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ChecklistItem;
  onSuccess: () => void;
}

export const EditarItemModal = ({ open, onOpenChange, item, onSuccess }: EditarItemModalProps) => {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("");
  const [formato, setFormato] = useState("");
  const [especificacoes, setEspecificacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && item) {
      setTitulo(item.titulo);
      setTipo(item.tipo);
      setFormato(item.formato || "");
      setEspecificacoes(item.especificacoes || "");
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !tipo) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o título e o tipo do item",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('checklist_criativos_itens')
        .update({
          titulo: titulo.trim(),
          tipo,
          formato: formato.trim() || null,
          especificacoes: especificacoes.trim() || null,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso"
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar item",
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
          <DialogTitle>Editar Item do Checklist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título do Item *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: 2 Criativos Segmentados por Região"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="imagem">Imagem</SelectItem>
                <SelectItem value="texto">Texto</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formato">Formato</Label>
            <Input
              id="formato"
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
              placeholder="Ex: 1x1 e 9x16 (Feed e Stories)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="especificacoes">Especificações</Label>
            <Textarea
              id="especificacoes"
              value={especificacoes}
              onChange={(e) => setEspecificacoes(e.target.value)}
              placeholder="Ex: Atenção Arquitetos de SP e RJ"
              rows={3}
            />
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
