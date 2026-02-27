import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { QuickNoteModal } from "@/components/ui/QuickNoteModal";
import { useDraftNotesStore, DraftNote } from "@/store/useDraftNotesStore";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FloatingNoteButtonProps {
  onNoteSaved?: () => void;
}

export function FloatingNoteButton({ onNoteSaved }: FloatingNoteButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftNote | undefined>();
  const { drafts, removeDraft } = useDraftNotesStore();

  const handleOpenNew = () => {
    setSelectedDraft(undefined);
    setModalOpen(true);
  };

  const handleOpenDraft = (draft: DraftNote) => {
    setSelectedDraft(draft);
    setModalOpen(true);
  };

  return (
    <div className="fixed bottom-[90px] md:bottom-4 right-6 z-50 flex flex-col items-end gap-2 group">
      {/* Draft list — shown on hover when drafts exist */}
      {drafts.length > 0 && (
        <div className="mb-2 hidden w-72 flex-col gap-2 opacity-0 transition-all duration-300 group-hover:flex group-hover:opacity-100 bg-background/95 backdrop-blur-sm border shadow-xl rounded-xl p-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-sm font-semibold text-foreground">Rascunhos de Nota</span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {drafts.length} {drafts.length === 1 ? "pendente" : "pendentes"}
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="group/item flex flex-col gap-1 p-2 rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer relative"
                onClick={() => handleOpenDraft(draft)}
              >
                <span className="font-medium text-sm truncate pr-6">
                  {draft.titulo || "Sem título"}
                </span>
                {draft.conteudo && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {draft.conteudo}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/60">
                  {formatDistanceToNow(new Date(draft.updated_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>

                {/* Discard button */}
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 p-1 bg-background rounded text-destructive hover:bg-destructive hover:text-white transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDraft(draft.id);
                  }}
                  title="Descartar rascunho"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main button */}
      <Button
        onClick={handleOpenNew}
        className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 p-0"
        title="Nova Nota Rápida"
      >
        {/* Badge de rascunhos */}
        {drafts.length > 0 && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
            {drafts.length}
          </div>
        )}
        <Pencil className="h-6 w-6 text-primary-foreground" />
      </Button>

      <QuickNoteModal
        open={modalOpen}
        onOpenChange={(isOpen) => {
          setModalOpen(isOpen);
          if (!isOpen) setSelectedDraft(undefined);
        }}
        onNoteSaved={onNoteSaved}
        draftData={selectedDraft}
      />
    </div>
  );
}