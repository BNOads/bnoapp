import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StickyNote, Minus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDraftNotesStore, DraftNote } from "@/store/useDraftNotesStore";

interface QuickNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteSaved?: () => void;
  draftData?: DraftNote;
}

export function QuickNoteModal({ open, onOpenChange, onNoteSaved, draftData }: QuickNoteModalProps) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { addDraft, updateDraft, removeDraft } = useDraftNotesStore();

  // Populate fields when opening a draft or reset for new note
  useEffect(() => {
    if (open) {
      setTitulo(draftData?.titulo || "");
      setConteudo(draftData?.conteudo || "");
    }
  }, [open, draftData]);

  const handleSave = async () => {
    if (!conteudo.trim()) {
      toast({
        title: "Erro",
        description: "O conteúdo da nota é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from("notas")
        .insert({
          titulo: titulo.trim() || "Nota Rápida",
          conteudo: conteudo.trim(),
          user_id: user?.id,
        });

      if (error) throw error;

      // Remove draft if it came from one
      if (draftData?.id) removeDraft(draftData.id);

      toast({
        title: "✅ Sucesso!",
        description: "Nota salva no Bloco de Notas",
      });

      setTitulo("");
      setConteudo("");
      onOpenChange(false);
      onNoteSaved?.();
    } catch (error) {
      console.error("Erro ao salvar nota:", error);
      toast({
        title: "Erro",
        description: "Falha ao salvar a nota. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMinimize = () => {
    if (!conteudo.trim() && !titulo.trim()) {
      onOpenChange(false);
      return;
    }

    const payload = { titulo: titulo.trim(), conteudo: conteudo.trim() };
    if (draftData?.id) {
      updateDraft(draftData.id, payload);
    } else {
      addDraft(payload);
    }

    onOpenChange(false);
  };

  const handleDiscard = () => {
    if (draftData?.id) removeDraft(draftData.id);
    setTitulo("");
    setConteudo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleMinimize(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button]:hidden">
        {/* Custom header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <StickyNote className="h-4 w-4 text-primary" />
            {draftData ? "Rascunho de Nota" : "Nova Nota Rápida"}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              title="Minimizar para rascunho"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={handleDiscard}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              title="Descartar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <Input
            placeholder="Título (opcional)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full"
          />

          <Textarea
            placeholder="Escreva sua nota aqui... *"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            className="w-full min-h-[120px] resize-none"
            autoFocus
          />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleMinimize} disabled={saving}>
              Minimizar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !conteudo.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? "Salvando..." : "Salvar Nota"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}