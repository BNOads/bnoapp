import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { QuickNoteModal } from "@/components/ui/QuickNoteModal";

interface FloatingNoteButtonProps {
  onNoteSaved?: () => void;
}

export function FloatingNoteButton({ onNoteSaved }: FloatingNoteButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 p-0"
        title="Nova Nota Rápida"
      >
        <Pencil className="h-6 w-6 text-primary-foreground" />
      </Button>

      <QuickNoteModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        onNoteSaved={onNoteSaved}
      />
    </>
  );
}