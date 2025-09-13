import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuickNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteSaved?: () => void;
}

export function QuickNoteModal({ open, onOpenChange, onNoteSaved }: QuickNoteModalProps) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!conteudo.trim()) {
      toast({
        title: "Erro",
        description: "O conteúdo da nota é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notas')
        .insert({
          titulo: titulo.trim() || 'Nota Rápida',
          conteudo: conteudo.trim(),
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "✅ Sucesso!",
        description: "Nota salva com sucesso no Bloco de Notas",
      });

      // Reset form
      setTitulo("");
      setConteudo("");
      onOpenChange(false);
      
      // Notify parent to refresh
      onNoteSaved?.();

    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar a nota. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTitulo("");
    setConteudo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            Nova Nota Rápida
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Título (opcional)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div>
            <Textarea
              placeholder="Escreva sua nota aqui... *"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="w-full min-h-[120px] resize-none"
              autoFocus
            />
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !conteudo.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}